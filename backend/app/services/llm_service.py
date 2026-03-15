"""
LLM Service — GPT-4o 기반 파이프라인 핵심 로직
요약 추출 → 기획 생성 → 대본 생성 → 씬 분해 → 썸네일 생성
"""
import json
from typing import Any
from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

CONTENT_TYPE_PROMPTS = {
    "PROBLEM": "시청자가 공감할 수 있는 문제를 제기하고 궁금증을 유발하는",
    "SOLUTION": "바이칼시스템즈가 제공하는 솔루션을 명확하게 설명하는",
    "CASE": "실제 고객사 구축 사례를 구체적인 결과와 함께 소개하는",
    "COMPARE": "기존 방식과 바이칼 방식을 대비시켜 우위를 증명하는",
    "SALES": "시청자가 즉시 문의하도록 유도하는 강력한 CTA 중심의",
    "BRAND": "대표가 직접 전하는 진정성 있는 브랜드 스토리 형식의",
}


async def extract_summary(source_text: str) -> dict[str, Any]:
    """원문에서 핵심 메시지 추출"""
    prompt = f"""아래 텍스트에서 쇼츠 콘텐츠 제작을 위한 핵심 정보를 JSON으로 추출하세요.

텍스트:
{source_text[:3000]}

반드시 아래 JSON 형식으로만 응답하세요:
{{
  "key_messages": ["메시지1", "메시지2", "메시지3"],
  "target_audience": "핵심 타겟 독자층",
  "main_value": "핵심 가치/차별점",
  "product_name": "제품/서비스 이름",
  "problem": "해결하는 문제",
  "solution": "제공하는 솔루션",
  "results": "구체적 결과/성과 (있을 경우)"
}}"""

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "당신은 B2B IT 마케팅 전문가입니다. JSON만 출력하세요."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    return json.loads(response.choices[0].message.content)


async def generate_plan(summary: dict, content_type: str) -> dict[str, Any]:
    """쇼츠 기획 생성"""
    type_desc = CONTENT_TYPE_PROMPTS.get(content_type, "")

    prompt = f"""아래 요약 정보를 바탕으로 {type_desc} 30초 쇼츠 기획을 JSON으로 생성하세요.

요약 정보:
{json.dumps(summary, ensure_ascii=False, indent=2)}

반드시 아래 JSON 형식으로만 응답하세요:
{{
  "title": "쇼츠 제목 (30자 이내)",
  "hook": "첫 3초 후크 문장 (시청자를 붙잡는 강렬한 한 문장)",
  "structure": [
    {{"order": 1, "label": "후크", "content": "첫 3초 내용"}},
    {{"order": 2, "label": "문제/배경", "content": "5-7초 내용"}},
    {{"order": 3, "label": "핵심1", "content": "5-7초 내용"}},
    {{"order": 4, "label": "핵심2", "content": "5-7초 내용"}},
    {{"order": 5, "label": "결과/증거", "content": "5초 내용"}},
    {{"order": 6, "label": "CTA", "content": "마지막 3초 행동 유도"}}
  ],
  "cta": "CTA 문장 (구체적 행동 유도)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "thumbnail_options": ["썸네일텍스트1 (15자이내)", "썸네일텍스트2", "썸네일텍스트3"],
  "hashtags": ["바이칼시스템즈", "IT컨설팅", "관련태그1", "관련태그2", "관련태그3"]
}}"""

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "당신은 숏폼 콘텐츠 기획 전문가입니다. JSON만 출력하세요."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.6,
    )
    return json.loads(response.choices[0].message.content)


async def generate_script(plan: dict, content_type: str) -> dict[str, Any]:
    """쇼츠 대본 생성"""
    type_desc = CONTENT_TYPE_PROMPTS.get(content_type, "")

    prompt = f"""아래 기획을 바탕으로 {type_desc} 쇼츠 대본을 JSON으로 생성하세요.

기획:
{json.dumps(plan, ensure_ascii=False, indent=2)}

조건:
- 총 대본 길이: 250~350자 (30초 분량)
- 1인칭 구어체 (바이칼시스템즈 화자)
- 각 씬은 1~2문장, 5~7초 분량
- 자막에 들어갈 텍스트는 15자 이내로

반드시 아래 JSON 형식으로만 응답하세요:
{{
  "hook": "후크 문장",
  "body": "전체 대본 (씬 구분 없는 흐름 텍스트)",
  "cta": "CTA 문장",
  "scenes": [
    {{"order": 1, "text": "씬1 대사", "caption": "자막텍스트 (15자이내)", "duration": 5, "visual_hint": "배경/화면 설명"}},
    {{"order": 2, "text": "씬2 대사", "caption": "자막텍스트", "duration": 6, "visual_hint": "배경 설명"}},
    {{"order": 3, "text": "씬3 대사", "caption": "자막텍스트", "duration": 5, "visual_hint": ""}},
    {{"order": 4, "text": "씬4 대사", "caption": "자막텍스트", "duration": 6, "visual_hint": ""}},
    {{"order": 5, "text": "씬5 대사", "caption": "자막텍스트", "duration": 5, "visual_hint": ""}},
    {{"order": 6, "text": "씬6 대사 (CTA)", "caption": "CTA자막", "duration": 4, "visual_hint": "바이칼 로고 + 연락처"}}
  ]
}}"""

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "당신은 숏폼 영상 대본 작가입니다. JSON만 출력하세요."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    return json.loads(response.choices[0].message.content)
