import os
import uuid
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Investigation, IndicatorOfCompromise, MLModel, PacketLog, Report, UploadedDataset

settings = get_settings()


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def generate_report(self, investigation_id: uuid.UUID, user_id: uuid.UUID) -> Report:
        investigation = self.db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not investigation:
            raise ValueError("Investigation not found")

        dataset = self.db.query(UploadedDataset).filter(UploadedDataset.id == investigation.dataset_id).first()
        iocs = self.db.query(IndicatorOfCompromise).filter(
            IndicatorOfCompromise.investigation_id == investigation_id
        ).all()
        active_model = self.db.query(MLModel).filter(MLModel.is_active == True).first()
        packets = self.db.query(PacketLog).filter(PacketLog.dataset_id == investigation.dataset_id).all()
        attack_count = sum(1 for p in packets if p.is_attack)

        os.makedirs(settings.REPORT_DIR, exist_ok=True)
        filename = f"forensic_report_{investigation_id}.pdf"
        file_path = os.path.join(settings.REPORT_DIR, filename)

        doc = SimpleDocTemplate(file_path, pagesize=A4, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, spaceAfter=20, textColor=colors.HexColor("#2563EB"))
        heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=14, spaceAfter=10, spaceBefore=15)
        body_style = styles["Normal"]

        story = []
        story.append(Paragraph("Drone Network Traffic Analysis & Forensics Report", title_style))
        story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", body_style))
        story.append(Spacer(1, 20))

        story.append(Paragraph("1. Executive Summary", heading_style))
        story.append(Paragraph(
            f"This report documents the forensic investigation of UAV network traffic dataset "
            f"'{dataset.original_filename if dataset else 'N/A'}'. "
            f"A total of {len(packets)} packets were analyzed, with {attack_count} identified as malicious. "
            f"The threat score is {investigation.threat_score}/100.",
            body_style,
        ))

        story.append(Paragraph("2. Dataset Information", heading_style))
        ds_data = [
            ["Filename", dataset.original_filename if dataset else "N/A"],
            ["Total Packets", str(len(packets))],
            ["Attack Packets", str(attack_count)],
            ["Status", dataset.status if dataset else "N/A"],
        ]
        t = Table(ds_data, colWidths=[2 * inch, 4 * inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#111827")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t)

        story.append(Paragraph("3. ML Detection Results", heading_style))
        if active_model:
            ml_data = [
                ["Model", active_model.name],
                ["Accuracy", f"{(active_model.accuracy or 0) * 100:.2f}%"],
                ["Precision", f"{(active_model.precision_score or 0) * 100:.2f}%"],
                ["Recall", f"{(active_model.recall_score or 0) * 100:.2f}%"],
                ["F1 Score", f"{(active_model.f1_score or 0) * 100:.2f}%"],
            ]
            t2 = Table(ml_data, colWidths=[2 * inch, 4 * inch])
            t2.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#111827")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(t2)
        else:
            story.append(Paragraph("No active ML model available.", body_style))

        story.append(Paragraph("4. Indicators of Compromise", heading_style))
        if iocs:
            ioc_data = [["Type", "Value", "Severity", "Count"]]
            for ioc in iocs[:20]:
                ioc_data.append([ioc.ioc_type, ioc.value[:40], ioc.severity, str(ioc.occurrence_count)])
            t3 = Table(ioc_data, colWidths=[1 * inch, 2.5 * inch, 1 * inch, 0.8 * inch])
            t3.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(t3)
        else:
            story.append(Paragraph("No IoCs identified.", body_style))

        story.append(Paragraph("5. Recommendations", heading_style))
        recommendations = [
            "Implement network segmentation for UAV control channels.",
            "Deploy continuous ML-based anomaly detection on telemetry streams.",
            "Enable encrypted MAVLink communications with authentication.",
            "Maintain packet capture logs for post-incident forensic analysis.",
            "Block identified malicious IP addresses at the network perimeter.",
        ]
        for rec in recommendations:
            story.append(Paragraph(f"• {rec}", body_style))

        story.append(Paragraph("6. Conclusion", heading_style))
        story.append(Paragraph(
            investigation.summary or "Investigation completed successfully.",
            body_style,
        ))

        doc.build(story)

        report = Report(
            investigation_id=investigation_id,
            generated_by=user_id,
            file_path=file_path,
            title=f"Forensic Report - {investigation.title}",
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def get_reports(self) -> list[Report]:
        return self.db.query(Report).order_by(Report.generated_at.desc()).all()
