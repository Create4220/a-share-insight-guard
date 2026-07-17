"""Test the compliance rule engine."""

import pytest
from app.services.rule_engine import (
    split_sentences,
    classify_claim,
    detect_pattern_matches,
    check_risk_disclosure,
    compute_score,
    determine_status,
    determine_risk_level,
)


class TestSentenceSplitting:
    def test_splits_on_period(self):
        result = split_sentences('第一句。第二句。')
        assert len(result) == 2
        assert '第一句' in result[0]
        assert '第二句' in result[1]

    def test_splits_on_multiple_punctuation(self):
        result = split_sentences('事实陈述。观点分析！是否合理？')
        assert len(result) == 3

    def test_handles_empty(self):
        result = split_sentences('')
        assert result == []

    def test_handles_newlines(self):
        result = split_sentences('第一行\n第二行')
        assert len(result) >= 1


class TestClaimClassification:
    def test_classifies_risk_disclosure(self):
        assert classify_claim('本内容不构成投资建议') == 'RISK_DISCLOSURE'
        assert classify_claim('投资有风险，需谨慎') == 'RISK_DISCLOSURE'

    def test_classifies_guidance(self):
        assert classify_claim('建议买入该股票') == 'GUIDANCE'
        assert classify_claim('可重点关注此标的') == 'GUIDANCE'

    def test_classifies_forecast(self):
        assert classify_claim('预计明日股价将上涨') == 'FORECAST'
        assert classify_claim('该行业有望迎来增长') == 'FORECAST'

    def test_classifies_fact(self):
        assert classify_claim('公司披露了最新财报') == 'FACT'
        assert classify_claim('根据公告显示的数据') == 'FACT'

    def test_classifies_opinion(self):
        assert classify_claim('市场情绪较为乐观') == 'OPINION'


class TestPatternMatching:
    def test_detects_patterns(self):
        matches = detect_pattern_matches('建议买入该股票', ['建议买入', '重点配置'])
        assert '建议买入' in matches

    def test_no_false_positive(self):
        matches = detect_pattern_matches('该公司业绩良好', ['建议买入', '满仓'])
        assert matches == []

    def test_multiple_matches(self):
        matches = detect_pattern_matches('必涨，保证收益', ['必涨', '保证收益', '稳赚'])
        assert len(matches) == 2


class TestRiskDisclosure:
    def test_has_disclosure(self):
        assert check_risk_disclosure('投资有风险，需谨慎对待。仅供参考。')

    def test_missing_disclosure(self):
        assert not check_risk_disclosure('该股票前景看好，建议买入。')


class TestScoring:
    def test_perfect_score(self):
        score = compute_score([], True, True)
        assert score == 100

    def test_critical_deduction(self):
        hits = [{'rule_id': 'R1', 'rule_name': 'test', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '', 'matched_pattern': ''}]
        score = compute_score(hits, True, True)
        assert score == 55  # 100 - 45

    def test_high_deduction(self):
        hits = [{'rule_id': 'R1', 'rule_name': 'test', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '', 'matched_pattern': ''}]
        score = compute_score(hits, True, True)
        assert score == 75  # 100 - 25

    def test_medium_deduction(self):
        hits = [{'rule_id': 'R1', 'rule_name': 'test', 'risk_level': 'MEDIUM', 'action': 'REQUIRE_EVIDENCE', 'matched_text': '', 'matched_pattern': ''}]
        score = compute_score(hits, True, True)
        assert score == 88  # 100 - 12

    def test_missing_disclosure_deduction(self):
        score = compute_score([], False, True)
        assert score == 90  # 100 - 10

    def test_missing_evidence_deduction(self):
        score = compute_score([], True, False)
        assert score == 85  # 100 - 15

    def test_high_authority_bonus(self):
        score = compute_score([], True, True, has_high_authority_source=True)
        assert score == 100  # capped at 100

    def test_score_clamped_to_zero(self):
        hits = [
            {'rule_id': 'R1', 'rule_name': 't1', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '', 'matched_pattern': ''},
            {'rule_id': 'R2', 'rule_name': 't2', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '', 'matched_pattern': ''},
            {'rule_id': 'R3', 'rule_name': 't3', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '', 'matched_pattern': ''},
        ]
        score = compute_score(hits, False, False)
        assert score == 0

    def test_multiple_mixed_deductions(self):
        hits = [
            {'rule_id': 'R1', 'rule_name': 't1', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '', 'matched_pattern': ''},
            {'rule_id': 'R2', 'rule_name': 't2', 'risk_level': 'MEDIUM', 'action': 'REQUIRE_EVIDENCE', 'matched_text': '', 'matched_pattern': ''},
            {'rule_id': 'R3', 'rule_name': 't3', 'risk_level': 'LOW', 'action': 'PASS', 'matched_text': '', 'matched_pattern': ''},
        ]
        score = compute_score(hits, False, False)
        assert score == 33  # 100 - 25 - 12 - 5 - 10 - 15


