import duckdb

con = duckdb.connect(':memory:')
con.execute("CREATE TABLE foo (i INTEGER)")
con.execute("CREATE VIEW bar AS SELECT * FROM foo")

print("Information Schema Tables:")
results = con.execute("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='main'").fetchall()
print(results)
