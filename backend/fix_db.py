
import duckdb

conn = duckdb.connect('bi_analytics.duckdb')
try:
    # Drop dashboard_items first if it exists (dependencies)
    conn.execute("DROP TABLE IF EXISTS dashboard_items")
    # Drop dashboards to allow recreation with correct schema
    conn.execute("DROP TABLE IF EXISTS dashboards")
    print("Tables dropped successfully. They will be recreated on next server start.")
finally:
    conn.close()
