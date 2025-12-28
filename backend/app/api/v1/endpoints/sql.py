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
    
    allowed_prefixes = ("select", "describe", "show", "explain")
    if not sql.lower().startswith(allowed_prefixes):
        raise HTTPException(status_code=400, detail="Only SELECT, SHOW, DESCRIBE and EXPLAIN queries are allowed.")
    
    forbidden_keywords = ["drop", "delete", "insert", "update", "alter", "create", "truncate", "grant", "revoke"]
    for word in forbidden_keywords:
        if f" {word} " in f" {sql.lower()} ":
            raise HTTPException(status_code=400, detail=f"Forbidden keyword '{word}' detected. Sandbox allows read-only operations.")
    
    if ";" in sql.replace(";", ""):
        raise HTTPException(status_code=400, detail="Multiple statements (semicolons) are not allowed in Sandbox.")

    try:
        
        cursor = db_conn.execute(sql)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        result = [dict(zip(columns, row)) for row in rows]
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")


from app.schemas.query_builder import QueryBuilderRequest
from app.core.query_builder import SecureQueryBuilder

@router.post("/execute-secure", response_model=List[Dict[str, Any]])
def execute_secure_query(
    query_req: QueryBuilderRequest,
    current_user: User = Depends(deps.get_current_user),
    db_conn = Depends(get_db)
) -> Any:
    """
    Execute a secure query using query builder.
    100% safe against SQL injection.
    """
    builder = SecureQueryBuilder()
    
    try:
        sql, params = builder.build_sql(query_req)
        
        cursor = db_conn.execute(sql, params)
        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            result = [dict(zip(columns, row)) for row in rows]
            return result
        return []
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")
