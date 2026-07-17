"""Review tasks API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.review import ReviewDecisionRequest

router = APIRouter(prefix="/api/v1/review-tasks", tags=["Review Tasks"])


@router.get("")
def list_review_tasks(
    status: str | None = None,
    risk_level: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    """List review tasks with optional filters."""
    from app.models.review import ReviewTask
    from sqlalchemy import or_

    q = db.query(ReviewTask)
    if status:
        q = q.filter(ReviewTask.status == status)
    if risk_level:
        q = q.filter(ReviewTask.risk_level == risk_level)
    if search:
        pattern = f'%{search}%'
        q = q.filter(or_(
            ReviewTask.task_number.ilike(pattern),
            ReviewTask.title.ilike(pattern),
            ReviewTask.security_code.ilike(pattern),
        ))

    total = q.count()
    tasks = q.order_by(ReviewTask.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": t.id,
                    "analysis_id": t.analysis_id or "",
                    "task_number": t.task_number,
                    "title": t.title,
                    "security_code": t.security_code or "",
                    "compliance_score": t.compliance_score,
                    "risk_level": t.risk_level,
                    "status": t.status,
                    "reviewer": t.reviewer or "",
                    "created_at": t.created_at.isoformat() if t.created_at else "",
                }
                for t in tasks
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        },
    }


@router.get("/{task_id}")
def get_review_task(task_id: str, db: Session = Depends(get_db)):
    """Get a single review task with decisions and analysis details."""
    from app.models.review import ReviewTask
    from app.models.analysis import Analysis

    t = db.query(ReviewTask).filter(ReviewTask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="审核任务不存在")

    # Also load the associated analysis
    analysis = None
    if t.analysis_id:
        analysis = db.query(Analysis).filter(Analysis.id == t.analysis_id).first()

    result = {
        "id": t.id,
        "task_number": t.task_number,
        "analysis_id": t.analysis_id,
        "title": t.title,
        "security_code": t.security_code or "",
        "compliance_score": t.compliance_score,
        "risk_level": t.risk_level,
        "status": t.status,
        "reviewer": t.reviewer or "",
        "created_at": t.created_at.isoformat() if t.created_at else "",
        "decisions": [
            {
                "id": d.id,
                "action": d.action,
                "comment": d.comment,
                "operator": d.operator,
                "old_status": d.old_status,
                "new_status": d.new_status,
                "created_at": d.created_at.isoformat() if d.created_at else "",
            }
            for d in (t.decisions or [])
        ],
    }

    if analysis:
        result["analysis"] = {
            "id": analysis.id,
            "original_text": analysis.original_text,
            "compliance_score": analysis.compliance_score,
            "risk_level": analysis.risk_level,
            "status": analysis.status,
            "claims": [
                {"id": c.id, "text": c.text, "claim_type": c.claim_type, "has_evidence": c.has_evidence, "confidence": c.confidence}
                for c in analysis.claims
            ],
            "risk_hits": [
                {"rule_id": rh.rule_id, "rule_name": rh.rule_name, "risk_level": rh.risk_level, "action": rh.action, "matched_text": rh.matched_text}
                for rh in analysis.risk_hits
            ],
            "evidence": [
                {"id": e.id, "source_name": e.source_name, "credibility": e.credibility, "summary": e.summary}
                for e in analysis.evidence
            ],
        }

    return {"success": True, "data": result}


@router.post("/{task_id}/decision")
def make_decision(task_id: str, body: ReviewDecisionRequest, db: Session = Depends(get_db)):
    """Make a review decision on a task.

    Actions:
    - APPROVE: mark as approved
    - REJECT: return for revision
    - BLOCK: block the content
    - REQUEST_EVIDENCE: request additional evidence
    """
    from app.models.review import ReviewTask, ReviewDecision
    from app.models.analysis import Analysis
    from app.models.audit import AuditLog

    t = db.query(ReviewTask).filter(ReviewTask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="审核任务不存在")

    old_status = t.status

    # Map action to new status
    status_map = {
        'APPROVE': 'APPROVED',
        'REJECT': 'NEEDS_REVISION',
        'BLOCK': 'BLOCKED',
        'REQUEST_EVIDENCE': 'NEEDS_REVISION',
    }
    new_status = status_map.get(body.action, old_status)

    # Create decision record
    decision = ReviewDecision(
        task_id=t.id,
        action=body.action,
        comment=body.comment,
        operator='compliance.reviewer',
        old_status=old_status,
        new_status=new_status,
    )
    db.add(decision)

    # Update task status
    t.status = new_status

    # Update associated analysis
    if t.analysis_id:
        analysis = db.query(Analysis).filter(Analysis.id == t.analysis_id).first()
        if analysis:
            analysis.status = new_status

    # Audit log
    action_labels = {
        'APPROVE': '审核通过',
        'REJECT': '退回修改',
        'BLOCK': '内容拦截',
        'REQUEST_EVIDENCE': '要求补充证据',
    }
    db.add(AuditLog(
        operator='compliance.reviewer',
        action=f'REVIEW_{body.action}',
        entity_type='review_task',
        entity_id=t.id,
        old_status=old_status,
        new_status=new_status,
        comment=f'{action_labels.get(body.action, body.action)}：{body.comment}',
    ))

    db.commit()
    db.refresh(t)

    return {
        "success": True,
        "data": {
            "task": {
                "id": t.id,
                "task_number": t.task_number,
                "status": t.status,
            },
            "audit_log": {
                "action": f'REVIEW_{body.action}',
                "operator": 'compliance.reviewer',
                "comment": body.comment,
            },
        },
    }
