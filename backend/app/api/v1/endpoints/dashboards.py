from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from app.models.user import User
from app.models.dashboard import (
    Dashboard,
    DashboardCreate,
    DashboardLayoutUpdate
)
from app.services.dashboard_service import dashboard_service

router = APIRouter()

@router.post("/", response_model=Dashboard, status_code=201)
def create_dashboard(
    dashboard: DashboardCreate,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Crear un nuevo dashboard.
    """
    try:
        return dashboard_service.create_dashboard(dashboard)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear dashboard: {str(e)}")

@router.get("/", response_model=List[Dashboard])
def list_dashboards(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Listar todos los dashboards.
    """
    try:
        return dashboard_service.list_dashboards()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar dashboards: {str(e)}")

@router.get("/{dashboard_id}", response_model=Dashboard)
def get_dashboard(
    dashboard_id: str,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Obtener un dashboard por ID.
    """
    dashboard = dashboard_service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard no encontrado")
    return dashboard

@router.put("/{dashboard_id}/layout", response_model=Dashboard)
def update_dashboard_layout(
    dashboard_id: str,
    layout: DashboardLayoutUpdate,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Actualizar el layout (widgets) de un dashboard.
    Reemplaza todos los items existentes con los nuevos.
    """
    try:
        return dashboard_service.update_dashboard_layout(dashboard_id, layout)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar layout: {str(e)}")

@router.put("/{dashboard_id}", response_model=Dashboard)
def update_dashboard(
    dashboard_id: str,
    dashboard: DashboardCreate,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Actualizar metadatos de un dashboard (nombre y descripción).
    """
    try:
        return dashboard_service.update_dashboard(dashboard_id, dashboard)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar dashboard: {str(e)}")

@router.delete("/{dashboard_id}", status_code=204)
def delete_dashboard(
    dashboard_id: str,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> None:
    """
    Eliminar un dashboard y todos sus widgets.
    """
    try:
        dashboard_service.delete_dashboard(dashboard_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar dashboard: {str(e)}")
