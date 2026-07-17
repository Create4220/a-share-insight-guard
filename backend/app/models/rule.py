"""Compliance rule model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text, Boolean, JSON

from app.models.base import Base, TimestampMixin


def generate_uuid():
    return str(uuid.uuid4())


class Rule(Base, TimestampMixin):
    __tablename__ = "rules"

    id = Column(String, primary_key=True, default=generate_uuid)
    rule_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    risk_level = Column(String(50), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    action = Column(String(50), nullable=False)  # PASS, REQUIRE_EVIDENCE, REQUIRE_REVISION, MANUAL_REVIEW, BLOCK
    patterns = Column(JSON, nullable=False, default=list)  # List of regex/string patterns
    enabled = Column(Boolean, default=True)
