
import duckdb

conn = duckdb.connect('bi_analytics.duckdb')
try:
    # Get all dashboards ordered by creation time
    print("Checking for duplicates...")
    dashboards = conn.execute("SELECT id, name, created_at FROM dashboards ORDER BY created_at ASC").fetchall()
    
    if len(dashboards) > 1:
        print(f"Found {len(dashboards)} dashboards. Keeping the FIRST one (oldest) and deleting the rest.")
        
        # Keep the first ID, delete others
        primary_id = dashboards[0][0]
        print(f"Keeping Dashboard ID: {primary_id}")
        
        for i in range(1, len(dashboards)):
            dup_id = dashboards[i][0]
            print(f"Deleting Duplicate ID: {dup_id}")
            # Items cascade delete
            conn.execute("DELETE FROM dashboards WHERE id = ?", [dup_id])
            
        print("Cleanup complete.")
    else:
        print("No duplicates found.")
        
finally:
    conn.close()
