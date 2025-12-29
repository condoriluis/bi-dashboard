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

class ModelMetadata(BaseModel):
    id: str
    name: str
    dataset_name: str
    target_column: str
    feature_columns: List[str]
    model_type: Optional[str] = "tensorflow"
    status: str  # 'training', 'completed', 'failed'
    created_at: datetime
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None