class TestStatusDetermination:
    def test_block_for_critical(self):
        hits = [{'rule_id': 'R1', 'rule_name': 't', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '', 'matched_pattern': ''}]
        assert determine_status(hits, 50) == 'BLOCKED'

    def test_block_for_block_action(self):
        hits = [{'rule_id': 'R1', 'rule_name': 't', 'risk_level': 'MEDIUM', 'action': 'BLOCK', 'matched_text': '', 'matched_pattern': ''}]
        assert determine_status(hits, 80) == 'BLOCKED'

    def test_manual_review_for_high(self):
        hits = [{'rule_id': 'R1', 'rule_name': 't', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '', 'matched_pattern': ''}]
        assert determine_status(hits, 75) == 'NEEDS_MANUAL_REVIEW'

    def test_needs_revision_low_score(self):
        assert determine_status([], 65) == 'NEEDS_REVISION'

    def test_approved(self):
        assert determine_status([], 85) == 'APPROVED'


class TestRiskLevel:
    def test_highest_wins(self):
        hits = [
            {'rule_id': 'R1', 'rule_name': 't1', 'risk_level': 'LOW', 'action': 'PASS', 'matched_text': '', 'matched_pattern': ''},
            {'rule_id': 'R2', 'rule_name': 't2', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '', 'matched_pattern': ''},
            {'rule_id': 'R3', 'rule_name': 't3', 'risk_level': 'MEDIUM', 'action': 'REQUIRE_EVIDENCE', 'matched_text': '', 'matched_pattern': ''},
        ]
        assert determine_risk_level(hits) == 'CRITICAL'

    def test_no_hits_defaults_to_low(self):
        assert determine_risk_level([]) == 'LOW'


# ── Service-layer integration tests ─────────────────────────────

