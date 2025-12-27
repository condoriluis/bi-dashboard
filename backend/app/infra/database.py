import duckdb
from app.core.config import settings
from app.core.security import get_password_hash

class Database:
    def __init__(self):
        self.db_path = settings.DUCKDB_PATH

    def get_connection(self):
        # Create a new connection for each request/scope to ensure thread safety
        conn = duckdb.connect(self.db_path)
        return conn

    def init_db(self):
        conn = self.get_connection()
        try:
            query = """
            CREATE SEQUENCE IF NOT EXISTS user_id_seq;
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER DEFAULT nextval('user_id_seq') PRIMARY KEY,
                email VARCHAR UNIQUE,
                hashed_password VARCHAR,
                full_name VARCHAR,
                is_active BOOLEAN DEFAULT TRUE,
                is_superuser BOOLEAN DEFAULT FALSE,
                role VARCHAR DEFAULT 'viewer'
            );
            
            CREATE SEQUENCE IF NOT EXISTS transformation_id_seq;
            CREATE TABLE IF NOT EXISTS transformations (
                id INTEGER DEFAULT nextval('transformation_id_seq') PRIMARY KEY,
                name VARCHAR UNIQUE NOT NULL,
                description VARCHAR,
                source_table VARCHAR NOT NULL,
                sql_definition TEXT NOT NULL,
                dashboard_id VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS dashboards (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                description VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS dashboard_items (
                id VARCHAR PRIMARY KEY,
                dashboard_id VARCHAR,
                type VARCHAR NOT NULL,
                title VARCHAR,
                config JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dashboard_id) REFERENCES dashboards(id)
            );
            """
            conn.execute(query)
            
            # Migrations
            try:
                conn.execute("ALTER TABLE dataset_metadata ADD COLUMN dashboard_id VARCHAR")
            except:
                pass
                
            try:
                conn.execute("ALTER TABLE transformations ADD COLUMN dashboard_id VARCHAR")
            except:
                pass
            
            # Seed Admin
            admin_email = "admin@dashboard.com"
            admin_query = "SELECT * FROM users WHERE email = ?"
            admin = conn.execute(admin_query, [admin_email]).fetchone()
            if not admin:
                print("Seeding admin user...")
                hashed_pw = get_password_hash("admin")
                conn.execute(
                    "INSERT INTO users (email, hashed_password, full_name, is_superuser, role) VALUES (?, ?, ?, ?, ?)",
                    [admin_email, hashed_pw, "Usuario Admin", True, "admin"]
                )
        finally:
            conn.close()

db = Database()

def get_db():
    conn = db.get_connection()
    try:
        yield conn
    finally:
        conn.close()
