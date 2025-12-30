from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.api import deps
from app.models.user import User
from app.services.data_loader import data_loader
from app.services.data_converter import data_converter

router = APIRouter()

@router.post("/", status_code=201)
def upload_dataset(
    file: UploadFile = File(...),
    table_name: str = Form(...),
    dashboard_id: Optional[str] = Form(None),
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Upload a CSV/Parquet file and register it as a table.
    Only superusers (Admins) can upload datasets.
    """
    # Basic validation
    if not (file.filename.endswith(".csv") or file.filename.endswith(".parquet")):
        raise HTTPException(status_code=400, detail="Only .csv and .parquet files are supported")
    
    file_path = data_loader.save_file(file)
    final_path = file_path
    
    # Auto-convert CSV to Parquet for performance
    if file_path.endswith(".csv"):
        try:
            final_path = data_converter.convert_csv_to_parquet(file_path)
        except Exception as e:
            print(f"Warning: CSV conversion failed, falling back to CSV. Error: {e}")
            final_path = file_path

    try:
        data_loader.register_dataset(table_name, final_path, file.filename, dashboard_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {str(e)}")
        
    return {"message": "Dataset uploaded and registered successfully", "table": table_name}

@router.post("/convert", status_code=200)
def convert_dataset(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Convert various file formats to Parquet.
    Supported formats: CSV, TXT, JSON, Excel (.xlsx, .xls), Avro, ORC
    """
    # Detect file type from extension
    file_ext = file.filename.rsplit('.', 1)[-1].lower()
    supported_formats = ['csv', 'txt', 'json', 'xlsx', 'xls', 'avro', 'orc']
    
    if file_ext not in supported_formats:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Supported: {', '.join(supported_formats)}"
        )

    import os
    file_path = data_loader.save_file(file)
    try:
        parquet_path = data_converter.convert_to_parquet(file_path, file_ext)
        
        original_size = os.path.getsize(file_path)
        parquet_size = os.path.getsize(parquet_path)
        reduction_percent = ((original_size - parquet_size) / original_size * 100) if original_size > 0 else 0
        
        # Delete original file after successful conversion
        try:
            os.remove(file_path)
        except Exception as cleanup_error:
            print(f"Warning: Could not delete original file: {cleanup_error}")
        
        return {
            "message": "Conversión exitosa", 
            "original_file": file.filename,
            "original_format": file_ext.upper(),
            "parquet_file": os.path.basename(parquet_path),
            "original_size": original_size,
            "parquet_size": parquet_size,
            "size_reduction_percent": round(reduction_percent, 2)
        }
    except Exception as e:
        # If conversion fails, cleanup the uploaded file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@router.get("/")
def list_datasets(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    List available datasets (tables) with metadata.
    """
    return data_loader.list_tables()

@router.delete("/server-files", status_code=200)
def delete_server_file(
    filename: str,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Delete a file from the uploads directory.
    Only superusers (Admins) can delete files.
    """
    try:
        data_loader.delete_server_file(filename)
        return {"message": f"File '{filename}' deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@router.delete("/{table_name}", status_code=200)
def delete_dataset(
    table_name: str,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Delete a dataset table and its metadata.
    Only superusers (Admins) can delete datasets.
    """
    try:
        data_loader.delete_dataset(table_name)
        return {"message": f"Dataset '{table_name}' deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete dataset: {str(e)}")

from pydantic import BaseModel

class UrlImportRequest(BaseModel):
    url: str
    table_name: str
    dashboard_id: Optional[str] = None

class LocalImportRequest(BaseModel):
    file_path: str
    table_name: str
    dashboard_id: Optional[str] = None

@router.post("/import-url", status_code=201)
def import_dataset_from_url(
    request: UrlImportRequest,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Import a dataset from a public URL (Parquet/CSV).
    """
    try:
        data_loader.register_dataset_from_url(request.url, request.table_name, request.dashboard_id)
        return {"message": "Dataset imported successfully from URL", "table": request.table_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import from URL: {str(e)}")

@router.post("/import-local", status_code=201)
def import_dataset_from_local(
    request: LocalImportRequest,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Import a dataset from a file already on the server (in uploads/ directory).
    """
    try:
        
        full_path = data_loader.get_full_path(request.file_path)
        data_loader.register_dataset_from_local_path(full_path, request.table_name, None, request.dashboard_id)
        return {"message": "Dataset imported successfully from local file", "table": request.table_name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import from local file: {str(e)}")

class SqlImportRequest(BaseModel):
    sql_query: str
    table_name: str
    dashboard_id: Optional[str] = None

@router.post("/create-from-sql", status_code=201)
def create_dataset_from_sql(
    request: SqlImportRequest,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Create a new dataset table from a SQL query.
    """
    try:
        data_loader.register_dataset_from_sql(request.sql_query, request.table_name, request.dashboard_id)
        return {"message": "Dataset created successfully from SQL", "table": request.table_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create dataset from SQL: {str(e)}")

@router.get("/server-files")
def list_server_files(
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    List available files in the uploads directory for import.
    """
    return data_loader.list_server_files()
@router.get("/{table_name}/columns")
def list_dataset_columns(
    table_name: str,
    current_user: User = Depends(deps.get_current_user)
) -> List[str]:
    """
    Get the list of column names for a specific dataset.
    """
    try:
        from app.infra.database import db
        conn = db.get_connection()
        try:
            query = f'DESCRIBE "{table_name}"'
            result = conn.execute(query).df()
            return result['column_name'].tolist()
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Dataset {table_name} not found or inaccessible: {str(e)}")


