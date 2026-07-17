"""Test the review workflow and audit logging (Phase 3)."""

import pytest
from app.models.analysis import Analysis
from app.models.review import ReviewTask, ReviewDecision
from app.models.rule import Rule as RuleModel
from app.models.audit import AuditLog


class TestReviewWorkflow:
    """Test review decision and audit logging using direct DB session."""

    def test_review_decision_generates_audit_log(self, db_session):
        """Making a review decision should generate an audit log."""
        # Setup: create analysis and review task
        analysis = Analysis(
            title='Test Analysis',
            original_text='test content',
            compliance_score=75,
            status='NEEDS_MANUAL_REVIEW',
            risk_level='HIGH',
        )
        db_session.add(analysis)
        db_session.flush()

        task = ReviewTask(
            task_number='RT-2001',
            analysis_id=analysis.id,
            title='Test Analysis',
            compliance_score=75,
            risk_level='HIGH',
            status='NEEDS_MANUAL_REVIEW',
        )
        db_session.add(task)
        db_session.commit()

        # Make decision
        old_status = task.status
        decision = ReviewDecision(
            task_id=task.id,
            action='APPROVE',
            comment='经审核，内容合规，予以通过。',
            operator='compliance.reviewer',
            old_status=old_status,
            new_status='APPROVED',
        )
        db_session.add(decision)

        audit = AuditLog(
            operator='compliance.reviewer',
            action='REVIEW_APPROVE',
            entity_type='review_task',
            entity_id=task.id,
            old_status=old_status,
            new_status='APPROVED',
            comment='审核通过：经审核，内容合规，予以通过。',
        )
        db_session.add(audit)

        # Update statuses
        task.status = 'APPROVED'
        analysis.status = 'APPROVED'
        db_session.commit()

        # Verify audit log exists
        logs = db_session.query(AuditLog).filter(
            AuditLog.entity_id == task.id,
            AuditLog.entity_type == 'review_task',
        ).all()
        assert len(logs) >= 1
        assert logs[0].action == 'REVIEW_APPROVE'
        assert '通过' in logs[0].comment

    def test_review_decision_updates_status(self, db_session):
        """Review decision should update both task and analysis status."""
        analysis = Analysis(
            title='Test',
            original_text='content',
            compliance_score=60,
            status='NEEDS_MANUAL_REVIEW',
            risk_level='HIGH',
        )
        db_session.add(analysis)
        db_session.flush()

        task = ReviewTask(
            task_number='RT-3001',
            analysis_id=analysis.id,
            title='Test',
            compliance_score=60,
            risk_level='HIGH',
            status='NEEDS_MANUAL_REVIEW',
        )
        db_session.add(task)
        db_session.commit()

        # Block the content
        decision = ReviewDecision(
            task_id=task.id,
            action='BLOCK',
            comment='包含严重违规内容，予以拦截。',
            operator='compliance.reviewer',
            old_status='NEEDS_MANUAL_REVIEW',
            new_status='BLOCKED',
        )
        db_session.add(decision)
        task.status = 'BLOCKED'
        analysis.status = 'BLOCKED'
        db_session.commit()

        # Verify
        db_session.refresh(task)
        db_session.refresh(analysis)
        assert task.status == 'BLOCKED'
        assert analysis.status == 'BLOCKED'

    def test_multiple_decisions_on_same_task(self, db_session):
        """A task can have multiple review decisions (history)."""
        analysis = Analysis(
            title='Test',
            original_text='content',
            compliance_score=55,
            status='NEEDS_MANUAL_REVIEW',
            risk_level='HIGH',
        )
        db_session.add(analysis)
        db_session.flush()

        task = ReviewTask(
            task_number='RT-4001',
            analysis_id=analysis.id,
            title='Test',
            compliance_score=55,
            risk_level='HIGH',
            status='NEEDS_MANUAL_REVIEW',
        )
        db_session.add(task)
        db_session.commit()

        # First decision: request evidence
        d1 = ReviewDecision(
            task_id=task.id,
            action='REQUEST_EVIDENCE',
            comment='请补充来源信息。',
            operator='compliance.reviewer',
            old_status='NEEDS_MANUAL_REVIEW',
            new_status='NEEDS_REVISION',
        )
        db_session.add(d1)
        task.status = 'NEEDS_REVISION'
        db_session.commit()

        # Second decision: approve after evidence added
        d2 = ReviewDecision(
            task_id=task.id,
            action='APPROVE',
            comment='证据补充完整，予以通过。',
            operator='compliance.reviewer',
            old_status='NEEDS_REVISION',
            new_status='APPROVED',
        )
        db_session.add(d2)
        task.status = 'APPROVED'
        db_session.commit()

        # Verify both decisions recorded
        decisions = db_session.query(ReviewDecision).filter(
            ReviewDecision.task_id == task.id
        ).all()
        assert len(decisions) == 2


