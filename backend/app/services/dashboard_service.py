import uuid
from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    Alert,
    AttackDetectionResult,
    IndicatorOfCompromise,
    Investigation,
    MLModel,
    PacketLog,
    SystemActivity,
    UploadedDataset,
)


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_stats(self) -> dict:
        total_packets = self.db.query(func.count(PacketLog.id)).scalar() or 0
        malicious = self.db.query(func.count(PacketLog.id)).filter(PacketLog.is_attack == True).scalar() or 0
        normal = self.db.query(func.count(PacketLog.id)).filter(PacketLog.is_attack == False).scalar() or 0

        active_model = self.db.query(MLModel).filter(MLModel.is_active == True).first()
        accuracy = active_model.accuracy if active_model else None

        active_alerts = self.db.query(func.count(Alert.id)).filter(Alert.status == "unresolved").scalar() or 0
        total_datasets = self.db.query(func.count(UploadedDataset.id)).scalar() or 0
        total_models = self.db.query(func.count(MLModel.id)).scalar() or 0

        attack_ratio = (malicious / total_packets * 100) if total_packets else 0
        alert_factor = min(active_alerts * 5, 30)
        threat_score = min(int(attack_ratio * 0.7 + alert_factor), 100)

        timeline = self._packet_timeline()
        network_activity = self._network_activity()
        recent_incidents = self._recent_incidents()
        protocol_distribution = self._protocol_distribution()
        attack_frequency = self._attack_frequency()

        return {
            "total_packets": total_packets,
            "normal_packets": normal,
            "malicious_packets": malicious,
            "detection_accuracy": round(accuracy * 100, 2) if accuracy else None,
            "active_alerts": active_alerts,
            "threat_score": threat_score,
            "total_datasets": total_datasets,
            "total_models": total_models,
            "system_status": "operational",
            "packet_timeline": timeline,
            "network_activity": network_activity,
            "recent_incidents": recent_incidents,
            "protocol_distribution": protocol_distribution,
            "attack_frequency": attack_frequency,
        }

    def _packet_timeline(self) -> list[dict]:
        packets = (
            self.db.query(PacketLog.timestamp, PacketLog.is_attack)
            .filter(PacketLog.timestamp.isnot(None))
            .order_by(PacketLog.timestamp)
            .limit(500)
            .all()
        )
        buckets: dict[str, dict] = defaultdict(lambda: {"normal": 0, "attack": 0})
        for ts, is_attack in packets:
            key = ts.strftime("%H:%M") if ts else "unknown"
            if is_attack:
                buckets[key]["attack"] += 1
            else:
                buckets[key]["normal"] += 1
        return [{"time": k, **v} for k, v in sorted(buckets.items())]

    def _network_activity(self) -> list[dict]:
        rows = (
            self.db.query(PacketLog.transmission_rate, PacketLog.time_delay, PacketLog.is_attack)
            .limit(100)
            .all()
        )
        return [
            {
                "rate": r or 0,
                "delay": d or 0,
                "attack": 1 if a else 0,
            }
            for r, d, a in rows
        ]

    def _recent_incidents(self) -> list[dict]:
        alerts = (
            self.db.query(Alert)
            .order_by(Alert.triggered_at.desc())
            .limit(5)
            .all()
        )
        return [{
            "id": str(a.id),
            "severity": a.severity,
            "attack_type": a.attack_type,
            "message": a.message,
            "status": a.status,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
        } for a in alerts]

    def _protocol_distribution(self) -> list[dict]:
        rows = (
            self.db.query(PacketLog.protocol, func.count(PacketLog.id))
            .group_by(PacketLog.protocol)
            .all()
        )
        return [{"protocol": p or "Unknown", "count": c} for p, c in rows]

    def _attack_frequency(self) -> list[dict]:
        rows = (
            self.db.query(PacketLog.attack_type, func.count(PacketLog.id))
            .filter(PacketLog.is_attack == True)
            .group_by(PacketLog.attack_type)
            .all()
        )
        return [{"attack_type": t or "Unknown", "count": c} for t, c in rows]


