from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class TrainRequest(BaseModel):
    dataset_name: str
    target_column: str
    feature_columns: List[str]
    model_name: str
    model_type: Optional[str] = "tensorflow" # 'random_forest', 'xgboost', 'tensorflow'
    epochs: Optional[int] = 10
    test_size: Optional[float] = 0.2

class PredictionRequest(BaseModel):
    model_id: str
    input_data: Dict[str, Any]

class PredictRangeRequest(BaseModel):
    # model_id is in path, not needed in body
    periods: int = 7
    frequency: str = "D" # D, M, H
    # Optional context for non-date features. 
    # If not provided, will use mean/mode from training (if avail) or 0
    context_data: Optional[Dict[str, Any]] = None

class ModelMetadata(BaseModel):
    id: str
    name: str
    dataset_name: str
    target_column: str
    feature_columns: List[str]
    model_type: Optional[str] = "tensorflow"
    status: str  # 'training', 'completed', 'failed'
    progress: float = 0
    created_at: datetime
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None
