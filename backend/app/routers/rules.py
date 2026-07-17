"""Rules API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.rule import RuleCreateRequest, RuleUpdateRequest

router = APIRouter(prefix="/api/v1/rules", tags=["Rules"])


@router.get("")
def list_rules(
    risk_level: str | None = None,
    enabled: bool | None = None,
    db: Session = Depends(get_db),
):
    """List all rules with optional filters."""
    from app.models.rule import Rule as RuleModel

    q = db.query(RuleModel)
    if risk_level:
        q = q.filter(RuleModel.risk_level == risk_level)
    if enabled is not None:
        q = q.filter(RuleModel.enabled == enabled)

    rules = q.order_by(
        RuleModel.risk_level.desc(),
        RuleModel.created_at.desc(),
    ).all()

    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": r.id,
                    "rule_id": r.rule_id,
                    "name": r.name,
                    "description": r.description,
                    "risk_level": r.risk_level,
                    "action": r.action,
                    "patterns": r.patterns,
                    "enabled": r.enabled,
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                    "updated_at": r.updated_at.isoformat() if r.updated_at else "",
                }
                for r in rules
            ],
            "total": len(rules),
            "page": 1,
            "page_size": len(rules),
            "total_pages": 1,
        },
    }


@router.post("")
def create_rule(body: RuleCreateRequest, db: Session = Depends(get_db)):
    """Create a new compliance rule."""
    from app.models.rule import Rule as RuleModel
    from app.models.audit import AuditLog

    # Check for duplicate rule_id
    existing = db.query(RuleModel).filter(RuleModel.rule_id == body.rule_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"规则标识 {body.rule_id} 已存在")

    rule = RuleModel(
        rule_id=body.rule_id,
        name=body.name,
        description=body.description,
        risk_level=body.risk_level,
        action=body.action,
        patterns=body.patterns,
        enabled=body.enabled,
    )
    db.add(rule)

    # Audit log
    db.add(AuditLog(
        operator='content.operator',
        action='RULE_CREATED',
        entity_type='rule',
        entity_id=rule.rule_id,
        comment=f'创建规则：{rule.name}',
    ))

    db.commit()
    db.refresh(rule)

    return {
        "success": True,
        "data": {
            "id": rule.id,
            "rule_id": rule.rule_id,
            "name": rule.name,
            "description": rule.description,
            "risk_level": rule.risk_level,
            "action": rule.action,
            "patterns": rule.patterns,
            "enabled": rule.enabled,
            "created_at": rule.created_at.isoformat() if rule.created_at else "",
            "updated_at": rule.updated_at.isoformat() if rule.updated_at else "",
        },
    }


@router.patch("/{rule_id}")
def update_rule(rule_id: str, body: RuleUpdateRequest, db: Session = Depends(get_db)):
    """Update a rule (partial update)."""
    from app.models.rule import Rule as RuleModel
    from app.models.audit import AuditLog

    rule = db.query(RuleModel).filter(RuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    changes = []
    if body.name is not None:
        changes.append(f'name: {rule.name} -> {body.name}')
        rule.name = body.name
    if body.description is not None:
        rule.description = body.description
        changes.append('description updated')
    if body.risk_level is not None:
        changes.append(f'risk_level: {rule.risk_level} -> {body.risk_level}')
        rule.risk_level = body.risk_level
    if body.action is not None:
        changes.append(f'action: {rule.action} -> {body.action}')
        rule.action = body.action
    if body.patterns is not None:
        rule.patterns = body.patterns
        changes.append('patterns updated')
    if body.enabled is not None:
        changes.append(f'enabled: {rule.enabled} -> {body.enabled}')
        rule.enabled = body.enabled

    if changes:
        db.add(AuditLog(
            operator='content.operator',
            action='RULE_UPDATED',
            entity_type='rule',
            entity_id=rule.rule_id,
            comment='; '.join(changes),
        ))

    db.commit()
    db.refresh(rule)

    return {
        "success": True,
        "data": {
            "id": rule.id,
            "rule_id": rule.rule_id,
            "name": rule.name,
            "description": rule.description,
            "risk_level": rule.risk_level,
            "action": rule.action,
            "patterns": rule.patterns,
            "enabled": rule.enabled,
            "created_at": rule.created_at.isoformat() if rule.created_at else "",
            "updated_at": rule.updated_at.isoformat() if rule.updated_at else "",
        },
    }


@router.post("/{rule_id}/toggle")
def toggle_rule(rule_id: str, db: Session = Depends(get_db)):
    """Toggle a rule's enabled status."""
    from app.models.rule import Rule as RuleModel
    from app.models.audit import AuditLog

    rule = db.query(RuleModel).filter(RuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    rule.enabled = not rule.enabled

    db.add(AuditLog(
        operator='content.operator',
        action='RULE_TOGGLED',
        entity_type='rule',
        entity_id=rule.rule_id,
        new_status='enabled' if rule.enabled else 'disabled',
        comment=f'规则 {"启用" if rule.enabled else "停用"}：{rule.name}',
    ))

    db.commit()
    db.refresh(rule)

    return {
        "success": True,
        "data": {
            "id": rule.id,
            "rule_id": rule.rule_id,
            "name": rule.name,
            "enabled": rule.enabled,
        },
    }


@router.get("/{rule_id}")
def get_rule(rule_id: str, db: Session = Depends(get_db)):
    """Get a single rule by its database ID."""
    from app.models.rule import Rule as RuleModel

    r = db.query(RuleModel).filter(RuleModel.id == rule_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="规则不存在")

    return {
        "success": True,
        "data": {
            "id": r.id,
            "rule_id": r.rule_id,
            "name": r.name,
            "description": r.description,
            "risk_level": r.risk_level,
            "action": r.action,
            "patterns": r.patterns,
            "enabled": r.enabled,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "updated_at": r.updated_at.isoformat() if r.updated_at else "",
        },
    }
