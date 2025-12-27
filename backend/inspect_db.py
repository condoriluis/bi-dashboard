
import duckdb

conn = duckdb.connect('bi_analytics.duckdb')
try:
    print("--- TABLES ---")
    print(conn.execute("SHOW TABLES").fetchall())
    
    print("\n--- DASHBOARDS SCHEMA ---")
    try:
        print(conn.execute("DESCRIBE dashboards").fetchall())
    except:
        print("Table dashboards does not exist")

    print("\n--- DASHBOARD_ITEMS SCHEMA ---")
    try:
        print(conn.execute("DESCRIBE dashboard_items").fetchall())
    except:
        print("Table dashboard_items does not exist")
finally:
    conn.close()
