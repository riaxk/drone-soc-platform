import os
import uuid

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Alert, AttackDetectionResult, MLModel, PacketLog
from app.services.dataset_service import DatasetService
from ml.model_manager import create_predictor, create_trainer, generate_model_filename, load_model, save_model

settings = get_settings()


class MLService:
    def __init__(self, db: Session):
        self.db = db
        self.dataset_service = DatasetService(db)

    def train_model(
        self,
        dataset_id: uuid.UUID,
        user_id: uuid.UUID,
        model_type: str = "RandomForest",
        n_estimators: int = 50,
        name: str | None = None,
    ) -> tuple[MLModel, dict]:
        dataset = self.db.query(__import__("app.models", fromlist=["UploadedDataset"]).UploadedDataset).filter_by(id=dataset_id).first()
        if not dataset or dataset.status != "ready":
            raise ValueError("Dataset not ready for training")

        df = self.dataset_service.get_dataframe(dataset_id)
        if df.empty or "is_attack" not in df.columns or df["is_attack"].isna().all():
            raise ValueError("Dataset must contain labeled is_attack column for training")

        df = df.dropna(subset=["is_attack"])

        trainer = create_trainer(model_type, n_estimators)
        metrics = trainer.train(df)

        os.makedirs(settings.MODEL_DIR, exist_ok=True)
        filename = generate_model_filename(model_type)
        model_path = os.path.join(settings.MODEL_DIR, filename)
        save_model(trainer.sklearn_model, model_path)

        self.db.query(MLModel).update({MLModel.is_active: False})

        ml_model = MLModel(
            name=name or f"{model_type} - {dataset.original_filename}",
            model_type=model_type,
            file_path=model_path,
            accuracy=metrics["accuracy"],
            precision_score=metrics["precision"],
            recall_score=metrics["recall"],
            f1_score=metrics["f1_score"],
            hyperparameters=metrics["hyperparameters"],
            feature_columns=metrics["feature_columns"],
            trained_by=user_id,
            is_active=True,
        )
        self.db.add(ml_model)
        self.db.commit()
        self.db.refresh(ml_model)
        return ml_model, metrics

    def get_models(self) -> list[MLModel]:
        return self.db.query(MLModel).order_by(MLModel.trained_at.desc()).all()

    def get_active_model(self) -> MLModel | None:
        return self.db.query(MLModel).filter(MLModel.is_active == True).first()

    def predict(
        self,
        dataset_id: uuid.UUID,
        model_id: uuid.UUID | None = None,
        threshold: float = 0.5,
    ) -> dict:
        model_record = None
        if model_id:
            model_record = self.db.query(MLModel).filter(MLModel.id == model_id).first()
        else:
            model_record = self.get_active_model()

        if not model_record:
            raise ValueError("No trained model available")

        sklearn_model = load_model(model_record.file_path)
        predictor = create_predictor(sklearn_model)

        df = self.dataset_service.get_dataframe(dataset_id)
        packets = self.db.query(PacketLog).filter(PacketLog.dataset_id == dataset_id).order_by(PacketLog.id).all()

        if df.empty:
            raise ValueError("No packets to predict")

        result = predictor.predict(df)

        self.db.query(AttackDetectionResult).filter(
            AttackDetectionResult.dataset_id == dataset_id,
            AttackDetectionResult.model_id == model_record.id,
        ).delete()

        alerts_created = 0
        for i, packet in enumerate(packets):
            predicted = bool(result["predictions"][i])
            confidence = result["confidence"][i] if result["confidence"] else None

            self.db.add(AttackDetectionResult(
                dataset_id=dataset_id,
                model_id=model_record.id,
                packet_log_id=packet.id,
                predicted_attack=predicted,
                confidence=confidence,
            ))

            if predicted and confidence and confidence >= threshold:
                severity = "critical" if confidence >= 0.85 else "medium" if confidence >= 0.65 else "low"
                self.db.add(Alert(
                    dataset_id=dataset_id,
                    severity=severity,
                    attack_type=packet.attack_type or "Anomaly Detected",
                    message=f"ML detected suspicious packet from {packet.source_ip or 'unknown'} via {packet.protocol or 'unknown protocol'}",
                ))
                alerts_created += 1

        self.db.commit()

        return {
            "model_id": model_record.id,
            "total_predictions": len(result["predictions"]),
            "attack_count": result["attack_count"],
            "normal_count": result["normal_count"],
            "alerts_created": alerts_created,
        }