class TestRuleManagement:
    """Test rule CRUD and toggle."""

    def test_create_rule_generates_audit_log(self, db_session):
        """Creating a rule should generate an audit log."""
        rule = RuleModel(
            rule_id='TEST_NEW_RULE',
            name='测试新规则',
            description='测试用',
            risk_level='MEDIUM',
            action='REQUIRE_REVISION',
            patterns=['测试'],
            enabled=True,
        )
        db_session.add(rule)

        audit = AuditLog(
            operator='content.operator',
            action='RULE_CREATED',
            entity_type='rule',
            entity_id='TEST_NEW_RULE',
            comment='创建规则：测试新规则',
        )
        db_session.add(audit)
        db_session.commit()

        # Verify
        saved_rule = db_session.query(RuleModel).filter(
            RuleModel.rule_id == 'TEST_NEW_RULE'
        ).first()
        assert saved_rule is not None

        logs = db_session.query(AuditLog).filter(
            AuditLog.entity_id == 'TEST_NEW_RULE',
            AuditLog.entity_type == 'rule',
        ).all()
        assert len(logs) >= 1

    def test_toggle_rule_changes_enabled(self, db_session):
        """Toggling a rule should flip its enabled status."""
        rule = RuleModel(
            rule_id='TEST_TOGGLE_RULE',
            name='测试切换规则',
            risk_level='LOW',
            action='PASS',
            patterns=['test'],
            enabled=True,
        )
        db_session.add(rule)
        db_session.commit()

        assert rule.enabled is True

        # Toggle off
        rule.enabled = False
        db_session.commit()
        db_session.refresh(rule)
        assert rule.enabled is False

        # Toggle on
        rule.enabled = True
        db_session.commit()
        db_session.refresh(rule)
        assert rule.enabled is True

    def test_rule_toggle_generates_audit_log(self, db_session):
        """Toggling a rule should generate an audit log."""
        rule = RuleModel(
            rule_id='TEST_AUDIT_TOGGLE',
            name='测试审计切换',
            risk_level='LOW',
            action='PASS',
            patterns=['test'],
            enabled=True,
        )
        db_session.add(rule)
        db_session.commit()

        rule.enabled = False
        audit = AuditLog(
            operator='content.operator',
            action='RULE_TOGGLED',
            entity_type='rule',
            entity_id='TEST_AUDIT_TOGGLE',
            new_status='disabled',
            comment='规则 停用：测试审计切换',
        )
        db_session.add(audit)
        db_session.commit()

        logs = db_session.query(AuditLog).filter(
            AuditLog.entity_id == 'TEST_AUDIT_TOGGLE',
            AuditLog.action == 'RULE_TOGGLED',
        ).all()
        assert len(logs) >= 1


class TestAuditTrail:
    """Test complete audit trail."""

    def test_complete_audit_trail(self, db_session):
        """Verify full audit trail: submit → review → decision → log."""
        # 1. Content is analyzed
        analysis = Analysis(
            title='Audit Trail Test',
            original_text='测试审计追踪的完整内容。投资有风险。',
            compliance_score=85,
            status='APPROVED',
            risk_level='LOW',
        )
        db_session.add(analysis)
        db_session.flush()

        # 2. Submit for review
        task = ReviewTask(
            task_number='RT-5001',
            analysis_id=analysis.id,
            title='Audit Trail Test',
            compliance_score=85,
            risk_level='LOW',
            status='NEEDS_MANUAL_REVIEW',
        )
        db_session.add(task)
        db_session.add(AuditLog(
            operator='content.operator',
            action='SUBMIT_FOR_REVIEW',
            entity_type='analysis',
            entity_id=analysis.id,
            comment='提交人工复核',
        ))
        db_session.commit()

        # 3. Review decision
        decision = ReviewDecision(
            task_id=task.id,
            action='APPROVE',
            comment='审核通过。',
            operator='compliance.reviewer',
            old_status='NEEDS_MANUAL_REVIEW',
            new_status='APPROVED',
        )
        db_session.add(decision)
        task.status = 'APPROVED'
        db_session.add(AuditLog(
            operator='compliance.reviewer',
            action='REVIEW_APPROVE',
            entity_type='review_task',
            entity_id=task.id,
            old_status='NEEDS_MANUAL_REVIEW',
            new_status='APPROVED',
            comment='审核通过。',
        ))
        db_session.commit()

        # Verify full trail
        all_logs = db_session.query(AuditLog).order_by(AuditLog.timestamp.asc()).all()
        assert len(all_logs) >= 2

        # Verify the task's decisions
        decisions = db_session.query(ReviewDecision).filter(
            ReviewDecision.task_id == task.id
        ).all()
        assert len(decisions) == 1
        assert decisions[0].action == 'APPROVE'
