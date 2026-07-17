"""Analysis request/response schemas."""

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    """Request to analyze a piece of content."""
    content: str = Field(..., min_length=1, max_length=10000, description='待审校的金融分析文本')
    security_code: str | None = Field(None, max_length=50, description='关联标的代码（可选）')
    title: str | None = Field(None, max_length=500, description='内容标题（可选）')
