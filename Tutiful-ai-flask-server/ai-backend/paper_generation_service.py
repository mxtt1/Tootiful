"""
Utility helpers that connect the Tutiful_AI generation pipeline to the Flask API.
"""

from __future__ import annotations

import difflib
import io
import json
import random
import re
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Sequence, Tuple


class PaperGenerationError(Exception):
    """Raised when we cannot produce a valid Primary 6 Mathematics paper."""


# Locate the copied Tutiful_AI pipeline inside the repo (one level above this folder)
REPO_ROOT = Path(__file__).resolve().parents[2]
PIPELINE_ROOT = REPO_ROOT / "Tutiful_AI"
QUESTIONS_FILE = PIPELINE_ROOT / "final_cleaned_withtopics.json"

if not PIPELINE_ROOT.exists():
    raise RuntimeError(
        f"Tutiful_AI folder not found at {PIPELINE_ROOT}. "
        "Copy the question generation assets into the repo first."
    )

if not QUESTIONS_FILE.exists():
    raise RuntimeError(
        f"Question bank not found at {QUESTIONS_FILE}. "
        "Ensure final_cleaned_withtopics.json is present."
    )

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from final_working_generator import FinalWorkingPSLEMathPaperGenerator  # noqa: E402


TOTAL_QUESTIONS = 30
SUPPORTED_SUBJECT_KEYWORDS = ("math", "mathematics")
SUPPORTED_GRADE_KEYWORDS = ("primary 6", "primary six", "p6", "grade 6", "grade six", "6")


def _normalize_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").strip().lower())


def _load_available_topics() -> List[str]:
    with QUESTIONS_FILE.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    seen = []
    for item in data:
        topic = (item.get("topic") or "").strip()
        if topic and topic not in seen:
            seen.append(topic)
    return seen


AVAILABLE_TOPICS: List[str] = _load_available_topics()
NORMALIZED_TOPIC_MAP: Dict[str, str] = {
    _normalize_token(topic): topic for topic in AVAILABLE_TOPICS
}

TOPIC_ALIAS_MAP: Dict[str, str] = {
    "wholenumbers": "Whole Numbers & Operations",
    "wholenumbersoperations": "Whole Numbers & Operations",
    "numberpatterns": "Whole Numbers & Number Patterns",
    "fractionsmixednumbers": "Fractions & Mixed Numbers",
    "fractionsandmixednumbers": "Fractions & Mixed Numbers",
    "fractions": "Fractions",
    "decimals": "Decimals",
    "percentage": "Percentage",
    "percentages": "Percentage",
    "ratio": "Ratio & Proportion",
    "ratioandproportion": "Ratio & Proportion",
    "algebra": "Algebra",
    "algebraequations": "Algebra & Equations",
    "geometry": "Geometry & Measurement",
    "measurement": "Measurement (Length, Mass, Time)",
    "perimeter": "Perimeter & Area",
    "area": "Perimeter & Area",
    "volume": "Volume & Capacity",
    "speed": "Speed & Distance",
    "distance": "Speed & Distance",
    "speedrate": "Speed & Rate",
    "money": "Money & Rates",
    "rates": "Money & Rates",
    "time": "Time & Measurement",
    "dataanalysis": "Data Analysis & Average",
    "statistics": "Statistics & Average",
    "generalmathematics": "general_mathematics",
    "others": "Others",
}


def is_supported_subject(subject_name: str, grade_level: str) -> bool:
    """Return True only for Primary 6 Mathematics."""
    subject_token = _normalize_token(subject_name)
    grade_token = _normalize_token(str(grade_level))

    if not subject_token or not grade_token:
        return False

    if not any(keyword in subject_token for keyword in SUPPORTED_SUBJECT_KEYWORDS):
        return False

    return any(keyword in grade_token for keyword in SUPPORTED_GRADE_KEYWORDS)


def get_available_topics() -> List[str]:
    """Expose the list of PSLE Math topics for client consumption."""
    return AVAILABLE_TOPICS