class ForensicsService:
    def __init__(self, db: Session):
        self.db = db

    def investigate(self, dataset_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        packets = self.db.query(PacketLog).filter(PacketLog.dataset_id == dataset_id).all()
        if not packets:
            raise ValueError("No packet data for forensics")

        attack_packets = [p for p in packets if p.is_attack]
        attack_ratio = len(attack_packets) / len(packets)
        threat_score = min(int(attack_ratio * 100 + len(attack_packets) * 0.5), 100)

        investigation = Investigation(
            dataset_id=dataset_id,
            created_by=user_id,
            title=f"Forensic Investigation - Dataset {str(dataset_id)[:8]}",
            status="in_progress",
            threat_score=threat_score,
            summary=f"Analysis of {len(packets)} packets revealed {len(attack_packets)} malicious entries.",
            forensic_notes="Automated forensic scan completed. Review IoCs and timeline for attack sequence reconstruction.",
        )
        self.db.add(investigation)
        self.db.flush()

        iocs = self._extract_iocs(investigation.id, attack_packets)
        timeline = self._build_timeline(attack_packets)
        protocol_analysis = self._protocol_analysis(packets)
        top_ips = self._top_attacking_ips(attack_packets)

        investigation.status = "closed"
        investigation.closed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(investigation)

        return {
            "investigation": investigation,
            "timeline": timeline,
            "iocs": iocs,
            "protocol_analysis": protocol_analysis,
            "packet_inspection_summary": {
                "total_packets": len(packets),
                "attack_packets": len(attack_packets),
                "normal_packets": len(packets) - len(attack_packets),
                "unique_source_ips": len({p.source_ip for p in packets if p.source_ip}),
                "protocols_observed": len({p.protocol for p in packets if p.protocol}),
            },
            "top_attacking_ips": top_ips,
        }

    def _extract_iocs(self, investigation_id: uuid.UUID, attack_packets: list) -> list:
        iocs = []

        ip_counter = Counter(p.source_ip for p in attack_packets if p.source_ip)
        for ip, count in ip_counter.most_common(10):
            ioc = IndicatorOfCompromise(
                investigation_id=investigation_id,
                ioc_type="ip",
                value=ip,
                severity="critical" if count > 50 else "medium" if count > 10 else "low",
                occurrence_count=count,
                description=f"Suspicious source IP observed in {count} attack packets",
            )
            self.db.add(ioc)
            iocs.append(ioc)

        mac_counter = Counter(p.mac_address for p in attack_packets if p.mac_address)
        for mac, count in mac_counter.most_common(5):
            ioc = IndicatorOfCompromise(
                investigation_id=investigation_id,
                ioc_type="mac",
                value=mac,
                severity="medium",
                occurrence_count=count,
                description=f"Rogue MAC address detected in attack traffic",
            )
            self.db.add(ioc)
            iocs.append(ioc)

        proto_counter = Counter(p.protocol for p in attack_packets if p.protocol)
        for proto, count in proto_counter.most_common(5):
            ioc = IndicatorOfCompromise(
                investigation_id=investigation_id,
                ioc_type="protocol",
                value=proto,
                severity="low",
                occurrence_count=count,
                description=f"Protocol {proto} overrepresented in attack traffic",
            )
            self.db.add(ioc)
            iocs.append(ioc)

        self.db.flush()
        return iocs

    def _build_timeline(self, attack_packets: list) -> list[dict]:
        sorted_packets = sorted(
            [p for p in attack_packets if p.timestamp],
            key=lambda x: x.timestamp,
        )
        buckets: dict[str, dict] = defaultdict(lambda: {"count": 0, "types": Counter()})
        for p in sorted_packets:
            key = p.timestamp.strftime("%Y-%m-%d %H:%M")
            buckets[key]["count"] += 1
            buckets[key]["types"][p.attack_type or "Unknown"] += 1

        return [{
            "timestamp": k,
            "attack_count": v["count"],
            "dominant_attack": v["types"].most_common(1)[0][0] if v["types"] else "Unknown",
        } for k, v in sorted(buckets.items())]

    def _protocol_analysis(self, packets: list) -> list[dict]:
        total_by_proto = Counter(p.protocol for p in packets if p.protocol)
        attack_by_proto = Counter(p.protocol for p in packets if p.is_attack and p.protocol)
        result = []
        for proto, total in total_by_proto.items():
            attacks = attack_by_proto.get(proto, 0)
            result.append({
                "protocol": proto,
                "total": total,
                "attacks": attacks,
                "attack_rate": round(attacks / total * 100, 2) if total else 0,
            })
        return sorted(result, key=lambda x: x["attacks"], reverse=True)

    def _top_attacking_ips(self, attack_packets: list) -> list[dict]:
        counter = Counter(p.source_ip for p in attack_packets if p.source_ip)
        return [{"ip": ip, "count": count} for ip, count in counter.most_common(10)]
