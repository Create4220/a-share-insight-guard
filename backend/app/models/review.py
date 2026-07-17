"""Review task and decision models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


def generate_uuid():
    return str(uuid.uuid4())


class ReviewTask(Base, TimestampMixin):
    __tablename__ = "review_tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    task_number = Column(String(50), unique=True, nullable=False)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=True)
    title = Column(String(500), nullable=False)
    security_code = Column(String(50), nullable=True)
    compliance_score = Column(Integer, default=100)
    risk_level = Column(String(50), default="LOW")
    status = Column(String(50), default="NEEDS_MANUAL_REVIEW")
    reviewer = Column(String(100), nullable=True, default="compliance.reviewer")

    decisions = relationship("ReviewDecision", back_populates="review_task", cascade="all, delete-orphan")


class ReviewDecision(Base, TimestampMixin):
    __tablename__ = "review_decisions"

    id = Column(String, primary_key=True, default=generate_uuid)
    task_id = Column(String, ForeignKey("review_tasks.id"), nullable=False)
    action = Column(String(50), nullable=False)  # APPROVE, REJECT, BLOCK, REQUEST_EVIDENCE
    comment = Column(Text, nullable=False)
    operator = Column(String(100), default="compliance.reviewer")
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)

    review_task = relationship("ReviewTask", back_populates="decisions")
