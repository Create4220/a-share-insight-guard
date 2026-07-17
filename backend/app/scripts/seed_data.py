"""Seed the database with demo data.

Usage:
    python -m app.scripts.seed_data
"""

import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal, engine
from app.models.base import Base
from app.models.analysis import Analysis, Claim, Evidence, RiskHit
from app.models.review import ReviewTask, ReviewDecision
from app.models.rule import Rule
from app.models.audit import AuditLog


def seed():
    """Seed all demo data — idempotent, skips if already seeded."""
    import app.models  # noqa: F401
    # Create tables if not exist (don't drop existing data)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Check if already seeded
    existing_rules = db.query(Rule).count()
    if existing_rules > 0:
        print(f'Database already initialized ({existing_rules} rules exist), skipping seed.')
        db.close()
        return

    try:
        # ── Rules ──────────────────────────────────────────────
        rules = [
            Rule(
                rule_id='RULE_DIRECT_RECOMMENDATION',
                name='直接荐股表达',
                description='识别具有明确买卖或配置导向的表达，例如「建议买入」「重点配置」「立即建仓」等。',
                risk_level='HIGH',
                action='MANUAL_REVIEW',
                patterns=['建议买入', '建议卖出', '重点配置', '立即建仓', '强烈推荐', '满仓'],
                enabled=True,
            ),
            Rule(
                rule_id='RULE_RETURN_PROMISE',
                name='收益承诺',
                description='识别对投资收益作出确定性承诺或暗示保证收益的表达。',
                risk_level='CRITICAL',
                action='BLOCK',
                patterns=['稳赚不赔', '保证收益', '必涨', '目标收益率', '确定上涨', '稳赚'],
                enabled=True,
            ),
            Rule(
                rule_id='RULE_DETERMINISTIC_FORECAST',
                name='确定性涨跌预测',
                description='识别使用确定性措辞对未来涨跌作出预测的表达。',
                risk_level='HIGH',
                action='MANUAL_REVIEW',
                patterns=['明天涨停', '明天必涨', '确定上涨', '肯定涨', '必定跌'],
                enabled=True,
            ),
            Rule(
                rule_id='RULE_INDUCEMENT_TRADING',
                name='诱导性交易措辞',
                description='识别诱导用户进行交易的措辞，如「带你赚钱」「跟庄」等。',
                risk_level='HIGH',
                action='MANUAL_REVIEW',
                patterns=['带你赚钱', '跟庄', '内幕消息', '稳操胜券'],
                enabled=True,
            ),
            Rule(
                rule_id='RULE_UNSOURCED_CLAIM',
                name='无来源事实性结论',
                description='识别缺乏来源或证据支持的事实性陈述。',
                risk_level='MEDIUM',
                action='REQUIRE_EVIDENCE',
                patterns=[],
                enabled=True,
            ),
            Rule(
                rule_id='RULE_MISSING_RISK_DISCLOSURE',
                name='风险揭示缺失',
                description='检查内容是否包含必要的风险提示。',
                risk_level='MEDIUM',
                action='REQUIRE_REVISION',
                patterns=[],
                enabled=True,
            ),
            Rule(
                rule_id='RULE_HIGH_RISK_PRODUCT',
                name='不适当的高风险产品引导',
                description='识别对高风险金融产品的不当引导表述。',
                risk_level='MEDIUM',
                action='REQUIRE_REVISION',
                patterns=['高收益低风险', '稳赢', '零风险'],
                enabled=True,
            ),
            Rule(
                rule_id='RULE_INSIDER_HINT',
                name='内幕信息暗示',
                description='识别暗示拥有内幕消息或特殊信息渠道的表述。',
                risk_level='CRITICAL',
                action='BLOCK',
                patterns=['内幕消息', '内部消息', '提前知道', '有人透露'],
                enabled=True,
            ),
        ]
        db.add_all(rules)
        db.flush()

        # ── Demo Analyses ──────────────────────────────────────
        now = datetime.now(timezone.utc)

        def days_ago(d):
            return now - timedelta(days=d)

        analyses_data = [
            # Low risk — APPROVED
            {
                'title': '星河智算经营信息整理',
                'original_text': '根据演示公告摘要，星河智算披露了阶段性经营信息。相关经营变化是否能够持续，仍需结合后续定期报告、行业环境与市场风险综合判断。本内容仅用于信息整理，不构成投资建议。',
                'security_code': 'DEMO001',
                'compliance_score': 92,
                'status': 'APPROVED',
                'risk_level': 'LOW',
                'missing_risk_disclosure': False,
                'missing_evidence': False,
                'submitted_for_review': False,
                'days_ago': 0,
                'claims': [
                    {'text': '星河智算披露了阶段性经营信息', 'type': 'FACT', 'has_evidence': True, 'confidence': 0.9},
                    {'text': '相关经营变化是否能够持续，仍需综合判断', 'type': 'OPINION', 'has_evidence': False, 'confidence': 0.7},
                    {'text': '本内容仅用于信息整理，不构成投资建议', 'type': 'RISK_DISCLOSURE', 'has_evidence': False, 'confidence': 1.0},
                ],
                'evidence': [
                    {'source_name': '演示公告摘要 · 星河智算经营信息披露', 'url': '#demo-announcement-001', 'cred': 'A', 'summary': '虚构演示公告，展示公司阶段性经营数据'},
                ],
                'risk_hits': [],
            },
            # Low risk — APPROVED
            {
                'title': '澄明医科研发进展观察',
                'original_text': '澄明医科近期在演示公告中提及在研项目取得阶段性进展。该等信息系公司自愿披露，投资者应当关注后续定期报告中关于研发投入、项目风险等更详细说明。以上内容仅供信息参考，不构成投资建议。',
                'security_code': 'DEMO003',
                'compliance_score': 88,
                'status': 'APPROVED',
                'risk_level': 'LOW',
                'missing_risk_disclosure': False,
                'missing_evidence': False,
                'submitted_for_review': False,
                'days_ago': 0,
                'claims': [
                    {'text': '澄明医科近期在演示公告中提及在研项目取得阶段性进展', 'type': 'FACT', 'has_evidence': True, 'confidence': 0.85},
                    {'text': '投资者应当关注后续定期报告', 'type': 'GUIDANCE', 'has_evidence': False, 'confidence': 0.6},
                ],
                'evidence': [
                    {'source_name': '演示公告 · 澄明医科在研项目进展说明', 'url': '#demo-announcement-003', 'cred': 'A', 'summary': '虚构演示公告，描述在研项目阶段性进展'},
                ],
                'risk_hits': [],
            },
            # Low risk — APPROVED
            {
                'title': '海岚能源行业政策梳理',
                'original_text': '根据公开政策文件，清洁能源领域近年来获得了多项产业支持政策。海岚能源作为该领域参与者，其经营表现受到多种因素影响，包括政策落地节奏、技术路线选择及市场竞争格局。当前信息来自演示政策整理，不构成任何投资建议。',
                'security_code': 'DEMO004',
                'compliance_score': 85,
                'status': 'APPROVED',
                'risk_level': 'LOW',
                'missing_risk_disclosure': False,
                'missing_evidence': False,
                'submitted_for_review': False,
                'days_ago': 0,
                'claims': [
                    {'text': '清洁能源领域近年来获得了多项产业支持政策', 'type': 'FACT', 'has_evidence': True, 'confidence': 0.9},
                    {'text': '经营表现受到多种因素影响', 'type': 'OPINION', 'has_evidence': False, 'confidence': 0.7},
                ],
                'evidence': [
                    {'source_name': '演示政策文件 · 清洁能源产业指导意见', 'url': '#demo-policy-001', 'cred': 'B', 'summary': '虚构演示政策文件摘要'},
                ],
                'risk_hits': [],
            },
            # Medium risk — NEEDS_REVISION
            {
                'title': '远景新材业务展望',
                'original_text': '远景新材近期披露的项目进展可能改善市场预期，未来经营表现仍存在不确定性。该判断需要进一步结合公开披露文件验证。',
                'security_code': 'DEMO002',
                'compliance_score': 68,
                'status': 'NEEDS_REVISION',
                'risk_level': 'MEDIUM',
                'missing_risk_disclosure': True,
                'missing_evidence': True,
                'submitted_for_review': False,
                'days_ago': 1,
                'claims': [
                    {'text': '远景新材近期披露的项目进展', 'type': 'FACT', 'has_evidence': False, 'confidence': 0.5},
                    {'text': '可能改善市场预期', 'type': 'FORECAST', 'has_evidence': False, 'confidence': 0.3},
                    {'text': '未来经营表现仍存在不确定性', 'type': 'OPINION', 'has_evidence': False, 'confidence': 0.7},
                ],
                'evidence': [],
                'risk_hits': [
                    {'rule_id': 'RULE_UNSOURCED_CLAIM', 'rule_name': '无来源事实性结论', 'risk_level': 'MEDIUM', 'action': 'REQUIRE_EVIDENCE', 'matched_text': '远景新材近期披露的项目进展', 'matched_pattern': '无来源引用'},
                    {'rule_id': 'RULE_MISSING_RISK_DISCLOSURE', 'rule_name': '风险揭示缺失', 'risk_level': 'MEDIUM', 'action': 'REQUIRE_REVISION', 'matched_text': '', 'matched_pattern': '全文缺少风险揭示'},
                ],
            },
            # Medium risk — NEEDS_REVISION
            {
                'title': '星河智算市场趋势分析',
                'original_text': '从行业数据来看，数字基础设施需求持续增长。星河智算作为该领域企业，其业务增速可能高于行业平均水平。不过目前尚未披露具体经营数据，以上分析仅供参考。',
                'security_code': 'DEMO001',
                'compliance_score': 55,
                'status': 'NEEDS_REVISION',
                'risk_level': 'MEDIUM',
                'missing_risk_disclosure': True,
                'missing_evidence': True,
                'submitted_for_review': False,
                'days_ago': 2,
                'claims': [
                    {'text': '数字基础设施需求持续增长', 'type': 'FACT', 'has_evidence': False, 'confidence': 0.5},
                    {'text': '业务增速可能高于行业平均水平', 'type': 'FORECAST', 'has_evidence': False, 'confidence': 0.3},
                ],
                'evidence': [],
                'risk_hits': [
                    {'rule_id': 'RULE_UNSOURCED_CLAIM', 'rule_name': '无来源事实性结论', 'risk_level': 'MEDIUM', 'action': 'REQUIRE_EVIDENCE', 'matched_text': '数字基础设施需求持续增长', 'matched_pattern': '无来源引用'},
                ],
            },
            # High risk — NEEDS_MANUAL_REVIEW
            {
                'title': '海岚能源投资价值分析',
                'original_text': '海岚能源近期获得多项政策利好，未来发展前景广阔。建议投资者重点关注该标的，可以考虑在当前价位进行配置。清洁能源板块整体趋势向好，该股有望迎来估值修复。',
                'security_code': 'DEMO004',
                'compliance_score': 38,
                'status': 'NEEDS_MANUAL_REVIEW',
                'risk_level': 'HIGH',
                'missing_risk_disclosure': True,
                'missing_evidence': True,
                'submitted_for_review': True,
                'days_ago': 2,
                'claims': [
                    {'text': '海岚能源近期获得多项政策利好', 'type': 'FACT', 'has_evidence': False, 'confidence': 0.4},
                    {'text': '未来发展前景广阔', 'type': 'FORECAST', 'has_evidence': False, 'confidence': 0.2},
                    {'text': '建议投资者重点关注该标的', 'type': 'GUIDANCE', 'has_evidence': False, 'confidence': 0.8},
                    {'text': '可以考虑在当前价位进行配置', 'type': 'GUIDANCE', 'has_evidence': False, 'confidence': 0.8},
                ],
                'evidence': [],
                'risk_hits': [
                    {'rule_id': 'RULE_DIRECT_RECOMMENDATION', 'rule_name': '直接荐股表达', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '建议投资者重点关注该标的', 'matched_pattern': '建议'},
                ],
            },
            # High risk — NEEDS_MANUAL_REVIEW
            {
                'title': '远景新材操作策略建议',
                'original_text': '远景新材已完成关键技术突破，预计下季度业绩将大幅增长。建议在当前价格区间进行重点配置，该标的具备中长期投资价值。',
                'security_code': 'DEMO002',
                'compliance_score': 42,
                'status': 'NEEDS_MANUAL_REVIEW',
                'risk_level': 'HIGH',
                'missing_risk_disclosure': True,
                'missing_evidence': True,
                'submitted_for_review': True,
                'days_ago': 3,
                'claims': [
                    {'text': '远景新材已完成关键技术突破', 'type': 'FACT', 'has_evidence': False, 'confidence': 0.4},
                    {'text': '预计下季度业绩将大幅增长', 'type': 'FORECAST', 'has_evidence': False, 'confidence': 0.2},
                    {'text': '建议在当前价格区间进行重点配置', 'type': 'GUIDANCE', 'has_evidence': False, 'confidence': 0.9},
                ],
                'evidence': [],
                'risk_hits': [
                    {'rule_id': 'RULE_DIRECT_RECOMMENDATION', 'rule_name': '直接荐股表达', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '建议在当前价格区间进行重点配置', 'matched_pattern': '重点配置'},
                    {'rule_id': 'RULE_DETERMINISTIC_FORECAST', 'rule_name': '确定性涨跌预测', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '预计下季度业绩将大幅增长', 'matched_pattern': '大幅增长'},
                ],
            },
            # Medium risk — NEEDS_REVISION
            {
                'title': '澄明医科行业竞争分析',
                'original_text': '澄明医科所在细分赛道竞争加剧，短期内可能面临毛利率压力。不过公司在研管线若顺利推进，或可打开新的成长空间。当前信息存在不确定性，请理性看待。',
                'security_code': 'DEMO003',
                'compliance_score': 72,
                'status': 'NEEDS_REVISION',
                'risk_level': 'MEDIUM',
                'missing_risk_disclosure': False,
                'missing_evidence': True,
                'submitted_for_review': False,
                'days_ago': 4,
                'claims': [
                    {'text': '澄明医科所在细分赛道竞争加剧', 'type': 'FACT', 'has_evidence': False, 'confidence': 0.4},
                    {'text': '短期内可能面临毛利率压力', 'type': 'FORECAST', 'has_evidence': False, 'confidence': 0.3},
                ],
                'evidence': [],
                'risk_hits': [],
            },
            # CRITICAL — BLOCKED
            {
                'title': '海岚能源短期暴利机会',
                'original_text': '【高风险检测样例，请勿作为投资依据】海岚能源明天必涨，现在建议买入，保证获得20%收益。',
                'security_code': 'DEMO004',
                'compliance_score': 5,
                'status': 'BLOCKED',
                'risk_level': 'CRITICAL',
                'missing_risk_disclosure': True,
                'missing_evidence': True,
                'submitted_for_review': True,
                'days_ago': 1,
                'claims': [
                    {'text': '海岚能源明天必涨', 'type': 'FORECAST', 'has_evidence': False, 'confidence': 0.95},
                    {'text': '现在建议买入', 'type': 'GUIDANCE', 'has_evidence': False, 'confidence': 0.95},
                    {'text': '保证获得20%收益', 'type': 'FORECAST', 'has_evidence': False, 'confidence': 1.0},
                ],
                'evidence': [],
                'risk_hits': [
                    {'rule_id': 'RULE_DIRECT_RECOMMENDATION', 'rule_name': '直接荐股表达', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '建议买入', 'matched_pattern': '建议买入'},
                    {'rule_id': 'RULE_RETURN_PROMISE', 'rule_name': '收益承诺', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '保证获得20%收益', 'matched_pattern': '保证收益'},
                    {'rule_id': 'RULE_DETERMINISTIC_FORECAST', 'rule_name': '确定性涨跌预测', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '明天必涨', 'matched_pattern': '必涨'},
                ],
            },
            # High risk — NEEDS_MANUAL_REVIEW
            {
                'title': '星河智算短线机会提示',
                'original_text': '有消息称星河智算即将获得大额订单，内部人士透露该信息尚未公开。近期股价表现活跃，建议关注短线机会。',
                'security_code': 'DEMO001',
                'compliance_score': 30,
                'status': 'NEEDS_MANUAL_REVIEW',
                'risk_level': 'HIGH',
                'missing_risk_disclosure': True,
                'missing_evidence': True,
                'submitted_for_review': True,
                'days_ago': 0,
                'claims': [
                    {'text': '有消息称星河智算即将获得大额订单', 'type': 'FACT', 'has_evidence': False, 'confidence': 0.2},
                    {'text': '内部人士透露该信息尚未公开', 'type': 'FACT', 'has_evidence': False, 'confidence': 0.1},
                    {'text': '建议关注短线机会', 'type': 'GUIDANCE', 'has_evidence': False, 'confidence': 0.8},
                ],
                'evidence': [],
                'risk_hits': [
                    {'rule_id': 'RULE_INSIDER_HINT', 'rule_name': '内幕信息暗示', 'risk_level': 'CRITICAL', 'action': 'BLOCK', 'matched_text': '内部人士透露', 'matched_pattern': '内部消息'},
                    {'rule_id': 'RULE_DIRECT_RECOMMENDATION', 'rule_name': '直接荐股表达', 'risk_level': 'HIGH', 'action': 'MANUAL_REVIEW', 'matched_text': '建议关注短线机会', 'matched_pattern': '建议'},
                ],
            },
            # Medium risk — NEEDS_REVISION
            {
                'title': '远景新材技术路线评估',
                'original_text': '远景新材选择的技术路线在业内存在争议。部分研究机构认为该路线成本偏高，但公司方面表示已有解决方案。相关信息来自第三方研究报告，仅供参考。风险提示：技术研发存在不确定性。',
                'security_code': 'DEMO002',
                'compliance_score': 74,
                'status': 'NEEDS_REVISION',
                'risk_level': 'MEDIUM',
                'missing_risk_disclosure': False,
                'missing_evidence': False,
                'submitted_for_review': False,
                'days_ago': 5,
                'claims': [
                    {'text': '远景新材选择的技术路线在业内存在争议', 'type': 'OPINION', 'has_evidence': True, 'confidence': 0.6},
                    {'text': '部分研究机构认为该路线成本偏高', 'type': 'FACT', 'has_evidence': True, 'confidence': 0.5},
                ],
                'evidence': [
                    {'source_name': '演示研报 · 先进材料技术路线比较', 'url': '#demo-report-001', 'cred': 'C', 'summary': '虚构演示研究报告，分析不同技术路线的成本结构'},
                ],
                'risk_hits': [],
            },
            # Low risk — APPROVED
            {
                'title': '澄明医科财务数据解读',
                'original_text': '澄明医科最新演示财报显示，公司研发费用同比增长，占营业收入比例提升至15%。该数据来自公司自愿披露的阶段性信息。研发投入增加可能对短期盈利产生影响，投资者应结合自身情况审慎判断。以上不构成投资建议。',
                'security_code': 'DEMO003',
                'compliance_score': 90,
                'status': 'APPROVED',
                'risk_level': 'LOW',
                'missing_risk_disclosure': False,
                'missing_evidence': False,
                'submitted_for_review': False,
                'days_ago': 6,
                'claims': [
                    {'text': '研发费用同比增长，占营业收入比例提升至15%', 'type': 'FACT', 'has_evidence': True, 'confidence': 0.9},
                    {'text': '研发投入增加可能对短期盈利产生影响', 'type': 'OPINION', 'has_evidence': False, 'confidence': 0.6},
                    {'text': '投资者应结合自身情况审慎判断', 'type': 'RISK_DISCLOSURE', 'has_evidence': False, 'confidence': 0.9},
                ],
                'evidence': [
                    {'source_name': '演示财报 · 澄明医科阶段性财务信息', 'url': '#demo-financial-003', 'cred': 'A', 'summary': '虚构演示财务数据摘要，展示研发费用变化'},
                ],
                'risk_hits': [],
            },
        ]

        analyses = []
        for i, ad in enumerate(analyses_data):
            a = Analysis(
                title=ad['title'],
                original_text=ad['original_text'],
                security_code=ad['security_code'],
                compliance_score=ad['compliance_score'],
                status=ad['status'],
                risk_level=ad['risk_level'],
                missing_risk_disclosure=ad['missing_risk_disclosure'],
                missing_evidence=ad['missing_evidence'],
                submitted_for_review=ad['submitted_for_review'],
                created_at=days_ago(ad['days_ago']),
                updated_at=days_ago(ad['days_ago']),
            )
            db.add(a)
            db.flush()

            for c in ad['claims']:
                db.add(Claim(
                    analysis_id=a.id,
                    text=c['text'],
                    claim_type=c['type'],
                    has_evidence=c['has_evidence'],
                    confidence=c['confidence'],
                ))

            for e in ad.get('evidence', []):
                db.add(Evidence(
                    analysis_id=a.id,
                    source_name=e['source_name'],
                    source_url=e.get('url', '#'),
                    credibility=e['cred'],
                    summary=e['summary'],
                    is_demo=True,
                ))

            for rh in ad.get('risk_hits', []):
                db.add(RiskHit(
                    analysis_id=a.id,
                    rule_id=rh['rule_id'],
                    rule_name=rh['rule_name'],
                    risk_level=rh['risk_level'],
                    action=rh['action'],
                    matched_text=rh.get('matched_text', ''),
                    matched_pattern=rh.get('matched_pattern', ''),
                ))

            analyses.append(a)

        db.flush()

        # ── Review Tasks ───────────────────────────────────────
        task_number = 1001
        review_tasks = []
        for a in analyses:
            if a.submitted_for_review:
                rt = ReviewTask(
                    task_number=f'RT-{task_number}',
                    analysis_id=a.id,
                    title=a.title,
                    security_code=a.security_code,
                    compliance_score=a.compliance_score,
                    risk_level=a.risk_level,
                    status=a.status,
                    reviewer='compliance.reviewer' if a.status not in ('APPROVED', 'NEEDS_REVISION') else None,
                    created_at=a.created_at,
                    updated_at=a.updated_at,
                )
                db.add(rt)
                review_tasks.append(rt)
                task_number += 1

        db.flush()

        # ── Review Decisions & Audit Logs ──────────────────────
        decisions_data = [
            {'task_idx': 0, 'action': 'BLOCK', 'comment': '内容包含明确的收益承诺和直接荐股表达，违反规则 RULE_RETURN_PROMISE 和 RULE_DIRECT_RECOMMENDATION，予以拦截。'},
            {'task_idx': 1, 'action': 'REJECT', 'comment': '内容包含直接荐股表达，且缺乏充分证据支持。请补充来源说明和风险提示后重新提交。'},
            {'task_idx': 2, 'action': 'APPROVE', 'comment': '经复核，该内容已包含必要的风险揭示，措辞审慎，予以通过。'},
        ]

        for dd in decisions_data:
            rt = review_tasks[dd['task_idx']]
            old_status = rt.status
            new_status = 'BLOCKED' if dd['action'] == 'BLOCK' else ('APPROVED' if dd['action'] == 'APPROVE' else 'NEEDS_REVISION')

            rd = ReviewDecision(
                task_id=rt.id,
                action=dd['action'],
                comment=dd['comment'],
                operator='compliance.reviewer',
                old_status=old_status,
                new_status=new_status,
            )
            db.add(rd)
            rt.status = new_status

            db.add(AuditLog(
                timestamp=rt.created_at,
                operator='compliance.reviewer',
                action=f'REVIEW_{dd["action"]}',
                entity_type='review_task',
                entity_id=rt.id,
                old_status=old_status,
                new_status=new_status,
                comment=dd['comment'],
            ))

        # Rule-change audit logs
        db.add(AuditLog(
            timestamp=days_ago(3),
            operator='content.operator',
            action='RULE_CREATED',
            entity_type='rule',
            entity_id='RULE_HIGH_RISK_PRODUCT',
            comment='新增规则：不适当的高风险产品引导',
        ))
        db.add(AuditLog(
            timestamp=days_ago(5),
            operator='content.operator',
            action='RULE_UPDATED',
            entity_type='rule',
            entity_id='RULE_DIRECT_RECOMMENDATION',
            old_status='{"risk_level": "MEDIUM"}',
            new_status='{"risk_level": "HIGH"}',
            comment='将「直接荐股表达」规则风险等级从中风险提升至高风险',
        ))

        db.commit()
        print(f'Seed complete: {len(analyses)} analyses, {len(rules)} rules, {len(review_tasks)} review tasks')
        print(f'   Audit logs: {db.query(AuditLog).count()}')
        print(f'   Run the backend with: uvicorn app.main:app --reload')

    except Exception as e:
        db.rollback()
        print(f'Seed failed: {e}')
        raise
    finally:
        db.close()


if __name__ == '__main__':
    seed()
