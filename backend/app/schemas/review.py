"""Review schemas."""

from pydantic import BaseModel, Field


class ReviewDecisionRequest(BaseModel):
    """Request to make a review decision."""
    action: str = Field(..., pattern='^(APPROVE|REJECT|BLOCK|REQUEST_EVIDENCE)$', description='审核操作')
    comment: str = Field(..., min_length=1, max_length=2000, description='审核意见（必填）')
