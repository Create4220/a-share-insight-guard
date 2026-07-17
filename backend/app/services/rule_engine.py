"""Compliance rule engine.

Scoring algorithm (transparent & explainable):
  - Start at 100
  - CRITICAL hit: -45 each
  - HIGH hit: -25 each
  - MEDIUM hit: -12 each
  - LOW hit: -5 each
  - Missing risk disclosure: -10
  - Missing source/evidence: -15
  - At least one high-authority source: +5
  - Final score clamped to [0, 100]

Status decision:
  - Any BLOCK or CRITICAL risk → BLOCKED
  - Any HIGH risk → NEEDS_MANUAL_REVIEW
  - Score < 70 → NEEDS_REVISION
  - Otherwise → APPROVED
"""

import re
from typing import Optional

from sqlalchemy.orm import Session

from app.models.rule import Rule as RuleModel


# ── Text splitting ──────────────────────────────────────────────

def split_sentences(text: str) -> list[str]:
    """Split Chinese text into sentences by punctuation."""
    # Split on Chinese/English sentence-ending punctuation
    parts = re.split(r'(?<=[。！？；\n!?;])', text)
    return [p.strip() for p in parts if p.strip()]


# ── Claim classification ────────────────────────────────────────

GUIDANCE_KEYWORDS = [
    '建议', '推荐', '配置', '建仓', '买入', '卖出', '关注',
    '操作', '介入', '参与', '减仓', '加仓', '持有',
]

FORECAST_KEYWORDS = [
    '预计', '预测', '有望', '或将', '可能', '将会',
    '上涨', '下跌', '涨幅', '跌幅', '增长', '回落',
    '反弹', '突破', '走势', '趋势',
]

RISK_DISCLOSURE_KEYWORDS = [
    '风险', '不构成', '仅供参考', '投资建议', '谨慎',
    '不确定', '免责', '演示', '请勿',
]

FACT_INDICATORS = [
    '披露', '公告', '报告', '显示', '数据', '根据',
    '发布', '公布', '宣布', '表明',
]


def classify_claim(sentence: str) -> str:
    """Classify a sentence into FACT, OPINION, FORECAST, GUIDANCE, or RISK_DISCLOSURE."""
    text = sentence.strip()

    # Check risk disclosure first (safety language)
    if any(kw in text for kw in RISK_DISCLOSURE_KEYWORDS):
        return 'RISK_DISCLOSURE'

    # Check guidance (action-oriented language)
    if any(kw in text for kw in GUIDANCE_KEYWORDS):
        return 'GUIDANCE'

    # Check forecast (predictive language)
    if any(kw in text for kw in FORECAST_KEYWORDS):
        return 'FORECAST'

    # Check fact indicators
    if any(kw in text for kw in FACT_INDICATORS):
        return 'FACT'

    # Default to opinion
    return 'OPINION'


# ── Risk detection ──────────────────────────────────────────────

def detect_pattern_matches(text: str, patterns: list[str]) -> list[str]:
    """Find which patterns match in the text."""
    matches = []
    for pattern in patterns:
        if pattern in text:
            matches.append(pattern)
    return matches


def run_risk_detection(
    text: str,
    rules: list[RuleModel],
) -> list[dict]:
    """Run all enabled rules against text and return risk hits.

    Each hit: {rule_id, rule_name, risk_level, action, matched_text, matched_pattern}
    """
    hits = []

    for rule in rules:
        if not rule.enabled:
            continue

        patterns = rule.patterns or []
        matches = detect_pattern_matches(text, patterns)

        for pattern in matches:
            # Extract surrounding context (~30 chars)
            idx = text.find(pattern)
            start = max(0, idx - 15)
            end = min(len(text), idx + len(pattern) + 15)
            context = text[start:end]

            hits.append({
                'rule_id': rule.rule_id,
                'rule_name': rule.name,
                'risk_level': rule.risk_level,
                'action': rule.action,
                'matched_text': context.strip(),
                'matched_pattern': pattern,
            })

    return hits


# ── Heuristic checks ────────────────────────────────────────────

def check_risk_disclosure(text: str) -> bool:
    """Check if text contains risk disclosure language."""
    disclosure_patterns = [
        '风险', '不构成', '仅供参考', '投资建议', '谨慎',
        '免责', '请勿作为投资依据',
    ]
    return any(p in text for p in disclosure_patterns)


def check_evidence_presence(text: str) -> bool:
    """Heuristic check for source/evidence citations."""
    evidence_patterns = [
        '根据', '公告', '报告', '披露', '数据显示',
        '来源', '引用', '据',
    ]
    return any(p in text for p in evidence_patterns)


# ── Scoring ─────────────────────────────────────────────────────

SCORE_DEDUCTIONS = {
    'CRITICAL': 45,
    'HIGH': 25,
    'MEDIUM': 12,
    'LOW': 5,
}


def compute_score(
    risk_hits: list[dict],
    has_risk_disclosure: bool,
    has_evidence: bool,
    has_high_authority_source: bool = False,
) -> int:
    """Compute compliance score based on transparent rules.

    Start at 100 and deduct based on risk hits and missing elements.
    """
    score = 100

    for hit in risk_hits:
        level = hit['risk_level']
        deduction = SCORE_DEDUCTIONS.get(level, 0)
        score -= deduction

    if not has_risk_disclosure:
        score -= 10

    if not has_evidence:
        score -= 15

    if has_high_authority_source:
        score += 5

    return max(0, min(100, score))


