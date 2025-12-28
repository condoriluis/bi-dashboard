import os
import shutil
from typing import List, Dict, Optional
from fastapi import UploadFile
from app.infra.database import db
from datetime import datetime

UPLOAD_DIR = "uploads"

class DataLoader:
    def __init__(self):
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        self._init_metadata_table()

    def _init_metadata_table(self):
        """Initialize metadata table to store dataset information"""
        conn = db.get_connection()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS dataset_metadata (
                    table_name VARCHAR PRIMARY KEY,
                    original_filename VARCHAR,
                    file_extension VARCHAR,
                    upload_date TIMESTAMP,
                    dashboard_id VARCHAR
                )
            """)
            
            try:
                conn.execute("ALTER TABLE dataset_metadata ADD COLUMN dashboard_id VARCHAR")
            except:
                pass
                
        finally:
            conn.close()

    def save_file(self, file: UploadFile) -> str:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    def register_dataset(self, table_name: str, file_path: str, original_filename: str = None, dashboard_id: str = None):
        self.register_dataset_from_local_path(file_path, table_name, original_filename, dashboard_id)

    def register_dataset_from_local_path(self, file_path: str, table_name: str, original_filename: str = None, dashboard_id: str = None):
        """Register a dataset existing in the local filesystem"""
        conn = db.get_connection()
        try:
            # Determine file type
            if file_path.endswith(".csv"):
 
                try:
                    query = f"""
                    CREATE OR REPLACE TABLE {table_name} AS 
                    SELECT * FROM read_csv_auto(
                        '{file_path}',
                        header=true,
                        sample_size=-1,
                        all_varchar=false
                    )
                    """
                    conn.execute(query)
                except Exception as e:
           
                    if "invalid unicode" in str(e).lower() or "utf-8" in str(e).lower():
                        query = f"""
                        CREATE OR REPLACE TABLE {table_name} AS 
                        SELECT * FROM read_csv_auto(
                            '{file_path}',
                            header=true,
                            sample_size=-1,
                            all_varchar=false,
                            encoding='latin-1'
                        )
                        """
                        conn.execute(query)
                    else:
                        raise e
            elif file_path.endswith(".parquet"):
                query = f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_parquet('{file_path}')"
                conn.execute(query)
            elif file_path.endswith(".json"):
                query = f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_json_auto('{file_path}')"
                conn.execute(query)
            else:
                raise ValueError("Unsupported file format")
            
            # Store metadata
            if original_filename is None:
                original_filename = os.path.basename(file_path)
            
            file_extension = os.path.splitext(original_filename)[1]
            
            # Insert or update metadata
            conn.execute("""
                INSERT OR REPLACE INTO dataset_metadata (table_name, original_filename, file_extension, upload_date, dashboard_id)
                VALUES (?, ?, ?, ?, ?)
            """, (table_name, original_filename, file_extension, datetime.now(), dashboard_id))
            
        finally:
            conn.close()

    def register_dataset_from_url(self, url: str, table_name: str, dashboard_id: str = None):
        """Register a dataset directly from a URL (Parquet/CSV)"""
        conn = db.get_connection()
        try:
            # Install httpfs extension just in case (though often builtin)
            try:
                conn.execute("INSTALL httpfs; LOAD httpfs;")
            except:
                pass # Might be already loaded or bundled

            # Determine file type from URL extension
            # This is basic, might need improvement for URLs without extension
            if url.endswith(".csv") or ".csv?" in url:
                # Try UTF-8 first
                try:
                    query = f"""
                    CREATE OR REPLACE TABLE {table_name} AS 
                    SELECT * FROM read_csv_auto(
                        '{url}',
                        header=true,
                        sample_size=-1,
                        all_varchar=false
                    )
                    """
                    conn.execute(query)
                except Exception as e:
                     # Retry with LATIN-1
                    if "invalid unicode" in str(e).lower() or "utf-8" in str(e).lower():
                        query = f"""
                        CREATE OR REPLACE TABLE {table_name} AS 
                        SELECT * FROM read_csv_auto(
                            '{url}',
                            header=true,
                            sample_size=-1,
                            all_varchar=false,
                            encoding='latin-1'
                        )
                        """
                        conn.execute(query)
                    else:
                        raise e
            elif url.endswith(".parquet") or ".parquet?" in url:
                query = f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_parquet('{url}')"
                conn.execute(query)
            elif url.endswith(".json") or ".json?" in url:
                query = f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_json_auto('{url}')"
                conn.execute(query)
            else:
                # Default to parquet as fallback
                query = f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_parquet('{url}')"
                conn.execute(query)

            # Metadata
            original_filename = url.split('/')[-1].split('?')[0]
            file_extension = os.path.splitext(original_filename)[1]
            if not file_extension:
                file_extension = '.parquet' # Assumption
                
            conn.execute("""
                INSERT OR REPLACE INTO dataset_metadata (table_name, original_filename, file_extension, upload_date, dashboard_id)
                VALUES (?, ?, ?, ?, ?)
            """, (table_name, original_filename, file_extension, datetime.now(), dashboard_id))

        finally:
            conn.close()

    def list_server_files(self) -> List[str]:
        """List files in the uploads directory recursively"""
        files = []
        for root, _, filenames in os.walk(UPLOAD_DIR):
            for filename in filenames:
                if filename.lower().endswith(('.csv', '.parquet', '.json', '.xlsx', '.xls', '.avro', '.orc')):
                    # Create relative path from uploads dir
                    rel_path = os.path.relpath(os.path.join(root, filename), UPLOAD_DIR)
                    # We return the RELATIVE path for display, but full path for processing
                    # Actually, let's return just filename if valid, but to support subdirs we might need more.
                    # For simplicity MVP: just files in uploads dir or relative paths.
                    files.append(rel_path)
        return sorted(files)

    def get_full_path(self, relative_path: str) -> str:
        """Securely get full path and prevent traversal"""
        # Resolve absolute path
        base_path = os.path.abspath(UPLOAD_DIR)
        full_path = os.path.abspath(os.path.join(base_path, relative_path))
        
        # Check if full path starts with base path
        if not full_path.startswith(base_path):
            raise ValueError("Invalid file path: Directory traversal attempt")
            
        if not os.path.exists(full_path):
            raise ValueError("File not found")
            
        return full_path

    def delete_server_file(self, filename: str):
        """Delete a file from the uploads directory"""
        try:
            full_path = self.get_full_path(filename)
            if os.path.exists(full_path):
                os.remove(full_path)
            else:
                raise ValueError("File not found")
        except Exception as e:
            raise e

    def list_tables(self) -> List[Dict[str, str]]:
        conn = db.get_connection()
        try:
            # Get tables with their metadata
            query = """
                SELECT 
                    t.table_name,
                    COALESCE(m.original_filename, t.table_name) as filename,
                    COALESCE(m.file_extension, CASE WHEN t.table_type = 'VIEW' THEN 'view' ELSE '' END) as extension,
                    COALESCE(m.upload_date, tf.created_at) as upload_date,
                    tf.source_table,
                    COALESCE(m.dashboard_id, tf.dashboard_id) as dashboard_id
                FROM (
                    SELECT table_name, table_type 
                    FROM information_schema.tables 
                    WHERE table_schema = 'main' 
                    AND table_name NOT IN ('users', 'user_id_seq', 'dataset_metadata', 'transformations', 'transformation_id_seq', 'dashboards', 'dashboard_items')
                ) t
                LEFT JOIN dataset_metadata m ON t.table_name = m.table_name
                LEFT JOIN transformations tf ON t.table_name = tf.name
                ORDER BY m.upload_date DESC NULLS LAST, t.table_name
            """
            results = conn.execute(query).fetchall()
            
            return [
                {
                    "table_name": row[0],
                    "filename": row[1],
                    "extension": row[2],
                    "upload_date": str(row[3]) if row[3] else None,
                    "type": "view" if row[2] == 'view' else "table",
                    "source_table": row[4],
                    "dashboard_id": row[5]
                }
                for row in results
            ]
        finally:
            conn.close()

    def delete_dataset(self, table_name: str):
        """Delete a dataset table and its metadata"""
        conn = db.get_connection()
        try:
            # Check object type (Table or View)
            # information_schema.tables contains both tables and views
            type_query = f"SELECT table_type FROM information_schema.tables WHERE table_name = '{table_name}' AND table_schema = 'main'"
            result = conn.execute(type_query).fetchone()
            
            if result and result[0] == 'VIEW':
                conn.execute(f"DROP VIEW IF EXISTS {table_name}")
                # Also delete from transformations table if it exists there
                conn.execute("DELETE FROM transformations WHERE name = ?", (table_name,))
            else:
                conn.execute(f"DROP TABLE IF EXISTS {table_name}")
            
            # Delete metadata
            conn.execute("DELETE FROM dataset_metadata WHERE table_name = ?", (table_name,))
        finally:
            conn.close()

data_loader = DataLoader()

