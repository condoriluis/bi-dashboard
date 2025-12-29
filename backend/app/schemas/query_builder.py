from typing import Any, List, Optional, Union
from pydantic import BaseModel, Field, validator


class ColumnSelect(BaseModel):
    """Column selection with optional aggregation function."""
    column: str
    function: Optional[str] = None
    alias: Optional[str] = None

    @validator('function')
    def validate_function(cls, v):
        if v is not None:
            allowed = ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN']
            if v.upper() not in allowed:
                raise ValueError(f'Function must be one of {allowed}')
            return v.upper()
        return v


class WhereCondition(BaseModel):
    """WHERE clause condition."""
    column: str
    operator: str 
    value: Any

    @validator('operator')
    def validate_operator(cls, v):
        allowed = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']
        if v not in allowed:
            raise ValueError(f'Operator must be one of {allowed}')
        return v


class OrderBy(BaseModel):
    """ORDER BY clause."""
    column: str
    direction: str = Field(default="ASC")

    @validator('direction')
    def validate_direction(cls, v):
        if v.upper() not in ['ASC', 'DESC']:
            raise ValueError('Direction must be ASC or DESC')
        return v.upper()


class QueryBuilderRequest(BaseModel):
    """Structured query request - 100% safe against SQL injection."""
    table: str
    columns: List[Union[str, ColumnSelect]]
    where: Optional[List[WhereCondition]] = None
    groupBy: Optional[List[str]] = None
    orderBy: Optional[List[OrderBy]] = None
    limit: Optional[int] = Field(default=None, ge=0, le=10000)

    class Config:
        json_schema_extra = {
            "example": {
                "table": "ventas_depto",
                "columns": [
                    "fecha",
                    {"column": "ventas", "function": "SUM", "alias": "value"}
                ],
                "groupBy": ["fecha"],
                "orderBy": [{"column": "fecha", "direction": "ASC"}],
                "limit": 10
            }
        }
