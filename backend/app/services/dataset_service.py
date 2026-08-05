import os
import uuid
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import PacketLog, UploadedDataset
from ml.data_loader import load_csv

settings = get_settings()


class DatasetService:
    def __init__(self, db: Session):
        self.db = db

    def save_upload(self, user_id: uuid.UUID, filename: str, content: bytes, file_type: str) -> UploadedDataset:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        stored_name = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

        with open(file_path, "wb") as f:
            f.write(content)

        dataset = UploadedDataset(
            user_id=user_id,
            filename=stored_name,
            original_filename=filename,
            file_type=file_type,
            file_path=file_path,
            file_size_bytes=len(content),
            status="uploaded",
        )
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def analyze_dataset(self, dataset_id: uuid.UUID) -> UploadedDataset:
        dataset = self.db.query(UploadedDataset).filter(UploadedDataset.id == dataset_id).first()
        if not dataset:
            raise ValueError("Dataset not found")

        if dataset.file_type == "pcap":
            dataset.status = "failed"
            dataset.error_message = "PCAP parsing is not yet implemented. Please upload CSV format."
            self.db.commit()
            return dataset

        dataset.status = "processing"
        self.db.commit()

        try:
            self.db.query(PacketLog).filter(PacketLog.dataset_id == dataset_id).delete()

            df = load_csv(dataset.file_path)
            packets = []

            for _, row in df.iterrows():
                ts = None
                if "timestamp" in df.columns and pd.notna(row.get("timestamp")):
                    try:
                        ts = pd.to_datetime(row["timestamp"]).to_pydatetime()
                    except Exception:
                        ts = None

                is_attack = None
                if "is_attack" in df.columns and pd.notna(row.get("is_attack")):
                    is_attack = bool(int(row["is_attack"]))

                packets.append(PacketLog(
                    dataset_id=dataset.id,
                    timestamp=ts,
                    source_ip=str(row.get("source_ip")) if pd.notna(row.get("source_ip")) else None,
                    dest_ip=str(row.get("dest_ip")) if pd.notna(row.get("dest_ip")) else None,
                    protocol=str(row.get("protocol")) if pd.notna(row.get("protocol")) else None,
                    packet_size=int(row["packet_size"]) if pd.notna(row.get("packet_size")) else None,
                    time_delay=float(row["time_delay"]) if pd.notna(row.get("time_delay")) else None,
                    transmission_rate=float(row["transmission_rate"]) if pd.notna(row.get("transmission_rate")) else None,
                    mac_address=str(row.get("mac_address")) if pd.notna(row.get("mac_address")) else None,
                    is_attack=is_attack,
                    attack_type=str(row.get("attack_type")) if pd.notna(row.get("attack_type")) else None,
                ))

            self.db.bulk_save_objects(packets)
            dataset.row_count = len(packets)
            dataset.status = "ready"
            dataset.error_message = None
            self.db.commit()
            self.db.refresh(dataset)
            return dataset

        except Exception as exc:
            dataset.status = "failed"
            dataset.error_message = str(exc)
            self.db.commit()
            raise

    def get_datasets(self, user_id: uuid.UUID | None = None) -> list[UploadedDataset]:
        q = self.db.query(UploadedDataset).order_by(UploadedDataset.uploaded_at.desc())
        if user_id:
            q = q.filter(UploadedDataset.user_id == user_id)
        return q.all()

    def get_packets(
        self,
        dataset_id: uuid.UUID,
        page: int = 1,
        page_size: int = 50,
        search: str | None = None,
        protocol: str | None = None,
        attack_only: bool | None = None,
        sort_by: str = "id",
        sort_order: str = "asc",
    ) -> tuple[list[PacketLog], int]:
        q = self.db.query(PacketLog).filter(PacketLog.dataset_id == dataset_id)

        if search:
            like = f"%{search}%"
            q = q.filter(
                (PacketLog.source_ip.ilike(like))
                | (PacketLog.dest_ip.ilike(like))
                | (PacketLog.protocol.ilike(like))
                | (PacketLog.attack_type.ilike(like))
            )

        if protocol:
            q = q.filter(PacketLog.protocol == protocol)

        if attack_only is True:
            q = q.filter(PacketLog.is_attack == True)
        elif attack_only is False:
            q = q.filter(PacketLog.is_attack == False)

        total = q.count()

        sort_col = getattr(PacketLog, sort_by, PacketLog.id)
        if sort_order == "desc":
            q = q.order_by(sort_col.desc())
        else:
            q = q.order_by(sort_col.asc())

        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def get_dataframe(self, dataset_id: uuid.UUID) -> pd.DataFrame:
        packets = self.db.query(PacketLog).filter(PacketLog.dataset_id == dataset_id).all()
        rows = [{
            "packet_size": p.packet_size or 0,
            "time_delay": p.time_delay or 0,
            "transmission_rate": p.transmission_rate or 0,
            "is_attack": int(p.is_attack) if p.is_attack is not None else None,
            "source_ip": p.source_ip,
            "protocol": p.protocol,
            "attack_type": p.attack_type,
            "timestamp": p.timestamp,
            "mac_address": p.mac_address,
        } for p in packets]
        return pd.DataFrame(rows)
