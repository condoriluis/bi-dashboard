from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TransformationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre único de la transformación")
    description: Optional[str] = Field(None, max_length=500, description="Descripción de la transformación")
    source_table: str = Field(..., min_length=1, description="Tabla o vista origen")
    sql_definition: str = Field(..., min_length=1, description="Definición SQL de la vista")
    dashboard_id: Optional[str] = Field(None, description="ID del dashboard asociado")


class TransformationCreate(TransformationBase):
    """Schema para crear una nueva transformación"""
    pass


class TransformationUpdate(BaseModel):
    """Schema para actualizar una transformación existente"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    source_table: Optional[str] = Field(None, min_length=1)
    sql_definition: Optional[str] = Field(None, min_length=1)


class TransformationResponse(TransformationBase):
    """Schema de respuesta con metadatos completos"""
    id: int
    dashboard_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransformationPreview(BaseModel):
    """Schema para preview de transformación sin guardar"""
    source_table: str
    sql_definition: str
