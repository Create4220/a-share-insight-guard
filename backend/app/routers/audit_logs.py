"""Audit logs API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])


@router.get("")
def list_audit_logs(
    page: int = 1,
    page_size: int = 20,
    entity_type: str | None = None,
    entity_id: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """List audit logs with optional filters."""
    from app.models.audit import AuditLog
    from sqlalchemy import or_

    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    if search:
        pattern = f'%{search}%'
        q = q.filter(or_(
            AuditLog.operator.ilike(pattern),
            AuditLog.action.ilike(pattern),
            AuditLog.entity_id.ilike(pattern),
            AuditLog.comment.ilike(pattern),
        ))

    total = q.count()
    logs = q.order_by(AuditLog.timestamp.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": log.id,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else "",
                    "operator": log.operator,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "old_status": log.old_status,
                    "new_status": log.new_status,
                    "comment": log.comment,
                }
                for log in logs
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        },
    }


@router.patch("/{log_id}")
def update_audit_log(log_id: str, body: dict, db: Session = Depends(get_db)):
    """Update an audit log's comment."""
    from app.models.audit import AuditLog

    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="审计记录不存在")

    if "comment" in body:
        log.comment = body["comment"]

    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "data": {
            "id": log.id,
            "comment": log.comment,
        },
    }


@router.post("/{log_id}/revoke")
def revoke_audit_log(log_id: str, db: Session = Depends(get_db)):
    """Revoke an audit log entry and attempt to reverse the underlying action."""
    from app.models.audit import AuditLog
    from app.models.analysis import Analysis
    from app.models.review import ReviewTask

    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="审计记录不存在")

    if log.action == "REVOKED":
        raise HTTPException(status_code=400, detail="该记录已被撤回，不能重复撤回")

    # Mark original as revoked
    original_comment = log.comment or ""
    log.comment = f"[已撤回] {original_comment}"

    # Try to reverse the underlying data change
    reverse_note = ""
    if log.action == "RISK_ADJUSTED" and log.old_status and log.new_status:
        # old_status format: "risk=LOW, status=APPROVED"
        try:
            old_parts = dict(p.strip().split("=") for p in log.old_status.split(", "))
            new_parts = dict(p.strip().split("=") for p in log.new_status.split(", "))

            analysis = db.query(Analysis).filter(Analysis.id == log.entity_id).first()
            if analysis:
                old_risk = old_parts.get("risk", analysis.risk_level)
                old_status = old_parts.get("status", analysis.status)
                analysis.risk_level = old_risk
                analysis.status = old_status
                reverse_note = f"已恢复风险等级为 {old_risk}、状态为 {old_status}"

                # Also update linked review task
                task = db.query(ReviewTask).filter(ReviewTask.analysis_id == log.entity_id).first()
                if task:
                    task.risk_level = old_risk
                    task.status = old_status
        except Exception:
            reverse_note = "无法自动恢复原始状态"

    # Create revocation audit log
    revoke_log = AuditLog(
        operator="compliance.reviewer",
        action="REVOKED",
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        old_status=log.new_status,
        new_status=log.old_status,
        comment=f"撤回操作：{original_comment}。{reverse_note}".strip(),
    )
    db.add(revoke_log)

    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "data": {
            "id": log.id,
            "comment": log.comment,
            "revoked": True,
            "reverse_note": reverse_note,
        },
    }
