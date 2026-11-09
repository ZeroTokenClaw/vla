"""Lite NLP: dictionary + regex NER / keyword classification / co-occurrence relations.

Processes the *actual* input text — not a fixed canned response.
"""

from __future__ import annotations

import re
from typing import Any

ENTITY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("DATE", re.compile(r"\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2}")),
    ("PHONE", re.compile(r"1[3-9]\d(\*{4}|\d{4})\d{4}")),
    ("ORDER_ID", re.compile(r"[A-Z]{2}-[A-Z]+-\d+")),
    ("PERSON", re.compile(r"(张|李|王|刘|陈|杨|黄|赵)[\u4e00-\u9fff]?某")),
    ("ADDRESS", re.compile(r"[\u4e00-\u9fff]{2,8}(市|区|县)[\u4e00-\u9fff0-9]{2,20}(路|街|号)")),
    ("ORG", re.compile(r"[\u4e00-\u9fff]{2,12}(公司|科技|物流|客服)")),
]

CLASS_RULES: list[tuple[str, list[str]]] = [
    ("物流投诉", ["物流", "延误", "快递", "配送"]),
    ("退款售后", ["退款", "退货", "售后"]),
    ("改派地址", ["改派", "地址", "更换收货"]),
    ("其他", []),
]


def annotate_text(text: str) -> dict[str, Any]:
    entities: list[dict[str, Any]] = []
    for etype, pat in ENTITY_PATTERNS:
        for m in pat.finditer(text or ""):
            entities.append(
                {
                    "id": f"e-{etype}-{m.start()}",
                    "text": m.group(0),
                    "type": etype,
                    "start": m.start(),
                    "end": m.end(),
                    "conf": 0.82,
                }
            )
    entities.sort(key=lambda x: x["start"])

    label = "其他"
    conf = 0.55
    for name, kws in CLASS_RULES:
        if not kws:
            continue
        hits = sum(1 for k in kws if k in (text or ""))
        if hits:
            label = name
            conf = min(0.95, 0.6 + 0.1 * hits)
            break

    relations: list[dict[str, Any]] = []
    persons = [e for e in entities if e["type"] == "PERSON"]
    orgs = [e for e in entities if e["type"] == "ORG"]
    if persons and orgs:
        relations.append(
            {
                "id": "r-1",
                "type": "投诉对象",
                "subj": persons[0]["id"],
                "obj": orgs[0]["id"],
                "conf": 0.7,
            }
        )

    return {
        "raw_text": text,
        "classification": {"label": label, "conf": round(conf, 3)},
        "entities": entities,
        "relations": relations,
        "model_version": "lite-nlp-0.1",
        "device": "cpu",
    }
