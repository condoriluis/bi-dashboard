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
from sklearn.metrics import mean_absolute_error, accuracy_score, r2_score
from app.infra.database import db
from app.schemas.ai import TrainRequest, ModelMetadata

MODELS_DIR = "models"
if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)

class TrainingProgressCallback(tf.keras.callbacks.Callback):
    def __init__(self, service, model_id, total_epochs):
        super().__init__()
        self.service = service
        self.model_id = model_id
        self.total_epochs = total_epochs
        self.start_progress = 40.0 
        self.end_progress = 95.0   

    def on_epoch_end(self, epoch, logs=None):
        progress = self.start_progress + ((epoch + 1) / self.total_epochs) * (self.end_progress - self.start_progress)
        self.service._update_progress(self.model_id, progress)

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
    
    def _get_target_encoder_path(self, model_id: str):
        return os.path.join(self.models_dir, f"{model_id}_target_encoder.joblib")

    def _update_progress(self, model_id: str, progress: float, status: str = "training", error: str = None):
        try:
            path = self._get_metadata_path(model_id)
            if not os.path.exists(path):
                return
            with open(path, "r") as f:
                data = json.load(f)
            data["progress"] = round(progress, 2)
            data["status"] = status
            if error:
                data["error"] = error
            
            with open(path, "w") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"Error updating progress for {model_id}: {e}")

    def list_models(self):
        models = []
        for meta_file in glob.glob(os.path.join(self.models_dir, "*_metadata.json")):
            try:
                with open(meta_file, "r") as f:
                    models.append(json.load(f))
            except:
                pass
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
            progress=0,
            created_at=datetime.now()
        )
        self._save_metadata(metadata)
        return model_id

    def retrain_model(self, model_id: str):
        metadata_path = self._get_metadata_path(model_id)
        if not os.path.exists(metadata_path):
            raise ValueError("Model not found")
            
        with open(metadata_path, "r") as f:
            data = json.load(f)
        
        request = TrainRequest(
            model_name=data['name'],
            dataset_name=data['dataset_name'],
            target_column=data['target_column'],
            feature_columns=data['feature_columns'],
            model_type=data.get('model_type', 'tensorflow'), 
            test_size=0.2, 
            epochs=data.get('epochs', 10) 
        )

        metadata = ModelMetadata(**data)
        metadata.status = "training"
        metadata.progress = 0
        self._save_metadata(metadata)
        
        return request

    def _determine_problem_type(self, df: pd.DataFrame, target_col: str) -> str:
        """
        Smartly determine if this is a Regression (numeric prediction) or Classification (category prediction) task.
        """
        print(f"DEBUG: Analyzing target column '{target_col}'...")
        
        # 1. Try to convert to numeric, coercing errors to NaN
        target_numeric = pd.to_numeric(df[target_col], errors='coerce')
        valid_numeric_count = target_numeric.notna().sum()
        total_rows = len(df)
        
        # 2. Check unique values
        unique_values = df[target_col].nunique()
        print(f"DEBUG: Unique values: {unique_values}, Valid numeric count: {valid_numeric_count}/{total_rows}")

        # Rule 1: Mostly numeric (>90%) ?
        is_mostly_numeric = valid_numeric_count > (total_rows * 0.9)

        if is_mostly_numeric:
            unique_ratio = unique_values / total_rows if total_rows > 0 else 0
            
            if unique_values > 20 or unique_ratio > 0.05:
                print("DEBUG: Detected REGRESSION (High cardinality numeric)")
                return "regression"
            else:
                print("DEBUG: Detected CLASSIFICATION (Low cardinality numeric)")
                return "classification"
        else:
            # Mostly text -> Classification
            print("DEBUG: Detected CLASSIFICATION (Textual/Categorical)")
            return "classification"

    def _train_implementation(self, model_id: str, request: TrainRequest):
        try:
            # 1. Load Data
            self._update_progress(model_id, 5) 
            conn = db.get_connection()
            try:
                query = f'SELECT * FROM "{request.dataset_name}"'
                df = conn.execute(query).df()
            finally:
                conn.close()

            if len(df) < 10:
                raise ValueError(f"Dataset too small ({len(df)} rows). Need at least 10 rows.")

            # --- OPTIMIZATION: Sampling for Large Datasets ---
            original_size = len(df)
            if len(df) > 50000:
                print(f"Dataset too large ({len(df)} rows). Sampling 50k rows for training.")
                df = df.sample(n=50000, random_state=42)
            
            self._update_progress(model_id, 15) 

            # 2. Detect Problem Type
            problem_type = self._determine_problem_type(df, request.target_column)
            is_classification = (problem_type == "classification")
            
            # Save Problem Type Metadata
            with open(self._get_metadata_path(model_id), "r") as f:
                meta_dict = json.load(f)
            meta_dict['problem_type'] = problem_type
            meta_dict['original_rows'] = original_size
            meta_dict['training_rows'] = len(df)
            with open(self._get_metadata_path(model_id), "w") as f:
                json.dump(meta_dict, f)

            # 3. Preprocess Features
            self._update_progress(model_id, 20)
            
            actual_feature_cols = [c for c in request.feature_columns if c != request.target_column]
            
            features = df[actual_feature_cols].copy()
            target = df[request.target_column].copy()

            # Handle Datetime
            datetime_cols = []
            for col in list(features.select_dtypes(include=['datetime64', 'datetimetz']).columns):
                features[f"{col}_month"] = features[col].dt.month
                features[f"{col}_day"] = features[col].dt.day
                features[f"{col}_dow"] = features[col].dt.dayofweek
                features.drop(columns=[col], inplace=True)
                datetime_cols.append(col)
            
            joblib.dump(datetime_cols, os.path.join(self.models_dir, f"{model_id}_datetime_cols.joblib"))
            
            # Encode Categoricals (inputs)
            encoders = {}
            for col in features.select_dtypes(include=['object', 'category']).columns:
                le = LabelEncoder()
                features[col] = le.fit_transform(features[col].astype(str))
                encoders[col] = le
            
            joblib.dump(encoders, self._get_encoders_path(model_id))
            joblib.dump(features.columns.tolist(), os.path.join(self.models_dir, f"{model_id}_feature_names.joblib"))

            # Scale Features (Inputs) - ALWAYS Scale for best performance
            scaler = StandardScaler()
            X = scaler.fit_transform(features)
            joblib.dump(scaler, self._get_scaler_path(model_id))

            # 4. Preprocess Target
            y = None
            output_units = 1
            
            if is_classification:
                # Classification: Encode labels to 0..N
                le_target = LabelEncoder()
                y = le_target.fit_transform(target.astype(str))
                joblib.dump(le_target, self._get_target_encoder_path(model_id))
                output_units = len(np.unique(y))
            else:
                # Regression: Clean to numeric & Scale
                target_numeric = pd.to_numeric(target, errors='coerce').fillna(0) # Safety fill
                y_reshaped = target_numeric.values.reshape(-1, 1)
                
                scaler_y = StandardScaler()
                y = scaler_y.fit_transform(y_reshaped)
                joblib.dump(scaler_y, self._get_scaler_y_path(model_id))
                
                # Flatten for models that need 1D array
                if request.model_type != 'tensorflow':
                    y = y.ravel()

            # Split
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=request.test_size, random_state=42)
            self._update_progress(model_id, 35)

            # 5. Build & Train
            model_type = request.model_type or 'tensorflow'
            metric_dict = {}
            trained_model = None

            if model_type == 'xgboost':
                if is_classification:
                    trained_model = xgb.XGBClassifier(objective='multi:softmax' if output_units > 2 else 'binary:logistic', random_state=42)
                    self._update_progress(model_id, 40)
                    trained_model.fit(X_train, y_train)
                    y_pred = trained_model.predict(X_test)
                    metric_dict = {'accuracy': accuracy_score(y_test, y_pred)}
                else:
                    trained_model = xgb.XGBRegressor(objective='reg:squarederror', random_state=42)
                    self._update_progress(model_id, 40)
                    trained_model.fit(X_train, y_train)
                    # Metrics calculated later with inverse transform

            elif model_type == 'random_forest':
                if is_classification:
                    trained_model = RandomForestClassifier(n_estimators=100, random_state=42)
                    self._update_progress(model_id, 40)
                    trained_model.fit(X_train, y_train)
                    y_pred = trained_model.predict(X_test)
                    metric_dict = {'accuracy': accuracy_score(y_test, y_pred)}
                else:
                    trained_model = RandomForestRegressor(n_estimators=100, random_state=42)
                    self._update_progress(model_id, 40)
                    trained_model.fit(X_train, y_train)

            elif model_type == 'tensorflow':
                loss_fn = 'sparse_categorical_crossentropy' if output_units > 2 else 'binary_crossentropy'
                if not is_classification:
                    loss_fn = 'mse'

                hidden_1 = 64 if len(df) > 1000 else 32
                hidden_2 = 32 if len(df) > 1000 else 16
                
                trained_model = tf.keras.models.Sequential([
                    tf.keras.layers.Dense(hidden_1, activation='relu', input_shape=(X_train.shape[1],)),
                    tf.keras.layers.Dropout(0.2), # Add dropout for regularization
                    tf.keras.layers.Dense(hidden_2, activation='relu'),
                    tf.keras.layers.Dense(output_units, activation='linear' if not is_classification else 'softmax')
                ])

                trained_model.compile(optimizer='adam', loss=loss_fn, metrics=['accuracy'] if is_classification else ['mae'])
                progress_callback = TrainingProgressCallback(self, model_id, request.epochs)
                
                history = trained_model.fit(
                    X_train, y_train, 
                    epochs=request.epochs, 
                    validation_split=0.1, 
                    verbose=0,
                    callbacks=[progress_callback]
                )

                if is_classification:
                    loss, acc = trained_model.evaluate(X_test, y_test, verbose=0)
                    metric_dict = {'accuracy': acc}

            self._update_progress(model_id, 90)

            # 6. Save Artifacts
            if model_type == 'tensorflow':
                trained_model.save(os.path.join(self.models_dir, f"{model_id}.keras"))
            else:
                joblib.dump(trained_model, os.path.join(self.models_dir, f"{model_id}.joblib"))

            # 7. Calculate REAL Metrics (Inverse Transform)
            if not is_classification:
                # Get raw scaled predictions
                if model_type == 'tensorflow':
                    y_pred_scaled = trained_model.predict(X_test)
                else:
                    y_pred_scaled = trained_model.predict(X_test).reshape(-1, 1)
                
                # Inverse Scale
                y_pred_real = scaler_y.inverse_transform(y_pred_scaled)
                
                # Inverse Scale Test Data (it was flattened/reshaped)
                if model_type != 'tensorflow':
                    y_test_reshaped = y_test.reshape(-1, 1)
                else:
                    y_test_reshaped = y_test
                y_test_real = scaler_y.inverse_transform(y_test_reshaped)

                # Calc Metrics
                mae = mean_absolute_error(y_test_real, y_pred_real)
                r2 = r2_score(y_test_real, y_pred_real)
                
                metric_dict = {
                    'mae': float(mae),
                    'r2': float(r2), 
                    'rmse': float(np.sqrt(mean_absolute_error(y_test_real, y_pred_real)**2)) # Simple approx or real rmse
                }

            # 8. Finish Metadata
            with open(self._get_metadata_path(model_id), "r") as f:
                current_meta_dict = json.load(f)
            
            metadata = ModelMetadata(**current_meta_dict)
            metadata.status = "completed"
            metadata.metrics = metric_dict
            self._save_metadata(metadata)
            
            print(f"Model {model_id} completed. Metrics: {metric_dict}")

        except Exception as e:
            print(f"Training failed: {e}")
            self._update_progress(model_id, 0, "failed", str(e))

    def predict(self, model_id: str, input_data: dict):
        try:
            return self.predict_batch(model_id, [input_data])[0]
        except Exception as e:
            raise Exception(f"Prediction failed: {str(e)}")

    def predict_batch(self, model_id: str, input_data: list):
        try:
            # Load Metadata
            with open(self._get_metadata_path(model_id), "r") as f:
                meta = json.load(f)
            
            model_type = meta.get('model_type', 'tensorflow')
            problem_type = meta.get('problem_type', 'regression') # Default fallback
            
            # Load Model
            if model_type == 'tensorflow':
                model = tf.keras.models.load_model(os.path.join(self.models_dir, f"{model_id}.keras"))
            else:
                model = joblib.load(os.path.join(self.models_dir, f"{model_id}.joblib"))

            # Load Artifacts
            scaler = joblib.load(self._get_scaler_path(model_id))
            encoders = joblib.load(self._get_encoders_path(model_id))
            
            feature_names_path = os.path.join(self.models_dir, f"{model_id}_feature_names.joblib")
            if os.path.exists(feature_names_path):
                final_feature_names = joblib.load(feature_names_path)
            else:
                final_feature_names = meta['feature_columns']

            datetime_cols_path = os.path.join(self.models_dir, f"{model_id}_datetime_cols.joblib")
            datetime_cols = joblib.load(datetime_cols_path) if os.path.exists(datetime_cols_path) else []

            # Prepare DF
            df = pd.DataFrame(input_data)

            # Preprocess Dates
            for col in datetime_cols:
                if col not in df.columns: continue
                try:
                    dt = pd.to_datetime(df[col], errors='coerce')
                    df[f"{col}_month"] = dt.dt.month.fillna(1).astype(int)
                    df[f"{col}_day"] = dt.dt.day.fillna(1).astype(int)
                    df[f"{col}_dow"] = dt.dt.dayofweek.fillna(0).astype(int)
                    df.drop(columns=[col], inplace=True)
                except:
                   pass

            # Preprocess Encoders & Numerics
            for col in df.columns:
                if col in encoders:
                    le = encoders[col]
                    # Handle unseen labels by mapping to -1 or known class
                    df[col] = df[col].astype(str).map(lambda x: le.transform([x])[0] if x in le.classes_ else -1).fillna(-1)
                elif col in final_feature_names:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Align Columns
            for col in final_feature_names:
                if col not in df.columns:
                    df[col] = 0
            df = df[final_feature_names]

            # Scale Input
            X_input = scaler.transform(df)

            # Predict
            raw_preds = model.predict(X_input)
            results = []

            target_encoder_path = self._get_target_encoder_path(model_id)
            scaler_y_path = self._get_scaler_y_path(model_id)
            
            # Force Classification if target encoder exists
            if os.path.exists(target_encoder_path):
                 le_target = joblib.load(target_encoder_path)
                 
                 if model_type == 'tensorflow':
                      # Ensure 2D for argmax
                      if len(raw_preds.shape) == 1:
                           raw_preds = raw_preds.reshape(1, -1)
                      pred_indices = np.argmax(raw_preds, axis=1)
                      confidences = np.max(raw_preds, axis=1)
                 else:
                      pred_indices = raw_preds.astype(int)
                      confidences = [0.8] * len(pred_indices)

                 decoded = le_target.inverse_transform(pred_indices)
                 
                 for i, val in enumerate(decoded):
                     results.append({
                         "prediction": val,
                         "confidence_score": float(confidences[i])
                     })

            # Force Regression if Scaler Y exists OR if neither exists (Legacy Regression defaulting)
            else:
                # REGRESSION
                if os.path.exists(scaler_y_path):
                     scaler_y = joblib.load(scaler_y_path)
                     if model_type != 'tensorflow':
                          raw_preds = raw_preds.reshape(-1, 1)
                     real_preds = scaler_y.inverse_transform(raw_preds).flatten()
                else:
                     # Fallback for old regression models without Y-scaling or raw numeric prediction
                     real_preds = raw_preds.flatten()
                
                # Metrics for confidence context
                mae = meta.get('metrics', {}).get('mae', 0)
                
                for val in real_preds:
                    val = float(val)
                    # Heuristic confidence
                    conf = max(0, 1 - (mae / (abs(val) + 1e-6))) if val != 0 else 0
                    results.append({
                        "prediction": val,
                        "mae": mae,
                        "confidence_score": conf
                    })

            return results

        except Exception as e:
            raise Exception(f"Batch prediction failed: {str(e)}")

    def _save_metadata(self, metadata: ModelMetadata):
        with open(self._get_metadata_path(metadata.id), "w") as f:
            f.write(metadata.model_dump_json())

    def predict_range(self, model_id: str, periods: int, frequency: str = 'D', context_data: dict = None):
        try:
            # 1. Load Metadata & Artifacts
            with open(self._get_metadata_path(model_id), "r") as f:
                meta = json.load(f)
            
            model_type = meta.get('model_type', 'tensorflow')
            # Load Model
            if model_type == 'tensorflow':
                model = tf.keras.models.load_model(os.path.join(self.models_dir, f"{model_id}.keras"))
            else:
                model = joblib.load(os.path.join(self.models_dir, f"{model_id}.joblib"))

            scaler = joblib.load(self._get_scaler_path(model_id))
            
            # Load Scalar Stats if available (for intelligent filling)
            # We can use scaler.mean_ if it exists (for StandardScaler)
            feature_means = {}
            if hasattr(scaler, 'mean_'):
                # We need feature names to map index to name
                 feature_names_path = os.path.join(self.models_dir, f"{model_id}_feature_names.joblib")
                 if os.path.exists(feature_names_path):
                     feat_names = joblib.load(feature_names_path)
                     for i, name in enumerate(feat_names):
                         feature_means[name] = scaler.mean_[i]

            datetime_cols_path = os.path.join(self.models_dir, f"{model_id}_datetime_cols.joblib")
            datetime_cols = joblib.load(datetime_cols_path) if os.path.exists(datetime_cols_path) else []
            
            # Relaxed check: If no datetime_cols, try to guess from feature columns or proceed without
            date_col = None
            if datetime_cols:
                date_col = datetime_cols[0]
            else:
                 # Try to find a column with 'date', 'fecha', 'time' in name case-insensitive
                for feat in meta['feature_columns']:
                    if any(x in feat.lower() for x in ['date', 'fecha', 'time', 'year', 'month', 'dia', 'anio', 'mes']):
                        date_col = feat
                        break
            
            # 2. Generate Future Dates
            last_date = datetime.now() 
            future_dates = pd.date_range(start=last_date, periods=periods + 1, freq=frequency)[1:] 
            
            data_rows = []
            for date in future_dates:
                row = context_data.copy() if context_data else {}
                
                # Fill Missing with Mean or 0
                for feat in meta['feature_columns']:
                    if feat == meta['target_column']: continue
                    if feat in row: continue
                    
                    # If this seems to be the date column, inject the date
                    if feat == date_col:
                        # If model expects distinct components (Year, Month), they are usually not in feature_columns list as 'Fecha'
                        # but as 'Fecha_year', 'Fecha_month' etc if preprocessed.
                        # If 'Fecha' is in feature_columns, it implies raw string/date input is expected.
                        row[feat] = date
                    elif feat in datetime_cols: 
                        row[feat] = date
                    else:
                        row[feat] = feature_means.get(feat, 0)
                
                data_rows.append(row)
            
            # 3. Predict Batch
            predictions = self.predict_batch(model_id, data_rows)
            
            # 4. Format for Chart
            formatted_results = []
            for i, pred in enumerate(predictions):
                # Calculate Confidence Interval (heuristic)
                # If we have MAE, usage +/- MAE as 70% CI, and +/- 2*MAE as 95%
                mae = pred.get('mae', 0)
                val = pred['prediction']
                
                lower_bound = val
                upper_bound = val
                
                # Try to cast to float for CI calculation
                try:
                    num_val = float(val)
                    if isinstance(mae, (int, float)):
                        lower_bound = num_val - mae
                        upper_bound = num_val + mae
                except (ValueError, TypeError):
                    # Value is not numeric (Classification label), cannot compute range
                    pass

                formatted_results.append({
                    "date": future_dates[i].isoformat(),
                    "prediction": val,
                    "lower_bound": lower_bound,
                    "upper_bound": upper_bound,
                    "confidence_score": pred['confidence_score']
                })
                
            return formatted_results

        except Exception as e:
            raise Exception(f"Range prediction failed: {str(e)}")

    def delete_model(self, model_id: str):
        try:
            for ext in ['.keras', '.joblib', '_scaler.joblib', '_scaler_y.joblib', '_encoders.joblib', 
                       '_target_encoder.joblib', '_feature_names.joblib', '_datetime_cols.joblib', '_metadata.json']:
                path = os.path.join(self.models_dir, f"{model_id}{ext}")
                if os.path.exists(path):
                    os.remove(path)
        except Exception as e:
            raise Exception(f"Failed to delete model: {str(e)}")

ai_service = AIService()