def determine_status(risk_hits: list[dict], score: int) -> str:
    """Determine review status from risk hits and score.

    - BLOCK action or CRITICAL risk → BLOCKED
    - HIGH risk → NEEDS_MANUAL_REVIEW
    - Score < 70 → NEEDS_REVISION
    - Otherwise → APPROVED
    """
    has_block = any(
        h['action'] == 'BLOCK' or h['risk_level'] == 'CRITICAL'
        for h in risk_hits
    )
    if has_block:
        return 'BLOCKED'

    has_high = any(h['risk_level'] == 'HIGH' for h in risk_hits)
    if has_high:
        return 'NEEDS_MANUAL_REVIEW'

    if score < 70:
        return 'NEEDS_REVISION'

    return 'APPROVED'


def determine_risk_level(risk_hits: list[dict]) -> str:
    """Determine the highest risk level from hits."""
    levels = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
    max_level = 'LOW'
    max_val = 0
    for hit in risk_hits:
        val = levels.get(hit['risk_level'], 0)
        if val > max_val:
            max_val = val
            max_level = hit['risk_level']
    return max_level


# ── Revision suggestions ────────────────────────────────────────

REVISION_TEMPLATES = {
    'RULE_DIRECT_RECOMMENDATION': {
        'reason': '检测到直接荐股或操作引导表达。建议将操作导向措辞替换为客观信息描述，并添加「不构成投资建议」的免责声明。',
    },
    'RULE_RETURN_PROMISE': {
        'reason': '检测到收益承诺或保证收益表达。必须删除所有确定性收益承诺，替换为「过往表现不代表未来收益」等合规表述。',
    },
    'RULE_DETERMINISTIC_FORECAST': {
        'reason': '检测到确定性涨跌预测。建议将确定性预测改为概率性表述，例如使用「可能存在波动」「受多种因素影响」等措辞。',
    },
    'RULE_INDUCEMENT_TRADING': {
        'reason': '检测到诱导性交易措辞。建议删除此类表述，改为客观的市场信息描述。',
    },
    'RULE_UNSOURCED_CLAIM': {
        'reason': '检测到缺乏来源的事实性结论。建议为关键事实性陈述补充引用来源或标注为「据公开信息」。',
    },
    'RULE_MISSING_RISK_DISCLOSURE': {
        'reason': '内容缺少风险揭示。建议添加「证券市场存在风险，投资需谨慎」「本内容不构成投资建议」等风险提示。',
    },
    'RULE_HIGH_RISK_PRODUCT': {
        'reason': '检测到对高风险产品的不当引导。建议删除暗示低风险的表述，并添加适当风险警示。',
    },
    'RULE_INSIDER_HINT': {
        'reason': '检测到内幕信息暗示。必须删除所有暗示拥有非公开信息的表述，仅使用已公开披露的信息。',
    },
}


def generate_revision_suggestions(
    text: str,
    risk_hits: list[dict],
) -> list[dict]:
    """Generate compliance revision suggestions based on risk hits."""
    suggestions = []
    seen_rules = set()

    for hit in risk_hits:
        rule_id = hit['rule_id']
        if rule_id in seen_rules:
            continue
        seen_rules.add(rule_id)

        template = REVISION_TEMPLATES.get(rule_id)
        if template:
            suggestions.append({
                'original_text': hit.get('matched_text', ''),
                'suggested_text': '[建议修改或删除相关内容，并添加合规表述]',
                'reason': template['reason'],
            })

    # Add general risk disclosure suggestion if missing
    if not check_risk_disclosure(text):
        suggestions.append({
            'original_text': '',
            'suggested_text': '证券市场存在风险，投资需谨慎。本内容不构成任何证券投资建议。',
            'reason': '建议在内容末尾添加标准风险揭示和免责声明。',
        })

    return suggestions


# ── Full analysis pipeline ──────────────────────────────────────

def analyze_text(
    text: str,
    db: Session,
    security_code: Optional[str] = None,
    title: Optional[str] = None,
) -> dict:
    """Run the complete analysis pipeline on a text.

    Returns a dict with all analysis results ready for API response.
    """
    # 1. Split into sentences
    sentences = split_sentences(text)

    # 2. Load enabled rules
    rules = db.query(RuleModel).filter(RuleModel.enabled == True).all()

    # 3. Classify claims
    claims = []
    for sentence in sentences:
        claim_type = classify_claim(sentence)
        claims.append({
            'text': sentence,
            'claim_type': claim_type,
            'has_evidence': claim_type == 'FACT' and check_evidence_presence(sentence),
            'confidence': 0.5 if claim_type in ('OPINION', 'FORECAST') else 0.8,
        })

    # 4. Run risk detection
    risk_hits = run_risk_detection(text, rules)

    # 5. Heuristic checks
    has_risk_disclosure = check_risk_disclosure(text)
    has_evidence = check_evidence_presence(text)

    # Check for high-authority source (credibility A or B in the text)
    has_high_authority = any(
        kw in text for kw in ['公告', '披露', '定期报告', '官方']
    )

    # 6. Compute score
    score = compute_score(risk_hits, has_risk_disclosure, has_evidence, has_high_authority)

    # 7. Determine status & risk level
    status = determine_status(risk_hits, score)
    risk_level = determine_risk_level(risk_hits) if risk_hits else 'LOW'

    # 8. Generate revision suggestions
    revision_suggestions = generate_revision_suggestions(text, risk_hits)

    return {
        'title': title,
        'original_text': text,
        'security_code': security_code,
        'compliance_score': score,
        'status': status,
        'risk_level': risk_level,
        'claims': claims,
        'risk_hits': risk_hits,
        'evidence': [],  # Evidence is provided by seed data, not real-time analysis
        'revision_suggestions': revision_suggestions,
        'missing_risk_disclosure': not has_risk_disclosure,
        'missing_evidence': not has_evidence,
    }
