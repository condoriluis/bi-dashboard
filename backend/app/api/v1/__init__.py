from fastapi import APIRouter
from app.api.v1.endpoints import auth, datasets, sql, dashboards, transformations

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
router.include_router(sql.router, prefix="/sql", tags=["sql"])
router.include_router(dashboards.router, prefix="/dashboards", tags=["dashboards"])
router.include_router(transformations.router, prefix="/transformations", tags=["transformations"])
