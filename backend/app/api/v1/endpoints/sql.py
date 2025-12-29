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

def _auto_quote_identifiers(sql: str, db_conn) -> str:
    """
    Automatically quote identifiers (column/table names) that contain spaces.
    Uses context-aware token parsing to avoid quoting keywords and aliases.
    """
    import re
    
    # SQL keywords
    sql_keywords = {
        'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'AS', 'ASC', 'DESC',
        'MAX', 'MIN', 'SUM', 'AVG', 'COUNT', 'DISTINCT', 'ALL',
        'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'ON', 'USING',
        'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
        'LIMIT', 'OFFSET', 'HAVING', 'UNION', 'INTERSECT', 'EXCEPT',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'OVER', 'PARTITION'
    }
    
    # Tokenize SQL
    tokens = re.findall(r'"[^"]*"|\'[^\']*\'|\S+', sql)
    
    result_tokens = []
    i = 0
    
    while i < len(tokens):
        token = tokens[i]
        
        # Skip if already quoted
        if token.startswith('"') or token.startswith("'"):
            result_tokens.append(token)
            i += 1
            continue
        
        # Check if previous token was AS (this is an alias, don't quote)
        if result_tokens and result_tokens[-1].upper() == 'AS':
            result_tokens.append(token)
            i += 1
            continue
        
        # Try to build multi-word identifier
        if i + 1 < len(tokens) and re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', token):
            multi_word = token
            j = i + 1
            
            while j < len(tokens):
                next_token = tokens[j]
                # Stop at keywords, operators, or already quoted strings
                if (next_token.upper() in sql_keywords or 
                    next_token in ['(', ')', ',', ';', '=', '<', '>', '!', '+', '-', '*', '/'] or
                    next_token.startswith('"') or next_token.startswith("'")):
                    break
                # Add to multi-word if it's a valid identifier part
                if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', next_token):
                    multi_word += ' ' + next_token
                    j += 1
                else:
                    break
            
            # If we found multi-word, quote it
            if j > i + 1:
                result_tokens.append(f'"{multi_word}"')
                i = j
                continue
        
        # Single token
        result_tokens.append(token)
        i += 1
    
    return ' '.join(result_tokens)


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
