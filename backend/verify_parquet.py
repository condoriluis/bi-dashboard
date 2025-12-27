import duckdb
import os

file_path = "uploads/ventas_bi_demo.parquet"

def verify():
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Verifying {file_path}...")
    try:
        conn = duckdb.connect()
        # Describe schema
        print("--- Schema ---")
        schema = conn.execute(f"DESCRIBE SELECT * FROM read_parquet('{file_path}')").fetchall()
        for col in schema:
            print(col)
        
        print("\n--- First 5 Rows ---")
        data = conn.execute(f"SELECT * FROM read_parquet('{file_path}') LIMIT 5").fetchall()
        for row in data:
            print(row)
            
        print("\nSUCCESS: File is a valid Parquet file.")
    except Exception as e:
        print(f"\nERROR: File is NOT valid or could not be read. Reason: {e}")

if __name__ == "__main__":
    verify()