def normalize_topics(raw_topics) -> List[str]:
    """Convert incoming topics (list or comma-separated string) into canonical names."""
    if raw_topics is None:
        raise PaperGenerationError("Please provide at least one topic.")

    if isinstance(raw_topics, (list, tuple)):
        tokens = [str(token).strip() for token in raw_topics]
    else:
        tokens = [token.strip() for token in str(raw_topics).split(",")]

    tokens = [token for token in tokens if token]

    if not tokens:
        raise PaperGenerationError("Please provide at least one topic.")

    canonical_topics: List[str] = []
    for token in tokens:
        canonical = _canonical_topic(token)
        if not canonical:
            raise PaperGenerationError(
                f"Topic '{token}' is not available for Primary 6 Mathematics."
            )
        if canonical not in canonical_topics:
            canonical_topics.append(canonical)

    if len(canonical_topics) > TOTAL_QUESTIONS:
        raise PaperGenerationError(
            "Please select at most 30 topics so the generator can allocate questions."
        )

    return canonical_topics


def generate_primary6_math_pdf(
    subject_name: str,
    grade_level: str,
    topics: Sequence[str],
) -> Tuple[io.BytesIO, Dict[str, str]]:
    """Generate a Primary 6 Math paper and return the PDF bytes + metadata."""
    if not is_supported_subject(subject_name, grade_level):
        raise PaperGenerationError("Only Primary 6 Mathematics is supported at the moment.")

    if not topics:
        raise PaperGenerationError("Please choose at least one topic.")

    topic_distribution = _build_topic_distribution(list(topics), TOTAL_QUESTIONS)
    generator = FinalWorkingPSLEMathPaperGenerator(str(QUESTIONS_FILE))

    paper_data = generator.generate_practice_paper(
        title=_build_title(subject_name),
        total_questions=TOTAL_QUESTIONS,
        topics_distribution=topic_distribution,
    )

    if not paper_data:
        raise PaperGenerationError(
            "We could not generate a paper right now. Please try again in a moment."
        )

    pdf_path = _render_pdf(generator, paper_data)
    pdf_bytes = pdf_path.read_bytes()
    pdf_path.unlink(missing_ok=True)

    buffer = io.BytesIO(pdf_bytes)
    buffer.seek(0)

    metadata = {
        "title": paper_data.get("title", "Primary 6 Mathematics Practice Paper"),
        "topics": ", ".join(paper_data.get("topics_covered", topics)),
        "generatedAt": paper_data.get("generated_at", datetime.now(timezone.utc).isoformat()),
        "questionCount": str(paper_data.get("total_questions", TOTAL_QUESTIONS)),
    }
    return buffer, metadata


def _canonical_topic(topic: str) -> str | None:
    token = _normalize_token(topic)
    if not token:
        return None

    if token in TOPIC_ALIAS_MAP:
        return TOPIC_ALIAS_MAP[token]

    if token in NORMALIZED_TOPIC_MAP:
        return NORMALIZED_TOPIC_MAP[token]

    for normalized, canonical in NORMALIZED_TOPIC_MAP.items():
        if token in normalized or normalized in token:
            return canonical

    matches = difflib.get_close_matches(topic, AVAILABLE_TOPICS, n=1, cutoff=0.65)
    return matches[0] if matches else None


def _build_topic_distribution(topics: List[str], total_questions: int) -> Dict[str, int]:
    count = len(topics)
    base, remainder = divmod(total_questions, count)
    distribution: Dict[str, int] = {topic: base for topic in topics}
    if remainder:
        topic_order = topics.copy()
        random.shuffle(topic_order)
        for topic in topic_order[:remainder]:
            distribution[topic] += 1
    return distribution


def _build_title(subject_name: str) -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return f"Primary 6 {subject_name} Practice Paper ({timestamp})"


def _render_pdf(generator: FinalWorkingPSLEMathPaperGenerator, paper_data: Dict) -> Path:
    tmp_dir = Path(tempfile.gettempdir())
    pdf_path = tmp_dir / f"psle-paper-{uuid.uuid4().hex}.pdf"
    success = generator.formatter.save_to_pdf(paper_data, str(pdf_path))
    if not success or not pdf_path.exists():
        raise PaperGenerationError("Failed to render the generated paper to PDF.")
    return pdf_path
