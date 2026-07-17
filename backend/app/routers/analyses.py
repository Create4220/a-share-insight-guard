"""Analysis API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.analysis import AnalysisRequest
from app.services.rule_engine import analyze_text

router = APIRouter(prefix="/api/v1/analyses", tags=["Analyses"])


@router.post("/review")
def review_content(body: AnalysisRequest, db: Session = Depends(get_db)):
    """Analyze a piece of AI-generated financial content.

    Runs the full compliance review pipeline:
    rule matching, claim classification, scoring, and revision suggestions.
    """
    from app.models.analysis import Analysis, Claim, RiskHit

    result = analyze_text(
        text=body.content,
        db=db,
        security_code=body.security_code,
        title=body.title,
    )

    # Persist the analysis
    analysis = Analysis(
        title=result['title'] or body.content[:50],
        original_text=result['original_text'],
        security_code=result['security_code'],
        compliance_score=result['compliance_score'],
        status=result['status'],
        risk_level=result['risk_level'],
        missing_risk_disclosure=result['missing_risk_disclosure'],
        missing_evidence=result['missing_evidence'],
    )
    db.add(analysis)
    db.flush()

    for claim_data in result['claims']:
        db.add(Claim(
            analysis_id=analysis.id,
            text=claim_data['text'],
            claim_type=claim_data['claim_type'],
            has_evidence=claim_data['has_evidence'],
            confidence=claim_data['confidence'],
        ))

    for hit in result['risk_hits']:
        db.add(RiskHit(
            analysis_id=analysis.id,
            rule_id=hit['rule_id'],
            rule_name=hit['rule_name'],
            risk_level=hit['risk_level'],
            action=hit['action'],
            matched_text=hit['matched_text'],
            matched_pattern=hit['matched_pattern'],
        ))

    db.commit()
    db.refresh(analysis)

    # Auto-create review task if high risk or blocked
    review_task_id = None
    review_task_number = None
    if analysis.status in ("NEEDS_MANUAL_REVIEW", "BLOCKED"):
        from app.models.review import ReviewTask
        from app.models.audit import AuditLog
        from sqlalchemy import func

        max_num = db.query(func.max(ReviewTask.task_number)).scalar()
        next_num = 1001
        if max_num and max_num.startswith('RT-'):
            try:
                next_num = int(max_num[3:]) + 1
            except ValueError:
                pass

        task = ReviewTask(
            task_number=f'RT-{next_num}',
            analysis_id=analysis.id,
            title=analysis.title or '未命名审校',
            security_code=analysis.security_code,
            compliance_score=analysis.compliance_score,
            risk_level=analysis.risk_level,
            status=analysis.status,
            reviewer='compliance.reviewer',
        )
        db.add(task)
        db.flush()

        db.add(AuditLog(
            operator='system',
            action='AUTO_CREATE_TASK',
            entity_type='review_task',
            entity_id=task.id,
            new_status=analysis.status,
            comment=f'高风险内容自动创建审核任务（风险等级：{analysis.risk_level}，评分：{analysis.compliance_score}）',
        ))

        analysis.submitted_for_review = True
        review_task_id = task.id
        review_task_number = task.task_number
        db.commit()
        db.refresh(analysis)

    return {
        "success": True,
        "data": {
            "id": analysis.id,
            "title": analysis.title,
            "original_text": analysis.original_text,
            "security_code": analysis.security_code,
            "compliance_score": analysis.compliance_score,
            "status": analysis.status,
            "risk_level": analysis.risk_level,
            "review_task_id": review_task_id,
            "review_task_number": review_task_number,
            "risk_hits": [
                {
                    "rule_id": rh.rule_id,
                    "rule_name": rh.rule_name,
                    "risk_level": rh.risk_level,
                    "action": rh.action,
                    "matched_text": rh.matched_text,
                    "matched_pattern": rh.matched_pattern,
                }
                for rh in analysis.risk_hits
            ],
            "claims": [
                {
                    "id": c.id,
                    "text": c.text,
                    "claim_type": c.claim_type,
                    "has_evidence": c.has_evidence,
                    "confidence": c.confidence,
                }
                for c in analysis.claims
            ],
            "evidence": [
                {
                    "id": e.id,
                    "source_name": e.source_name,
                    "source_url": e.source_url,
                    "credibility": e.credibility,
                    "summary": e.summary,
                    "is_demo": e.is_demo,
                }
                for e in analysis.evidence
            ],
            "revision_suggestions": result['revision_suggestions'],
            "missing_risk_disclosure": analysis.missing_risk_disclosure,
            "missing_evidence": analysis.missing_evidence,
            "created_at": analysis.created_at.isoformat() if analysis.created_at else "",
        },
    }


@router.get("")
def list_analyses(db: Session = Depends(get_db)):
    """List all analyses."""
    from app.models.analysis import Analysis

    analyses = db.query(Analysis).order_by(Analysis.created_at.desc()).all()
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": a.id,
                    "title": a.title,
                    "original_text": a.original_text,
                    "security_code": a.security_code,
                    "compliance_score": a.compliance_score,
                    "status": a.status,
                    "risk_level": a.risk_level,
                    "missing_risk_disclosure": a.missing_risk_disclosure,
                    "missing_evidence": a.missing_evidence,
                    "created_at": a.created_at.isoformat() if a.created_at else "",
                }
                for a in analyses
            ],
            "total": len(analyses),
            "page": 1,
            "page_size": len(analyses),
            "total_pages": 1,
        },
    }


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    """Get a single analysis with all details."""
    from app.models.analysis import Analysis

    a = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not a:
        raise HTTPException(status_code=404, detail={
            "code": "NOT_FOUND",
            "message": "审校记录不存在",
        })

    return {
        "success": True,
        "data": {
            "id": a.id,
            "title": a.title,
            "original_text": a.original_text,
            "security_code": a.security_code,
            "compliance_score": a.compliance_score,
            "status": a.status,
            "risk_level": a.risk_level,
            "missing_risk_disclosure": a.missing_risk_disclosure,
            "missing_evidence": a.missing_evidence,
            "claims": [
                {
                    "id": c.id,
                    "text": c.text,
                    "claim_type": c.claim_type,
                    "has_evidence": c.has_evidence,
                    "confidence": c.confidence,
                }
                for c in a.claims
            ],
            "evidence": [
                {
                    "id": e.id,
                    "source_name": e.source_name,
                    "source_url": e.source_url,
                    "credibility": e.credibility,
                    "summary": e.summary,
                    "is_demo": e.is_demo,
                }
                for e in a.evidence
            ],
            "risk_hits": [
                {
                    "rule_id": rh.rule_id,
                    "rule_name": rh.rule_name,
                    "risk_level": rh.risk_level,
                    "action": rh.action,
                    "matched_text": rh.matched_text,
                    "matched_pattern": rh.matched_pattern,
                }
                for rh in a.risk_hits
            ],
            "revision_suggestions": [],
            "created_at": a.created_at.isoformat() if a.created_at else "",
        },
    }


@router.post("/{analysis_id}/submit-review")
def submit_for_review(analysis_id: str, db: Session = Depends(get_db)):
    """Submit an analysis for human review."""
    from app.models.analysis import Analysis
    from app.models.review import ReviewTask
    from app.models.audit import AuditLog

    a = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not a:
        raise HTTPException(status_code=404, detail={
            "code": "NOT_FOUND",
            "message": "审校记录不存在",
        })

    if a.submitted_for_review:
        raise HTTPException(status_code=400, detail={
            "code": "ALREADY_SUBMITTED",
            "message": "该内容已提交审核",
        })

    a.submitted_for_review = True

    # Generate task number
    from sqlalchemy import func
    max_num = db.query(func.max(ReviewTask.task_number)).scalar()
    next_num = 1001
    if max_num and max_num.startswith('RT-'):
        try:
            next_num = int(max_num[3:]) + 1
        except ValueError:
            pass

    task = ReviewTask(
        task_number=f'RT-{next_num}',
        analysis_id=a.id,
        title=a.title or '未命名审校',
        security_code=a.security_code,
        compliance_score=a.compliance_score,
        risk_level=a.risk_level,
        status='NEEDS_MANUAL_REVIEW',
        reviewer='compliance.reviewer',
    )
    db.add(task)

    # Audit log
    db.add(AuditLog(
        operator='content.operator',
        action='SUBMIT_FOR_REVIEW',
        entity_type='analysis',
        entity_id=a.id,
        old_status=a.status,
        new_status='NEEDS_MANUAL_REVIEW',
        comment=f'提交人工复核，任务编号 {task.task_number}',
    ))

    db.commit()
    db.refresh(task)

    return {
        "success": True,
        "data": {
            "id": task.id,
            "task_number": task.task_number,
            "title": task.title,
            "security_code": task.security_code or "",
            "risk_level": task.risk_level,
            "status": task.status,
            "created_at": task.created_at.isoformat() if task.created_at else "",
        },
    }


@router.patch("/{analysis_id}/risk-level")
def update_risk_level(
    analysis_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """Update the risk level and optionally the status of an analysis."""
    from app.models.analysis import Analysis
    from app.models.review import ReviewTask
    from app.models.audit import AuditLog

    a = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="审校记录不存在")

    old_risk = a.risk_level
    old_status = a.status

    new_risk = body.get("risk_level", old_risk)
    new_status = body.get("status", old_status)

    if new_risk not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
        raise HTTPException(status_code=400, detail="无效的风险等级")
    if new_status not in ("APPROVED", "NEEDS_REVISION", "NEEDS_MANUAL_REVIEW", "BLOCKED"):
        raise HTTPException(status_code=400, detail="无效的审核状态")

    a.risk_level = new_risk
    a.status = new_status

    # Also update linked review task if exists
    task = db.query(ReviewTask).filter(ReviewTask.analysis_id == analysis_id).first()
    if task:
        task.risk_level = new_risk
        task.status = new_status

    # Audit log
    db.add(AuditLog(
        operator="compliance.reviewer",
        action="RISK_ADJUSTED",
        entity_type="analysis",
        entity_id=a.id,
        old_status=f"risk={old_risk}, status={old_status}",
        new_status=f"risk={new_risk}, status={new_status}",
        comment=body.get("comment", "手动调整风险等级"),
    ))

    db.commit()
    db.refresh(a)

    return {
        "success": True,
        "data": {
            "id": a.id,
            "risk_level": a.risk_level,
            "status": a.status,
            "compliance_score": a.compliance_score,
        },
    }
