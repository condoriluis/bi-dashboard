import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.infra.database import db
from app.models.transformation import TransformationCreate, TransformationUpdate, TransformationResponse


class TransformationService:
    """Servicio para gestionar transformaciones de datos con vistas DuckDB"""
    
    # Comandos SQL permitidos en transformaciones
    ALLOWED_KEYWORDS = {'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 
                        'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'AS',
                        'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
                        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'UNION', 'DISTINCT',
                        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CAST',
                        'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'CONCAT', 'STRPTIME'}
    
    FORBIDDEN_KEYWORDS = {'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE TABLE',
                          'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'}
    
    def validate_sql(self, sql: str, source_table: str) -> tuple[bool, Optional[str]]:
        """
        Valida que el SQL sea seguro y válido
        Returns: (is_valid, error_message)
        """
        sql_upper = sql.upper()
        
        for forbidden in self.FORBIDDEN_KEYWORDS:
            if forbidden in sql_upper:
                return False, f"Comando prohibido detectado: {forbidden}"
        
        # Verificar que contenga SELECT
        if 'SELECT' not in sql_upper:
            return False, "La transformación debe contener una consulta SELECT"
        
        # Verificar que la tabla origen exista
        conn = db.get_connection()
        try:
            # Verificar si es tabla o vista
            check_query = """
                SELECT table_name FROM duckdb_tables() 
                WHERE table_name = ?
                UNION
                SELECT view_name as table_name FROM duckdb_views()
                WHERE view_name = ?
            """
            result = conn.execute(check_query, [source_table, source_table]).fetchone()
            if not result:
                return False, f"La tabla/vista origen '{source_table}' no existe"
        finally:
            conn.close()
        
        return True, None
    
    def create_transformation(self, transformation: TransformationCreate) -> TransformationResponse:
        """Crea una nueva transformación y su vista en DuckDB"""
        # Validar SQL
        is_valid, error_msg = self.validate_sql(transformation.sql_definition, transformation.source_table)
        if not is_valid:
            raise ValueError(error_msg)
        
        conn = db.get_connection()
        try:
            # Verificar que el nombre no exista
            check = conn.execute(
                "SELECT id FROM transformations WHERE name = ?",
                [transformation.name]
            ).fetchone()
            if check:
                raise ValueError(f"Ya existe una transformación con el nombre '{transformation.name}'")
            
            # Crear la vista en DuckDB
            view_sql = f'CREATE OR REPLACE VIEW "{transformation.name}" AS {transformation.sql_definition}'
            try:
                conn.execute(view_sql)
            except Exception as e:
                raise ValueError(f"Error al crear la vista: {str(e)}")
            
            # Guardar metadatos
            now = datetime.now()
            insert_query = """
                INSERT INTO transformations (name, description, source_table, sql_definition, dashboard_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            conn.execute(insert_query, [
                transformation.name,
                transformation.description,
                transformation.source_table,
                transformation.sql_definition,
                transformation.dashboard_id,
                now,
                now
            ])
            
            result = conn.execute("SELECT id FROM transformations WHERE name = ?", [transformation.name]).fetchone()
            transformation_id = result[0]
            
            return TransformationResponse(
                id=transformation_id,
                name=transformation.name,
                description=transformation.description,
                source_table=transformation.source_table,
                sql_definition=transformation.sql_definition,
                dashboard_id=transformation.dashboard_id,
                created_at=now,
                updated_at=now
            )
        finally:
            conn.close()
    
    def list_transformations(self) -> List[TransformationResponse]:
        """Lista todas las transformaciones"""
        conn = db.get_connection()
        try:
            query = "SELECT id, name, description, source_table, sql_definition, created_at, updated_at, dashboard_id FROM transformations ORDER BY created_at DESC"
            results = conn.execute(query).fetchall()
            
            return [
                TransformationResponse(
                    id=row[0],
                    name=row[1],
                    description=row[2],
                    source_table=row[3],
                    sql_definition=row[4],
                    created_at=row[5],
                    updated_at=row[6],
                    dashboard_id=row[7] if len(row) > 7 else None
                )
                for row in results
            ]
        finally:
            conn.close()
    
    def get_transformation(self, transformation_id: int) -> Optional[TransformationResponse]:
        """Obtiene una transformación por ID"""
        conn = db.get_connection()
        try:
            query = "SELECT id, name, description, source_table, sql_definition, created_at, updated_at, dashboard_id FROM transformations WHERE id = ?"
            result = conn.execute(query, [transformation_id]).fetchone()
            
            if not result:
                return None
            
            return TransformationResponse(
                id=result[0],
                name=result[1],
                description=result[2],
                source_table=result[3],
                sql_definition=result[4],
                created_at=result[5],
                updated_at=result[6],
                dashboard_id=result[7] if len(result) > 7 else None
            )
        finally:
            conn.close()
    
    def update_transformation(self, transformation_id: int, update: TransformationUpdate) -> Optional[TransformationResponse]:
        """Actualiza una transformación existente"""
        conn = db.get_connection()
        try:
            # Verificar que existe
            existing = conn.execute(
                "SELECT name, sql_definition FROM transformations WHERE id = ?",
                [transformation_id]
            ).fetchone()
            
            if not existing:
                return None
            
            old_name = existing[0]
            
            # Preparar campos a actualizar
            updates = []
            params = []
            
            if update.name is not None:
                updates.append("name = ?")
                params.append(update.name)
            if update.description is not None:
                updates.append("description = ?")
                params.append(update.description)
            if update.source_table is not None:
                updates.append("source_table = ?")
                params.append(update.source_table)
            if update.sql_definition is not None:
                # Validar nuevo SQL
                source_table = update.source_table if update.source_table else existing[1]
                is_valid, error_msg = self.validate_sql(update.sql_definition, source_table)
                if not is_valid:
                    raise ValueError(error_msg)
                updates.append("sql_definition = ?")
                params.append(update.sql_definition)
            
            if not updates:
                # No hay nada que actualizar
                return self.get_transformation(transformation_id)
            
            # Actualizar timestamp
            updates.append("updated_at = ?")
            params.append(datetime.now())
            params.append(transformation_id)
            
            # Ejecutar update
            update_query = f"UPDATE transformations SET {', '.join(updates)} WHERE id = ?"
            conn.execute(update_query, params)
            
            # Actualizar la vista si cambió el nombre o SQL
            new_name = update.name if update.name else old_name
            new_sql = update.sql_definition if update.sql_definition else existing[1]
            
            # Eliminar vista antigua si cambió el nombre
            if update.name and update.name != old_name:
                conn.execute(f'DROP VIEW IF EXISTS "{old_name}"')
            
            # Recrear vista
            view_sql = f'CREATE OR REPLACE VIEW "{new_name}" AS {new_sql}'
            conn.execute(view_sql)
            
            return self.get_transformation(transformation_id)
        finally:
            conn.close()
    
    def delete_transformation(self, transformation_id: int) -> bool:
        """Elimina una transformación y su vista"""
        conn = db.get_connection()
        try:
            # Obtener nombre de la vista
            result = conn.execute(
                "SELECT name FROM transformations WHERE id = ?",
                [transformation_id]
            ).fetchone()
            
            if not result:
                return False
            
            view_name = result[0]
            
            # Eliminar vista
            conn.execute(f'DROP VIEW IF EXISTS "{view_name}"')
            
            # Eliminar metadatos
            conn.execute("DELETE FROM transformations WHERE id = ?", [transformation_id])
            
            return True
        finally:
            conn.close()
    
    def preview_transformation(self, source_table: str, sql_definition: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Preview de una transformación sin guardarla"""
        # Validar SQL
        is_valid, error_msg = self.validate_sql(sql_definition, source_table)
        if not is_valid:
            raise ValueError(error_msg)
        
        conn = db.get_connection()
        try:
            # Ejecutar query con límite
            preview_sql = f"SELECT * FROM ({sql_definition}) AS preview_query LIMIT {limit}"
            results = conn.execute(preview_sql).fetchall()
            
            if not results:
                return []
            
            # Obtener nombres de columnas
            columns = [desc[0] for desc in conn.execute(preview_sql).description]
            
            # Convertir a lista de diccionarios
            return [
                {columns[i]: value for i, value in enumerate(row)}
                for row in results
            ]
        finally:
            conn.close()
    
    def get_transformation_data(self, transformation_id: int, limit: int = 1000) -> List[Dict[str, Any]]:
        """Obtiene datos de una transformación existente"""
        transformation = self.get_transformation(transformation_id)
        if not transformation:
            raise ValueError(f"Transformación con ID {transformation_id} no encontrada")
        
        conn = db.get_connection()
        try:
            query = f'SELECT * FROM "{transformation.name}" LIMIT {limit}'
            results = conn.execute(query).fetchall()
            
            if not results:
                return []
            
            columns = [desc[0] for desc in conn.execute(query).description]
            
            return [
                {columns[i]: value for i, value in enumerate(row)}
                for row in results
            ]
        finally:
            conn.close()


transformation_service = TransformationService()
