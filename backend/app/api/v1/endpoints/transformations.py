from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from app.models.user import User
from app.models.transformation import (
    TransformationCreate,
    TransformationUpdate,
    TransformationResponse,
    TransformationPreview
)
from app.services.transformation_service import transformation_service

router = APIRouter()


@router.post("/", response_model=TransformationResponse, status_code=201)
def create_transformation(
    transformation: TransformationCreate,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Crear una nueva transformación.
    Solo superusers (Admins) pueden crear transformaciones.
    """
    try:
        return transformation_service.create_transformation(transformation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear transformación: {str(e)}")


@router.get("/", response_model=List[TransformationResponse])
def list_transformations(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Listar todas las transformaciones.
    Todos los usuarios autenticados pueden ver transformaciones.
    """
    try:
        return transformation_service.list_transformations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar transformaciones: {str(e)}")


@router.get("/{transformation_id}", response_model=TransformationResponse)
def get_transformation(
    transformation_id: int,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Obtener una transformación por ID.
    """
    transformation = transformation_service.get_transformation(transformation_id)
    if not transformation:
        raise HTTPException(status_code=404, detail="Transformación no encontrada")
    return transformation


@router.put("/{transformation_id}", response_model=TransformationResponse)
def update_transformation(
    transformation_id: int,
    update: TransformationUpdate,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Actualizar una transformación existente.
    Solo superusers (Admins) pueden actualizar transformaciones.
    """
    try:
        transformation = transformation_service.update_transformation(transformation_id, update)
        if not transformation:
            raise HTTPException(status_code=404, detail="Transformación no encontrada")
        return transformation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar transformación: {str(e)}")


@router.delete("/{transformation_id}", status_code=200)
def delete_transformation(
    transformation_id: int,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Eliminar una transformación y su vista.
    Solo superusers (Admins) pueden eliminar transformaciones.
    """
    try:
        success = transformation_service.delete_transformation(transformation_id)
        if not success:
            raise HTTPException(status_code=404, detail="Transformación no encontrada")
        return {"message": "Transformación eliminada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar transformación: {str(e)}")


@router.post("/preview", status_code=200)
def preview_transformation(
    preview: TransformationPreview,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Preview de una transformación sin guardarla.
    Retorna las primeras 100 filas del resultado.
    """
    try:
        data = transformation_service.preview_transformation(
            preview.source_table,
            preview.sql_definition,
            limit=100
        )
        return {"data": data, "count": len(data)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en preview: {str(e)}")


@router.get("/{transformation_id}/data", status_code=200)
def get_transformation_data(
    transformation_id: int,
    limit: int = 1000,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Obtener datos de una transformación existente.
    """
    try:
        data = transformation_service.get_transformation_data(transformation_id, limit)
        return {"data": data, "count": len(data)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos: {str(e)}")
