import uuid
import json
from typing import List, Optional
from datetime import datetime
from app.infra.database import db
from app.models.dashboard import (
    Dashboard, DashboardCreate, DashboardUpdate,
    DashboardItem, DashboardItemCreate, DashboardLayoutUpdate
)

class DashboardService:
    """Servicio para gestionar dashboards y sus items"""

    def create_dashboard(self, dashboard: DashboardCreate) -> Dashboard:
        """Crea un nuevo dashboard"""
        conn = db.get_connection()
        try:
            dashboard_id = dashboard.id if dashboard.id else str(uuid.uuid4())
            now = datetime.now()
            
            query = """
                INSERT INTO dashboards (id, name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """
            conn.execute(query, [
                dashboard_id,
                dashboard.name,
                dashboard.description,
                now,
                now
            ])
            
            return self.get_dashboard(dashboard_id)
        finally:
            conn.close()

    def get_dashboard(self, dashboard_id: str) -> Optional[Dashboard]:
        """Obtiene un dashboard y sus items por ID"""
        conn = db.get_connection()
        try:
            # Obtener dashboard
            query_dash = "SELECT id, name, description, created_at, updated_at FROM dashboards WHERE id = ?"
            row = conn.execute(query_dash, [dashboard_id]).fetchone()
            
            if not row:
                return None
            
            # Obtener items
            query_items = "SELECT id, type, title, config, created_at FROM dashboard_items WHERE dashboard_id = ?"
            item_rows = conn.execute(query_items, [dashboard_id]).fetchall()
            
            items = [
                DashboardItem(
                    id=item[0],
                    dashboard_id=dashboard_id,
                    type=item[1],
                    title=item[2],
                    config=json.loads(item[3]) if isinstance(item[3], str) else item[3],
                    created_at=item[4]
                )
                for item in item_rows
            ]
            
            return Dashboard(
                id=row[0],
                name=row[1],
                description=row[2],
                created_at=row[3],
                updated_at=row[4],
                items=items
            )
        finally:
            conn.close()

    def list_dashboards(self) -> List[Dashboard]:
        """Lista todos los dashboards (resumido, sin items)"""
        conn = db.get_connection()
        try:
            query = "SELECT id, name, description, created_at, updated_at FROM dashboards ORDER BY created_at DESC"
            rows = conn.execute(query).fetchall()
            
            return [
                Dashboard(
                    id=row[0],
                    name=row[1],
                    description=row[2],
                    created_at=row[3],
                    updated_at=row[4],
                    items=[] # No cargamos items en lista para optimizar
                )
                for row in rows
            ]
        finally:
            conn.close()

    def update_dashboard_layout(self, dashboard_id: str, layout: DashboardLayoutUpdate) -> Dashboard:
        """Actualiza el layout (widgets) de un dashboard completo"""
        conn = db.get_connection()
        try:
            # Verificar existencia
            check = conn.execute("SELECT id FROM dashboards WHERE id = ?", [dashboard_id]).fetchone()
            if not check:
                raise ValueError(f"Dashboard {dashboard_id} no encontrado")

            # Iniciar transacción implícita
            conn.begin()
            
            # 1. Eliminar todos los items actuales
            conn.execute("DELETE FROM dashboard_items WHERE dashboard_id = ?", [dashboard_id])
            
            # 2. Insertar nuevos items
            insert_query = """
                INSERT INTO dashboard_items (id, dashboard_id, type, title, config, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            
            now = datetime.now()
            for item in layout.items:
                conn.execute(insert_query, [
                    item.id,
                    dashboard_id,
                    item.type,
                    item.title,
                    json.dumps(item.config),
                    now
                ])
            
            # 3. Actualizar timestamp del dashboard
            conn.execute("UPDATE dashboards SET updated_at = ? WHERE id = ?", [now, dashboard_id])
            
            conn.commit()
            
            return self.get_dashboard(dashboard_id)
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def update_dashboard(self, dashboard_id: str, dashboard: DashboardUpdate) -> Dashboard:
        """Actualiza los metadatos de un dashboard (nombre y descripción)"""
        conn = db.get_connection()
        try:
            # Verificar existencia
            check = conn.execute("SELECT id FROM dashboards WHERE id = ?", [dashboard_id]).fetchone()
            if not check:
                raise ValueError(f"Dashboard {dashboard_id} no encontrado")
            
            now = datetime.now()
            query = """
                UPDATE dashboards 
                SET name = ?, description = ?, updated_at = ?
                WHERE id = ?
            """
            conn.execute(query, [
                dashboard.name,
                dashboard.description,
                now,
                dashboard_id
            ])
            
            return self.get_dashboard(dashboard_id)
        finally:
            conn.close()

    def delete_dashboard(self, dashboard_id: str) -> bool:
        """Elimina un dashboard y todos sus items"""
        conn = db.get_connection()
        try:
            # Verificar existencia
            check = conn.execute("SELECT id FROM dashboards WHERE id = ?", [dashboard_id]).fetchone()
            if not check:
                raise ValueError(f"Dashboard {dashboard_id} no encontrado")
            
            conn.begin()
            
            # Eliminar items primero (por foreign key)
            conn.execute("DELETE FROM dashboard_items WHERE dashboard_id = ?", [dashboard_id])
            
            # Eliminar dashboard
            conn.execute("DELETE FROM dashboards WHERE id = ?", [dashboard_id])
            
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

dashboard_service = DashboardService()
