
import sys
import duckdb
from app.core.config import settings

def delete_user(email):
    print(f"Connecting to DB at: {settings.DUCKDB_PATH}")
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        print("If the database is locked, try stopping the backend service first.")
        return

    try:
        # Check if user exists
        query_check = "SELECT id, full_name FROM users WHERE email = ?"
        user = conn.execute(query_check, [email]).fetchone()
        
        if not user:
            print(f"User with email '{email}' not found.")
            return

        print(f"Found user: ID={user[0]}, Name='{user[1]}'")
        confirm = input("Are you sure you want to delete this user? (yes/no): ")
        
        if confirm.lower() == 'yes':
            query_delete = "DELETE FROM users WHERE email = ?"
            conn.execute(query_delete, [email])
            print(f"User '{email}' deleted successfully.")
        else:
            print("Operation cancelled.")

    except Exception as e:
        print(f"Error deleting user: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python delete_user.py <email>")
        sys.exit(1)
    
    email_arg = sys.argv[1]
    delete_user(email_arg)
