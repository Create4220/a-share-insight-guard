"""Rule schemas."""

from pydantic import BaseModel, Field


class RuleCreateRequest(BaseModel):
    """Request to create a rule."""
    rule_id: str = Field(..., min_length=1, max_length=100, description='规则标识')
    name: str = Field(..., min_length=1, max_length=200, description='规则名称')
    description: str | None = Field(None, max_length=2000, description='规则说明')
    risk_level: str = Field(..., pattern='^(LOW|MEDIUM|HIGH|CRITICAL)$', description='风险等级')
    action: str = Field(..., pattern='^(PASS|REQUIRE_EVIDENCE|REQUIRE_REVISION|MANUAL_REVIEW|BLOCK)$', description='处理动作')
    patterns: list[str] = Field(default_factory=list, description='匹配模式列表')
    enabled: bool = Field(default=True, description='是否启用')


class RuleUpdateRequest(BaseModel):
    """Request to update a rule."""
    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=2000)
    risk_level: str | None = Field(None, pattern='^(LOW|MEDIUM|HIGH|CRITICAL)$')
    action: str | None = Field(None, pattern='^(PASS|REQUIRE_EVIDENCE|REQUIRE_REVISION|MANUAL_REVIEW|BLOCK)$')
    patterns: list[str] | None = None
    enabled: bool | None = None
