"""Dashboard API router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """Get dashboard summary metrics."""
    from app.models.analysis import Analysis
    from app.models.review import ReviewTask

    total = db.query(Analysis).count()
    high_risk = db.query(Analysis).filter(
        Analysis.risk_level.in_(["HIGH", "CRITICAL"])
    ).count()
    pending = db.query(ReviewTask).filter(
        ReviewTask.status.in_(["NEEDS_MANUAL_REVIEW"])
    ).count()
    approved = db.query(Analysis).filter(Analysis.status == "APPROVED").count()

    # Average score
    from sqlalchemy import func
    avg_result = db.query(func.avg(Analysis.compliance_score)).scalar()
    avg_score = round(avg_result, 1) if avg_result else 0

    return {
        "success": True,
        "data": {
            "total_analyses_today": total,
            "high_risk_count": high_risk,
            "pending_review_count": pending,
            "approved_count": approved,
            "avg_compliance_score": avg_score,
        },
    }


@router.get("/risk-trend")
def get_risk_trend(db: Session = Depends(get_db)):
    """Get 7-day risk trend data."""
    from datetime import datetime, timezone, timedelta
    from app.models.analysis import Analysis
    from sqlalchemy import func

    now = datetime.now(timezone.utc)
    trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = (now - timedelta(days=i - 1)).replace(hour=0, minute=0, second=0, microsecond=0) if i > 0 else now

        total = db.query(Analysis).filter(
            Analysis.created_at >= day_start, Analysis.created_at < day_end
        ).count()
        high_risk = db.query(Analysis).filter(
            Analysis.created_at >= day_start,
            Analysis.created_at < day_end,
            Analysis.risk_level.in_(["HIGH", "CRITICAL"]),
        ).count()
        critical = db.query(Analysis).filter(
            Analysis.created_at >= day_start,
            Analysis.created_at < day_end,
            Analysis.risk_level == "CRITICAL",
        ).count()

        trend.append({
            "date": day_start.strftime("%m-%d"),
            "total": total,
            "high_risk": high_risk,
            "critical": critical,
        })

    return {"success": True, "data": trend}


@router.get("/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    """Get risk category distribution."""
    from app.models.analysis import RiskHit
    from sqlalchemy import func

    results = (
        db.query(RiskHit.rule_name, func.count(RiskHit.id))
        .group_by(RiskHit.rule_name)
        .all()
    )

    distribution = [
        {"category": name, "count": count}
        for name, count in results
    ]

    return {"success": True, "data": distribution}


@router.get("/pending-tasks")
def get_pending_tasks(db: Session = Depends(get_db)):
    """Get recent pending high-risk tasks."""
    from app.models.review import ReviewTask

    tasks = (
        db.query(ReviewTask)
        .filter(ReviewTask.status == "NEEDS_MANUAL_REVIEW")
        .order_by(ReviewTask.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "analysis_id": t.analysis_id or "",
                "task_number": t.task_number,
                "title": t.title,
                "security_code": t.security_code or "",
                "risk_level": t.risk_level,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else "",
            }
            for t in tasks
        ],
    }
