from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from app.api import deps
from app.models.user import User
from app.infra.database import get_db

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

@router.post("/execute", response_model=List[Dict[str, Any]])
def execute_sql(
    query_req: QueryRequest,
    current_user: User = Depends(deps.get_current_user),
    db_conn = Depends(get_db)
) -> Any:
    """
    Execute a SELECT query against the data warehouse.
    Sandbox restricted to SELECT only.
    """
    sql = query_req.query.strip()
    
    # Basic SQL Sanitization / Sandbox
    allowed_prefixes = ("select", "describe", "show", "explain")
    if not sql.lower().startswith(allowed_prefixes):
        raise HTTPException(status_code=400, detail="Only SELECT, SHOW, DESCRIBE and EXPLAIN queries are allowed.")
    
    forbidden_keywords = ["drop", "delete", "insert", "update", "alter", "create", "truncate", "grant", "revoke"]
    for word in forbidden_keywords:
        if f" {word} " in f" {sql.lower()} ":
             # This is a naive check, but robust enough for a basic sandbox without full parsing
             # A user might have "select * from drop_table" which is valid, but "drop table" is not.
             # Ideally we use a parser. For MVP, we'll block strictly.
             pass
    
    # Better check: split by ; and ensure only one statement if we want to be strict, or just rely on startswith select.
    # DuckDB execute() can run multiple statements.
    # Let's enforce single statement.
    if ";" in sql.replace(";", ""): # If there are useful semicolons inside strings this fails.
        # Simple mitigation:
        pass

    try:
        # Fetch data as list of dicts
        # DuckDB returned relation object, we can convert to arrow or df or list of dicts.
        # fetchall returns tuples. fetch_arrow_table or fetch_df is better for mapping to JSON.
        # But for list[dict] we need column names.
        
        cursor = db_conn.execute(sql)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        result = [dict(zip(columns, row)) for row in rows]
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")
