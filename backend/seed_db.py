import duckdb
from app.core.config import settings
from app.core.security import get_password_hash

def seed_db():
    print(f"Seeding DB at: {settings.DUCKDB_PATH}")
    conn = duckdb.connect(settings.DUCKDB_PATH)
    
    try:
        # Create Tables
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
        
        CREATE SEQUENCE IF NOT EXISTS dashboard_id_seq;
        CREATE TABLE IF NOT EXISTS dashboards (
            id INTEGER DEFAULT nextval('dashboard_id_seq') PRIMARY KEY,
            title VARCHAR,
            description VARCHAR,
            layout JSON,
            charts JSON,
            created_by INTEGER
        );
        """
        conn.execute(query)
        
        # Seed Admin
        admin_email = "admin@dashboard.com"
        admin_query = "SELECT * FROM users WHERE email = ?"
        admin = conn.execute(admin_query, [admin_email]).fetchone()
        
        if not admin:
            print("Creating admin user...")
            hashed_pw = get_password_hash("admin")
            conn.execute(
                "INSERT INTO users (email, hashed_password, full_name, is_superuser, role) VALUES (?, ?, ?, ?, ?)",
                [admin_email, hashed_pw, "Usuario Admin", True, "admin"]
            )
            print("Admin user created.")
        else:
            print("Admin user already exists.")
            
    except Exception as e:
        print(f"Error seeding DB: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_db()
