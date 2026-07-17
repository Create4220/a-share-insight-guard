"""Analysis, Claim, Evidence, and RiskHit models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


def generate_uuid():
    return str(uuid.uuid4())


class Analysis(Base, TimestampMixin):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(500), nullable=True)
    original_text = Column(Text, nullable=False)
    security_code = Column(String(50), nullable=True)
    compliance_score = Column(Integer, default=100)
    status = Column(String(50), default="APPROVED")
    risk_level = Column(String(50), default="LOW")
    missing_risk_disclosure = Column(Boolean, default=False)
    missing_evidence = Column(Boolean, default=False)
    submitted_for_review = Column(Boolean, default=False)

    claims = relationship("Claim", back_populates="analysis", cascade="all, delete-orphan")
    risk_hits = relationship("RiskHit", back_populates="analysis", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="analysis", cascade="all, delete-orphan")


class Claim(Base, TimestampMixin):
    __tablename__ = "claims"

    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    text = Column(Text, nullable=False)
    claim_type = Column(String(50), nullable=False)  # FACT, OPINION, FORECAST, GUIDANCE, RISK_DISCLOSURE
    has_evidence = Column(Boolean, default=False)
    confidence = Column(Float, default=0.5)

    analysis = relationship("Analysis", back_populates="claims")


class Evidence(Base, TimestampMixin):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=True)
    source_name = Column(String(500), nullable=False)
    source_url = Column(String(1000), nullable=True)
    credibility = Column(String(10), default="C")  # A, B, C, D
    summary = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=True)

    analysis = relationship("Analysis", back_populates="evidence")


class RiskHit(Base, TimestampMixin):
    __tablename__ = "risk_hits"

    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    rule_id = Column(String, nullable=False)
    rule_name = Column(String(200), nullable=False)
    risk_level = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    matched_text = Column(Text, nullable=True)
    matched_pattern = Column(String(500), nullable=True)

    analysis = relationship("Analysis", back_populates="risk_hits")
