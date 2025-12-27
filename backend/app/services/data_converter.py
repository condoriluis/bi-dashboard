import duckdb
import os
import logging
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import fastavro

class DataConverter:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def convert_to_parquet(self, input_path: str, file_type: str, output_path: str = None) -> str:
        """
        Converts various file formats to Parquet.
        Supported formats: csv, json, xlsx, xls, avro, orc
        Returns the path to the generated Parquet file.
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        if output_path is None:
            output_path = input_path.rsplit('.', 1)[0] + '.parquet'

        self.logger.info(f"Converting {file_type.upper()} file {input_path} to {output_path}...")

        try:
            if file_type == 'csv':
                self._convert_csv(input_path, output_path)
            elif file_type == 'json':
                self._convert_json(input_path, output_path)
            elif file_type in ['xlsx', 'xls']:
                self._convert_excel(input_path, output_path)
            elif file_type == 'avro':
                self._convert_avro(input_path, output_path)
            elif file_type == 'orc':
                self._convert_orc(input_path, output_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")

            self.logger.info(f"Conversion successful: {output_path}")
            return output_path
        except Exception as e:
            self.logger.error(f"Conversion failed: {str(e)}")
            raise e

    def _convert_csv(self, input_path: str, output_path: str):
        """Convert CSV to Parquet using DuckDB"""
        conn = duckdb.connect()
        try:
  
            try:
                query = f"""
                COPY (
                    SELECT * FROM read_csv_auto(
                        '{input_path}',
                        header=true,
                        sample_size=-1,
                        all_varchar=false
                    )
                )
                TO '{output_path}' (FORMAT 'parquet');
                """
                conn.execute(query)
                return
            except Exception as e:
                error_msg = str(e).lower()
                if "invalid unicode" in error_msg or "utf-8" in error_msg:
                    self.logger.warning(f"UTF-8 conversion failed, retrying with LATIN-1: {e}")
                else:
                    raise e

            query = f"""
            COPY (
                SELECT * FROM read_csv_auto(
                    '{input_path}',
                    header=true,
                    sample_size=-1,
                    all_varchar=false,
                    encoding='latin-1'
                )
            )
            TO '{output_path}' (FORMAT 'parquet');
            """
            conn.execute(query)
            
        finally:
            conn.close()

    def _convert_json(self, input_path: str, output_path: str):
        """Convert JSON to Parquet using DuckDB"""
        conn = duckdb.connect()
        try:
            query = f"""
            COPY (
                SELECT * FROM read_json_auto('{input_path}')
            )
            TO '{output_path}' (FORMAT 'parquet');
            """
            conn.execute(query)
        finally:
            conn.close()

    def _convert_excel(self, input_path: str, output_path: str):
        """Convert Excel to Parquet using pandas"""

        df = pd.read_excel(input_path)
        df.to_parquet(output_path, engine='pyarrow', index=False)

    def _convert_avro(self, input_path: str, output_path: str):
        """Convert Avro to Parquet using fastavro and pandas"""
        records = []
        with open(input_path, 'rb') as f:
            reader = fastavro.reader(f)
            for record in reader:
                records.append(record)
        
        df = pd.DataFrame(records)
        df.to_parquet(output_path, engine='pyarrow', index=False)

    def _convert_orc(self, input_path: str, output_path: str):
        """Convert ORC to Parquet using pyarrow"""
   
        table = pa.orc.ORCFile(input_path).read()
        pq.write_table(table, output_path)

    def convert_csv_to_parquet(self, csv_path: str, output_path: str = None) -> str:
        """
        Legacy method for CSV conversion. Kept for backward compatibility.
        """
        return self.convert_to_parquet(csv_path, 'csv', output_path)

data_converter = DataConverter()
