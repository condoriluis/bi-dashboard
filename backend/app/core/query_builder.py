import re
from typing import List, Tuple, Any
from app.schemas.query_builder import QueryBuilderRequest, ColumnSelect

class SecureQueryBuilder:
    """
    Secure SQL query builder that prevents SQL injection.
    Validates all inputs and constructs safe SQL queries.
    """
    
    ALLOWED_FUNCTIONS = ["SUM", "AVG", "COUNT", "MAX", "MIN"]
    ALLOWED_OPERATORS = ["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"]
    
    def __init__(self):
        pass
    
    def build_sql(self, query: QueryBuilderRequest) -> Tuple[str, List[Any]]:
        """
        Build a safe SQL query from structured parameters.
        
        Returns:
            Tuple of (sql_string, parameters_list)
        """
        self._sanitize_identifier(query.table)

        
        select_parts = self._build_select_clause(query.columns)
  
        sql = f"SELECT {', '.join(select_parts)} FROM {self._sanitize_identifier(query.table)}"
        
        params = []
        if query.where:
            where_clause, where_params = self._build_where_clause(query.where)
            sql += f" WHERE {where_clause}"
            params.extend(where_params)
        
        if query.groupBy:
            group_clause = self._build_group_by_clause(query.groupBy)
            sql += f" GROUP BY {group_clause}"
        
        if query.orderBy:
            order_clause = self._build_order_by_clause(query.orderBy)
            sql += f" ORDER BY {order_clause}"
        
        if query.limit:
            sql += f" LIMIT {int(query.limit)}"
        
        return sql, params
    
    def _build_select_clause(self, columns: List) -> List[str]:
        """Build SELECT clause with validation."""
        select_parts = []
        
        for col in columns:
            if isinstance(col, str):
                if col == "*":
                    select_parts.append("*")
                else:
                    select_parts.append(self._sanitize_identifier(col))
            elif isinstance(col, ColumnSelect):
                func = col.function
                if func and func.upper() not in self.ALLOWED_FUNCTIONS:
                    raise ValueError(f"Function '{func}' is not allowed")
                
                col_name = self._sanitize_identifier(col.column) if col.column != "*" else "*"
                
                if func:
                    if col.alias:
                        alias = self._sanitize_identifier(col.alias)
                        select_parts.append(f"{func}({col_name}) AS {alias}")
                    else:
                        select_parts.append(f"{func}({col_name})")
                else:
                    if col.alias:
                        alias = self._sanitize_identifier(col.alias)
                        select_parts.append(f"{col_name} AS {alias}")
                    else:
                        select_parts.append(col_name)
            else:
                if isinstance(col, dict):
                    col_name = col.get('column', '*')
                    func = col.get('function')
                    alias = col.get('alias')
                    
                    if col_name != "*":
                        col_name = self._sanitize_identifier(col_name)
                    
                    if func:
                        if func.upper() not in self.ALLOWED_FUNCTIONS:
                            raise ValueError(f"Function '{func}' is not allowed")
                        if alias:
                            alias = self._sanitize_identifier(alias)
                            select_parts.append(f"{func}({col_name}) AS {alias}")
                        else:
                            select_parts.append(f"{func}({col_name})")
                    else:
                        if alias:
                            alias = self._sanitize_identifier(alias)
                            select_parts.append(f"{col_name} AS {alias}")
                        else:
                            select_parts.append(col_name)
        
        if not select_parts:
            select_parts = ["*"]
        
        return select_parts
    
    def _build_where_clause(self, conditions: List) -> Tuple[str, List]:
        """Build WHERE clause with parameterized values."""
        where_parts = []
        params = []
        
        for condition in conditions:
            col = self._sanitize_identifier(condition.column)
            op = condition.operator
            
            if op not in self.ALLOWED_OPERATORS:
                raise ValueError(f"Operator '{op}' is not allowed")
            
            # Use parameterized queries
            if op == "IN":
                if not isinstance(condition.value, list):
                    raise ValueError("IN operator requires a list of values")
                placeholders = ", ".join(["?" for _ in condition.value])
                where_parts.append(f"{col} IN ({placeholders})")
                params.extend(condition.value)
            else:
                where_parts.append(f"{col} {op} ?")
                params.append(condition.value)
        
        return " AND ".join(where_parts), params
    
    def _build_group_by_clause(self, group_by: List[str]) -> str:
        """Build GROUP BY clause."""
        group_cols = [self._sanitize_identifier(col) for col in group_by]
        return ", ".join(group_cols)
    
    def _build_order_by_clause(self, order_by: List) -> str:
        """Build ORDER BY clause."""
        order_parts = []
        
        for order in order_by:
            col = self._sanitize_identifier(order.column)
            direction = order.direction.upper() if hasattr(order, 'direction') else 'ASC'
            
            if direction not in ['ASC', 'DESC']:
                direction = 'ASC'
            
            order_parts.append(f"{col} {direction}")
        
        return ", ".join(order_parts)
    
    def _sanitize_identifier(self, identifier: str) -> str:
        """
        Sanitize and quote SQL identifiers (table names, column names).
        Supports identifiers with spaces and special characters by properly quoting them.
        Prevents SQL injection by escaping quotes and validating for dangerous patterns.
        """
        if not identifier:
            raise ValueError("Identifier cannot be empty")
            
        dangerous_patterns = [
            r'--',           # SQL comments
            r'/\*',          # Multi-line comment start
            r'\*/',          # Multi-line comment end
            r';',            # Statement terminator
            r'\bDROP\b',     # DROP statements
            r'\bDELETE\b',   # DELETE statements
            r'\bUPDATE\b',   # UPDATE statements
            r'\bINSERT\b',   # INSERT statements
            r'\bEXEC\b',     # EXEC statements
            r'\bEXECUTE\b',  # EXECUTE statements
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, identifier, re.IGNORECASE):
                raise ValueError(f"Invalid identifier: '{identifier}'. Contains dangerous SQL pattern.")
        
        if re.match(r'^[a-zA-Z0-9_\.]+$', identifier):
            return identifier
        
        escaped_identifier = identifier.replace('"', '""')
        return f'"{escaped_identifier}"'
    

