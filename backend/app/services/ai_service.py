import os
import glob
import json
import uuid
import joblib
import pandas as pd
import numpy as np
import tensorflow as tf
import xgboost as xgb
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, accuracy_score
from app.infra.database import db
from app.schemas.ai import TrainRequest, ModelMetadata

MODELS_DIR = "models"
if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)

class AIService:
    def __init__(self):
        self.models_dir = MODELS_DIR

    def _get_model_path(self, model_id: str):
        return os.path.join(self.models_dir, f"{model_id}.model")

    def _get_metadata_path(self, model_id: str):
        return os.path.join(self.models_dir, f"{model_id}_metadata.json")

    def _get_scaler_path(self, model_id: str):
        return os.path.join(self.models_dir, f"{model_id}_scaler.joblib")

    def _get_scaler_y_path(self, model_id: str):
        return os.path.join(self.models_dir, f"{model_id}_scaler_y.joblib")
    
    def _get_encoders_path(self, model_id: str):
        return os.path.join(self.models_dir, f"{model_id}_encoders.joblib")

    def list_models(self):
        models = []
        for meta_file in glob.glob(os.path.join(self.models_dir, "*_metadata.json")):
            with open(meta_file, "r") as f:
                models.append(json.load(f))
        return models

    def train_model(self, request: TrainRequest):
        model_id = str(uuid.uuid4())
        metadata = ModelMetadata(
            id=model_id,
            name=request.model_name,
            dataset_name=request.dataset_name,
            target_column=request.target_column,
            feature_columns=request.feature_columns,
            model_type=request.model_type or "tensorflow",
            status="training",
            created_at=datetime.now()
        )
        self._save_metadata(metadata)
        self._train_implementation(model_id, request)

    def retrain_model(self, model_id: str):
        # 1. Load existing metadata
        with open(self._get_metadata_path(model_id), "r") as f:
            data = json.load(f)
        
        # 2. Setup request with existing config
        request = TrainRequest(
            model_name=data['name'],
            dataset_name=data['dataset_name'],
            target_column=data['target_column'],
            feature_columns=data['feature_columns'],
            model_type=data.get('model_type', 'tensorflow'), 
            test_size=0.2, # Default
            epochs=50 # Default
        )

        # 3. Update status to training
        metadata = ModelMetadata(**data)
        metadata.status = "training"
        self._save_metadata(metadata)

        # 4. Run training
        self._train_implementation(model_id, request)

    def _train_implementation(self, model_id: str, request: TrainRequest):
        try:
            # 1. Load Data
            conn = db.get_connection()
            try:
                query = f'SELECT * FROM "{request.dataset_name}"'
                df = conn.execute(query).df()
            finally:
                conn.close()

            if len(df) < 10:
                raise ValueError(f"El dataset es demasiado pequeño ({len(df)} filas). Se necesitan al menos 10 filas para entrenar.")

            # 2. Preprocess
            features = df[request.feature_columns].copy()
            target = df[request.target_column].values

            # Handle Datetime Features
            datetime_cols = []
            # We iterate over a copy of columns list because we modify the dataframe
            for col in list(features.select_dtypes(include=['datetime64', 'datetimetz']).columns):
                # Extract cyclical features
                features[f"{col}_month"] = features[col].dt.month
                features[f"{col}_day"] = features[col].dt.day
                features[f"{col}_dow"] = features[col].dt.dayofweek
                
                # Drop original datetime column (it's too high variance / unbounded)
                features.drop(columns=[col], inplace=True)
                
                # Keep track of original datetime columns to apply same logic in predict
                datetime_cols.append(col)
            
            # Save Datetime Columns Info
            joblib.dump(datetime_cols, os.path.join(self.models_dir, f"{model_id}_datetime_cols.joblib"))
            
            encoders = {}
            # Select object and category, BUT EXCLUDE things that might have become numeric above (though select_dtypes handles current state)
            for col in features.select_dtypes(include=['object', 'category']).columns:
                le = LabelEncoder()
                features[col] = le.fit_transform(features[col].astype(str))
                encoders[col] = le
            
            # Save Encoders
            joblib.dump(encoders, self._get_encoders_path(model_id))

            # Save final feature names for prediction alignment
            joblib.dump(features.columns.tolist(), os.path.join(self.models_dir, f"{model_id}_feature_names.joblib"))

            # Scale Features
            scaler = StandardScaler()
            X = scaler.fit_transform(features)
            y = target 
            
            is_classification = False
            # Simple check for task type (Regression vs Classification) based on target type
            if df[request.target_column].dtype == 'object':
                 # It's likely classification
                 is_classification = True
                 le_target = LabelEncoder()
                 y = le_target.fit_transform(y)
                 joblib.dump(le_target, os.path.join(self.models_dir, f"{model_id}_target_encoder.joblib"))
                 output_units = len(np.unique(y))
            else:
                 # Regression - SCALE TARGET for better convergence (only relevant for Neural Nets mostly, but good practice)
                 scaler_y = StandardScaler()
                 y = scaler_y.fit_transform(y.reshape(-1, 1))
                 if isinstance(y, np.ndarray) and request.model_type != 'tensorflow':
                      # Flatten for sklearn/xgboost
                      y = y.ravel()
                 
                 joblib.dump(scaler_y, self._get_scaler_y_path(model_id))
                 output_units = 1

            # Split
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=request.test_size, random_state=42)

            # 3. Build & Train Model based on Type
            model_type = request.model_type or 'tensorflow'
            metric_dict = {}
            trained_model = None

            if model_type == 'random_forest':
                if is_classification:
                    trained_model = RandomForestClassifier(n_estimators=100, random_state=42)
                    trained_model.fit(X_train, y_train)
                    y_pred = trained_model.predict(X_test)
                    metric_dict = {'accuracy': accuracy_score(y_test, y_pred)}
                else:
                    trained_model = RandomForestRegressor(n_estimators=100, random_state=42)
                    trained_model.fit(X_train, y_train)
                    # Metrics calculated after inverse transform below
            
            elif model_type == 'xgboost':
                if is_classification:
                    trained_model = xgb.XGBClassifier(objective='multi:softmax' if output_units > 2 else 'binary:logistic', random_state=42)
                    trained_model.fit(X_train, y_train)
                    y_pred = trained_model.predict(X_test)
                    metric_dict = {'accuracy': accuracy_score(y_test, y_pred)}
                else:
                    trained_model = xgb.XGBRegressor(objective='reg:squarederror', random_state=42)
                    trained_model.fit(X_train, y_train)
                    # Metrics calculated after inverse transform below
            
            elif model_type == 'tensorflow':
                loss_fn = 'sparse_categorical_crossentropy' if output_units > 2 else 'binary_crossentropy'
                if not is_classification:
                    loss_fn = 'mse'

                if len(X_train) < 50:
                    hidden_1 = 16
                    hidden_2 = 8
                    final_epochs = max(request.epochs, 150)
                else:
                    hidden_1 = 64
                    hidden_2 = 32
                    final_epochs = request.epochs
                
                trained_model = tf.keras.models.Sequential([
                    tf.keras.layers.Dense(hidden_1, activation='relu', input_shape=(X_train.shape[1],)),
                    tf.keras.layers.Dense(hidden_2, activation='relu'),
                    tf.keras.layers.Dense(output_units, activation='linear' if not is_classification else 'softmax')  # Linear for regression (even if softmax for multi-class)
                ])

                trained_model.compile(optimizer='adam', loss=loss_fn, metrics=['accuracy'] if is_classification else ['mae'])
                history = trained_model.fit(X_train, y_train, epochs=final_epochs, validation_split=0.1, verbose=0)
                
                if is_classification:
                     eval_metrics = trained_model.evaluate(X_test, y_test, verbose=0)
                     metric_dict = {m: v for m, v in zip(trained_model.metrics_names, eval_metrics)}
                else:
                     metric_dict = {'loss': history.history['loss'][-1]} 
                     # Real MAE calc below

            # 4. Save Artifacts
            if model_type == 'tensorflow':
                 trained_model.save(os.path.join(self.models_dir, f"{model_id}.keras"))
            else:
                 joblib.dump(trained_model, os.path.join(self.models_dir, f"{model_id}.joblib"))
            
            joblib.dump(scaler, self._get_scaler_path(model_id))

            # 5. Calculate Regression Metrics (Common)
            if not is_classification:
                if model_type == 'tensorflow':
                    y_pred_scaled = trained_model.predict(X_test)
                else:
                    y_pred_scaled = trained_model.predict(X_test).reshape(-1, 1) # Ensure 2D for scaler

                y_pred = scaler_y.inverse_transform(y_pred_scaled)
                y_test_real = scaler_y.inverse_transform(y_test.reshape(-1, 1) if model_type != 'tensorflow' else y_test)
                
                real_mae = mean_absolute_error(y_test_real, y_pred)
                metric_dict['mae'] = real_mae

            # 6. Update Metadata
            # Reload metadata to clear status (in case we called from retrain, we want to update existing object)
            with open(self._get_metadata_path(model_id), "r") as f:
                current_meta_dict = json.load(f)
            
            metadata = ModelMetadata(**current_meta_dict)
            metadata.status = "completed"
            metadata.metrics = metric_dict
            
            self._save_metadata(metadata)
            
            print(f"Model {model_id} ({model_type}) trained successfully. Metrics: {metric_dict}")

        except Exception as e:
            # Log error and update status
            print(f"Training failed: {e}")
            try:
                with open(self._get_metadata_path(model_id), "r") as f:
                    current_meta_dict = json.load(f)
                metadata = ModelMetadata(**current_meta_dict)
                metadata.status = "failed"
                metadata.error = str(e)
                self._save_metadata(metadata)
            except:
                pass # If metadata load fails, we can't save error status.
            print(f"Training failed: {e}")

    def predict(self, model_id: str, input_data: dict):
        try:
            # Load metadata to know model type
            with open(self._get_metadata_path(model_id), "r") as f:
                 meta = json.load(f)
                 model_type = meta.get('model_type', 'tensorflow')

            # Load Model
            if model_type == 'tensorflow':
                 model = tf.keras.models.load_model(os.path.join(self.models_dir, f"{model_id}.keras"))
            else:
                 model = joblib.load(os.path.join(self.models_dir, f"{model_id}.joblib"))

            scaler = joblib.load(self._get_scaler_path(model_id))
            encoders = joblib.load(self._get_encoders_path(model_id))
            
            datetime_cols_path = os.path.join(self.models_dir, f"{model_id}_datetime_cols.joblib")
            datetime_cols = []
            if os.path.exists(datetime_cols_path):
                datetime_cols = joblib.load(datetime_cols_path)
            
            # Load final feature names
            feature_names_path = os.path.join(self.models_dir, f"{model_id}_feature_names.joblib")
            if os.path.exists(feature_names_path):
                 final_feature_names = joblib.load(feature_names_path)
            else:
                 # Fallback for old models (might fail if dates involved)
                 final_feature_names = meta['feature_columns']

            # Prepare dataframe
            df = pd.DataFrame([input_data])
            
            # Preprocess Datetime inputs (Expand to Month/Day/Dow)
            for col in datetime_cols:
                if col in df.columns:
                    try:
                        dt_series = pd.to_datetime(df[col])
                        df[f"{col}_month"] = dt_series.dt.month
                        df[f"{col}_day"] = dt_series.dt.day
                        df[f"{col}_dow"] = dt_series.dt.dayofweek
                    except:
                        # Fallback
                        df[f"{col}_month"] = 1
                        df[f"{col}_day"] = 1
                        df[f"{col}_dow"] = 0
                    
                    # Remove original column if it exists to match training
                    if col in df.columns:
                        df.drop(columns=[col], inplace=True)

            # Apply encoders and cast numerics
            for col in df.columns:
                if col in encoders:
                    le = encoders[col]
                    df[col] = df[col].apply(lambda x: le.transform([str(x)])[0] if str(x) in le.classes_ else -1)
                elif col in final_feature_names: # Only numeric check valid features
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Ensure all columns exist and are ordered correctly
            for col in final_feature_names:
                if col not in df.columns:
                    df[col] = 0
            
            df = df[final_feature_names]

            print(f"DEBUG: Input DataFrame:\n{df}")

            # Scale
            X = scaler.transform(df)
            
            # Load metrics for confidence score hint
            mae = 0
            if 'metrics' in meta and meta['metrics']:
                    mae = meta['metrics'].get('mae') or meta['metrics'].get('compile_metrics') or 0

            # Predict
            predictions = model.predict(X)
            
            # Post-process (inverse scale Y if scaler exists - Regression)
            scaler_y_path = self._get_scaler_y_path(model_id)
            if os.path.exists(scaler_y_path):
                 scaler_y = joblib.load(scaler_y_path)
                 if model_type != 'tensorflow':
                      predictions = predictions.reshape(-1, 1)
                 predictions = scaler_y.inverse_transform(predictions)
            
            # Post-process (if classification)
            target_encoder_path = os.path.join(self.models_dir, f"{model_id}_target_encoder.joblib")
            if os.path.exists(target_encoder_path):
                 le_target = joblib.load(target_encoder_path)
                 if model_type == 'tensorflow':
                      predicted_indices = np.argmax(predictions, axis=1)
                 else:
                      predicted_indices = predictions # Sklearn/XGB predict directly classes usually, but here we likely got encoded values if we fitted encoded Y
                      if model_type in ['xgboost', 'random_forest']:
                           predicted_indices = predictions.astype(int)

                 return {"prediction": le_target.inverse_transform(predicted_indices).tolist()[0]}
            
            result_val = float(predictions.flatten().tolist()[0])
            
            return {
                "prediction": result_val,
                "mae": mae,
                "confidence_score": max(0, 1 - (mae / (result_val + 1e-6))) if result_val > 0 else 0
            }
            
        except Exception as e:
            raise Exception(f"Prediction failed: {str(e)}")

    def predict_batch(self, model_id: str, input_data: list):
        try:
            # Load metadata to know model type
            with open(self._get_metadata_path(model_id), "r") as f:
                 meta = json.load(f)
                 model_type = meta.get('model_type', 'tensorflow')

            # Load Model
            if model_type == 'tensorflow':
                 model = tf.keras.models.load_model(os.path.join(self.models_dir, f"{model_id}.keras"))
            else:
                 model = joblib.load(os.path.join(self.models_dir, f"{model_id}.joblib"))

            scaler = joblib.load(self._get_scaler_path(model_id))
            encoders = joblib.load(self._get_encoders_path(model_id))
            
            datetime_cols_path = os.path.join(self.models_dir, f"{model_id}_datetime_cols.joblib")
            datetime_cols = []
            if os.path.exists(datetime_cols_path):
                datetime_cols = joblib.load(datetime_cols_path)
            
            # Load final feature names
            feature_names_path = os.path.join(self.models_dir, f"{model_id}_feature_names.joblib")
            if os.path.exists(feature_names_path):
                 final_feature_names = joblib.load(feature_names_path)
            else:
                 final_feature_names = meta['feature_columns']

            # Prepare dataframe
            df = pd.DataFrame(input_data)
            
            # Preprocess Datetime inputs (Expand to Month/Day/Dow)
            for col in datetime_cols:
                if col in df.columns:
                    try:
                        dt_series = pd.to_datetime(df[col], errors='coerce')
                        df[f"{col}_month"] = dt_series.dt.month.fillna(1).astype(int)
                        df[f"{col}_day"] = dt_series.dt.day.fillna(1).astype(int)
                        df[f"{col}_dow"] = dt_series.dt.dayofweek.fillna(0).astype(int)
                    except:
                        df[f"{col}_month"] = 1
                        df[f"{col}_day"] = 1
                        df[f"{col}_dow"] = 0
                    
                    if col in df.columns:
                        df.drop(columns=[col], inplace=True)

            # Apply encoders and cast numerics
            for col in df.columns:
                if col in encoders:
                    le = encoders[col]
      
                    df[col] = df[col].astype(str).map(lambda x: le.transform([x])[0] if x in le.classes_ else -1).fillna(-1)
                elif col in final_feature_names:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Ensure all columns exist and are ordered correctly
            for col in final_feature_names:
                if col not in df.columns:
                    df[col] = 0
            
            df = df[final_feature_names]

            # Scale
            X = scaler.transform(df)
            
            # Load metrics for confidence score hint
            mae = 0
            if 'metrics' in meta and meta['metrics']:
                    mae = meta['metrics'].get('mae') or meta['metrics'].get('compile_metrics') or 0

            # Predict
            predictions = model.predict(X)
            results = []
            
            # Post-process (inverse scale Y if scaler exists - Regression)
            scaler_y_path = self._get_scaler_y_path(model_id)
            if os.path.exists(scaler_y_path):
                 scaler_y = joblib.load(scaler_y_path)
                 if model_type != 'tensorflow':
                      predictions = predictions.reshape(-1, 1)
                 predictions = scaler_y.inverse_transform(predictions)
            
            # Post-process (if classification)
            target_encoder_path = os.path.join(self.models_dir, f"{model_id}_target_encoder.joblib")
            if os.path.exists(target_encoder_path):
                 le_target = joblib.load(target_encoder_path)
                 if model_type == 'tensorflow':
                      predicted_indices = np.argmax(predictions, axis=1)
                 else:
                      predicted_indices = predictions 
                      if model_type in ['xgboost', 'random_forest']:
                           predicted_indices = predictions.astype(int)
                 
                 decoded_preds = le_target.inverse_transform(predicted_indices)
                 
                 results = []
                 for i, pred in enumerate(decoded_preds):
                     conf = 0.0
                     if model_type == 'tensorflow':
                         conf = float(np.max(predictions[i]))
                     else:
                         conf = 0.8
                     
                     results.append({
                         "prediction": pred,
                         "confidence_score": conf
                     })
                 return results
            
            # Regression Batch Results
            flat_preds = predictions.flatten()
            for val in flat_preds:
                result_val = float(val)
                confidence = max(0, 1 - (mae / (result_val + 1e-6))) if result_val > 0 else 0
                results.append({
                    "prediction": result_val,
                    "mae": mae,
                    "confidence_score": confidence
                })

            return results
            
        except Exception as e:
            raise Exception(f"Batch prediction failed: {str(e)}")

    def _save_metadata(self, metadata: ModelMetadata):
        with open(self._get_metadata_path(metadata.id), "w") as f:
            f.write(metadata.model_dump_json())

    def delete_model(self, model_id: str):
        """
        Delete a model and all its associated files.
        """
        try:
            # Delete model file (check both types)
            model_path_tf = os.path.join(self.models_dir, f"{model_id}.keras")
            model_path_joblib = os.path.join(self.models_dir, f"{model_id}.joblib")
            
            if os.path.exists(model_path_tf): os.remove(model_path_tf)
            if os.path.exists(model_path_joblib): os.remove(model_path_joblib)
            
            # Delete scaler
            scaler_path = self._get_scaler_path(model_id)
            if os.path.exists(scaler_path): os.remove(scaler_path)

            scaler_y_path = self._get_scaler_y_path(model_id)
            if os.path.exists(scaler_y_path): os.remove(scaler_y_path)
            
            # Delete encoders
            encoders_path = self._get_encoders_path(model_id)
            if os.path.exists(encoders_path): os.remove(encoders_path)

            feature_names_path = os.path.join(self.models_dir, f"{model_id}_feature_names.joblib")
            if os.path.exists(feature_names_path): os.remove(feature_names_path)
            
            # Delete target encoder if exists
            target_encoder_path = os.path.join(self.models_dir, f"{model_id}_target_encoder.joblib")
            if os.path.exists(target_encoder_path): os.remove(target_encoder_path)
                
            # Delete datetime info if exists
            datetime_cols_path = os.path.join(self.models_dir, f"{model_id}_datetime_cols.joblib")
            if os.path.exists(datetime_cols_path): os.remove(datetime_cols_path)
            
            # Delete metadata
            metadata_path = self._get_metadata_path(model_id)
            if os.path.exists(metadata_path):
                os.remove(metadata_path)
            else:
                raise Exception(f"Model {model_id} not found")
                
        except Exception as e:
            raise Exception(f"Failed to delete model: {str(e)}")

ai_service = AIService()
