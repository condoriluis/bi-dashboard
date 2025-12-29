from fastapi import APIRouter, BackgroundTasks, HTTPException
from typing import List, Dict
from app.schemas.ai import TrainRequest, PredictionRequest, ModelMetadata
from app.services.ai_service import ai_service

router = APIRouter()

@router.post("/train")
def train_model(request: TrainRequest, background_tasks: BackgroundTasks):
    """
    Starts model training in the background.
    """
    background_tasks.add_task(ai_service.train_model, request)
    return {"message": "Training started", "model_name": request.model_name}

@router.get("/models", response_model=List[ModelMetadata])
def list_models():
    """
    List all trained models with their metadata and metrics.
    """
    return ai_service.list_models()

@router.delete("/models/{model_id}")
def delete_model(model_id: str):
    """
    Delete a trained model and all its artifacts.
    """
    try:
        ai_service.delete_model(model_id)
        return {"message": "Model deleted successfully", "model_id": model_id}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/models/{model_id}/retrain")
def retrain_model(model_id: str, background_tasks: BackgroundTasks):
    """
    Retrains an existing model with the latest data from its dataset.
    """
    try:

        background_tasks.add_task(ai_service.retrain_model, model_id)
        return {"message": "Retraining started", "model_id": model_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict")
def predict(request: PredictionRequest):
    """
    Run prediction on a loaded model.
    """
    try:
        result = ai_service.predict(request.model_id, request.input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/{model_id}/predict/batch")
def predict_batch(model_id: str, input_data: List[Dict]):
    """
    Run batch prediction on a loaded model.
    Accepts a list of dictionaries (rows).
    """
    try:
        results = ai_service.predict_batch(model_id, input_data)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