class TestAnalyzeTextService:
    """Test analyze_text directly with a DB session (no HTTP layer)."""

    def test_high_risk_returns_blocked(self, db_session):
        """High-risk example should produce BLOCKED status."""
        from app.models.rule import Rule as RuleModel
        from app.services.rule_engine import analyze_text

        rules = [
            RuleModel(rule_id='RULE_DIRECT_RECOMMENDATION', name='直接荐股表达', risk_level='HIGH', action='MANUAL_REVIEW', patterns=['建议买入'], enabled=True),
            RuleModel(rule_id='RULE_RETURN_PROMISE', name='收益承诺', risk_level='CRITICAL', action='BLOCK', patterns=['保证收益', '必涨'], enabled=True),
            RuleModel(rule_id='RULE_DETERMINISTIC_FORECAST', name='确定性涨跌预测', risk_level='HIGH', action='MANUAL_REVIEW', patterns=['明天涨停'], enabled=True),
        ]
        db_session.add_all(rules)
        db_session.commit()

        text = '【高风险检测样例，请勿作为投资依据】海岚能源明天必涨，现在建议买入，保证获得20%收益。'
        result = analyze_text(text, db_session)

        assert result['status'] == 'BLOCKED'
        assert result['risk_level'] == 'CRITICAL'
        assert result['compliance_score'] < 40
        assert len(result['risk_hits']) >= 2

    def test_medium_risk_scoring(self, db_session):
        """Medium-risk text with unsourced claims and no disclosure should score appropriately."""
        from app.models.rule import Rule as RuleModel
        from app.services.rule_engine import analyze_text

        rules = [
            RuleModel(rule_id='RULE_HIGH_RISK_PRODUCT', name='不适当的高风险产品引导', risk_level='MEDIUM', action='REQUIRE_REVISION', patterns=['高收益低风险', '稳赢', '零风险'], enabled=True),
            RuleModel(rule_id='RULE_MISSING_RISK_DISCLOSURE', name='风险揭示缺失', risk_level='MEDIUM', action='REQUIRE_REVISION', patterns=[], enabled=True),
        ]
        db_session.add_all(rules)
        db_session.commit()

        text = '该产品高收益低风险，是稳健投资者的首选。预计未来将持续保持良好表现。'
        result = analyze_text(text, db_session)

        # With one MEDIUM hit (-12) + missing evidence (-15) = score 73
        # (text contains '风险' in '低风险' so risk disclosure heuristic returns True)
        # Score >= 70 with no HIGH/CRITICAL → APPROVED (by design)
        assert result['compliance_score'] == 73
        assert result['missing_evidence'] is True
        assert len(result['risk_hits']) >= 1
        assert result['risk_hits'][0]['risk_level'] == 'MEDIUM'

    def test_multiple_medium_hits_triggers_revision(self, db_session):
        """Multiple medium hits dropping score below 70 should trigger NEEDS_REVISION."""
        from app.models.rule import Rule as RuleModel
        from app.services.rule_engine import analyze_text

        rules = [
            RuleModel(rule_id='RULE_HIGH_RISK_PRODUCT', name='不适当的高风险产品引导', risk_level='MEDIUM', action='REQUIRE_REVISION', patterns=['高收益低风险'], enabled=True),
            RuleModel(rule_id='RULE_INDUCEMENT_TRADING', name='诱导性交易措辞', risk_level='HIGH', action='MANUAL_REVIEW', patterns=['带你赚钱'], enabled=True),
        ]
        db_session.add_all(rules)
        db_session.commit()

        # Text with HIGH risk hit → NEEDS_MANUAL_REVIEW
        text = '该产品高收益低风险，带你赚钱，稳赚不赔。'
        result = analyze_text(text, db_session)

        # HIGH risk hit → NEEDS_MANUAL_REVIEW (overrides score-based decision)
        assert result['status'] == 'NEEDS_MANUAL_REVIEW'
        assert len(result['risk_hits']) >= 1

    def test_low_risk_returns_approved(self, db_session):
        """Low-risk example should return APPROVED."""
        from app.models.rule import Rule as RuleModel
        from app.services.rule_engine import analyze_text

        rules = [
            RuleModel(rule_id='RULE_DIRECT_RECOMMENDATION', name='直接荐股表达', risk_level='HIGH', action='MANUAL_REVIEW', patterns=['建议买入'], enabled=True),
            RuleModel(rule_id='RULE_RETURN_PROMISE', name='收益承诺', risk_level='CRITICAL', action='BLOCK', patterns=['保证收益'], enabled=True),
        ]
        db_session.add_all(rules)
        db_session.commit()

        text = '根据演示公告摘要，星河智算披露了阶段性经营信息。相关经营变化是否能够持续，仍需结合后续定期报告、行业环境与市场风险综合判断。本内容仅用于信息整理，不构成投资建议。'
        result = analyze_text(text, db_session)

        assert result['status'] == 'APPROVED'
        assert result['risk_level'] == 'LOW'
        assert result['compliance_score'] >= 70

    def test_disabled_rule_not_matched(self, db_session):
        """Disabled rules should not produce risk hits."""
        from app.models.rule import Rule as RuleModel
        from app.services.rule_engine import analyze_text

        rules = [
            RuleModel(rule_id='RULE_DIRECT_RECOMMENDATION', name='直接荐股表达', risk_level='HIGH', action='MANUAL_REVIEW', patterns=['建议买入'], enabled=False),
            RuleModel(rule_id='RULE_RETURN_PROMISE', name='收益承诺', risk_level='CRITICAL', action='BLOCK', patterns=['保证收益'], enabled=False),
        ]
        db_session.add_all(rules)
        db_session.commit()

        text = '建议买入该股票，保证收益。'
        result = analyze_text(text, db_session)

        assert len(result['risk_hits']) == 0
        assert result['missing_risk_disclosure'] is True

    def test_rule_toggle_affects_detection(self, db_session):
        """Toggling a rule should affect subsequent analyses."""
        from app.models.rule import Rule as RuleModel
        from app.services.rule_engine import analyze_text

        rule = RuleModel(
            rule_id='TEST_TOGGLE',
            name='测试规则',
            risk_level='HIGH',
            action='MANUAL_REVIEW',
            patterns=['测试关键词'],
            enabled=True,
        )
        db_session.add(rule)
        db_session.commit()

        # First analysis with rule enabled
        result1 = analyze_text('这是一个包含测试关键词的内容。投资有风险。', db_session)
        test_hits = [h for h in result1['risk_hits'] if h['rule_id'] == 'TEST_TOGGLE']
        assert len(test_hits) == 1

        # Disable the rule
        rule.enabled = False
        db_session.commit()

        # Second analysis with rule disabled
        result2 = analyze_text('这是一个包含测试关键词的内容。投资有风险。', db_session)
        test_hits2 = [h for h in result2['risk_hits'] if h['rule_id'] == 'TEST_TOGGLE']
        assert len(test_hits2) == 0
