import duckdb
from app.core.config import settings
from app.core.security import verify_password, get_password_hash

def debug_auth():
    print(f"Connecting to DB at: {settings.DUCKDB_PATH}")
    conn = duckdb.connect(settings.DUCKDB_PATH)
    
    try:
        users = conn.execute("SELECT id, email, hashed_password, role FROM users").fetchall()
        print(f"Found {len(users)} users.")
        for u in users:
            print(f"User: {u[1]}, Role: {u[3]}, Hash: {u[2]}")
            
            # Test password 'admin'
            is_valid = verify_password("admin", u[2])
            print(f"  Password 'admin' valid? {is_valid}")
            
            if not is_valid:
                print("  Re-hashing 'admin' to see difference...")
                new_hash = get_password_hash("admin")
                print(f"  New hash: {new_hash}")
                
    except Exception as e:
        print(f"Error querying DB: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    debug_auth()
