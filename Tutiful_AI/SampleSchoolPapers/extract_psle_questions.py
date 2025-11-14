import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import pdfplumber
import pypdfium2
import pytesseract
from PIL import ImageOps


TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

QUESTION_START_PATTERN = re.compile(
    r"^\s*(?:q(?:uestion)?\s*)?(\d{1,3})(?:\s*[\.\-:,]|\s{2,})\s*(.*)",
    re.IGNORECASE,
)
QUESTION_START_PAREN_PATTERN = re.compile(
    r"^\s*(?:q(?:uestion)?\s*)?(\d{1,3})\)\s*(.*)",
    re.IGNORECASE,
)
INLINE_OPTION_PATTERN = re.compile(
    r"^\s*\(*\s*([1-5]|[A-Ea-e])(?:\s*[^A-Za-z0-9]{0,2}\s+|\s{2,})"
)
OPTION_MARKER_PATTERN = re.compile(
    r"^\s*\(*\s*([1-5]|[A-Ea-e])(?:\s*[^A-Za-z0-9]{0,2}|\s{2,})?\s*$"
)
SECTION_PATTERN = re.compile(r"^\s*section\s+[ab]", re.IGNORECASE)

NOISE_SNIPPETS = [
    "www.testpapersfree.com",
    "name:",
    "class:",
    "ans:",
    "eee",
    "bp-",
    "bp~",
    "mathematics paper",
    "mathematics examination",
    "parent's signature",
    "question booklet",
    "answer all questions",
    "ministry of education",
    "singapore primary school",
    "paper 1",
    "paper 2",
    "this question paper consists of",
]

COMMON_CORRECTIONS = {
    "hunan": "human",
    "ariswer": "answer",
    "cany": "carry",
    "maths": "Maths",
    "gue": "Guo",
    "schoot": "school",
}

QUESTION_KEYWORDS = [
    "what",
    "which",
    "find",
    "calculate",
    "determine",
    "solve",
    "how",
    "many",
    "much",
    "value",
    "number",
    "numbers",
    "sum",
    "difference",
    "product",
    "total",
    "fraction",
    "fractions",
    "decimal",
    "decimals",
    "percentage",
    "percent",
    "ratio",
    "average",
    "mean",
    "perimeter",
    "area",
    "volume",
    "length",
    "mass",
    "time",
    "distance",
    "speed",
    "rate",
    "round",
    "estimate",
    "simplify",
    "evaluate",
    "express",
    "write",
    "draw",
    "complete",
    "compare",
    "show",
    "figure",
    "diagram",
    "angle",
    "angles",
]


TOPIC_KEYWORDS: Dict[str, Iterable[str]] = {
    "Whole Numbers & Number Patterns": [
        "whole number",
        "place value",
        "thousand",
        "hundred",
        "ones",
        "tens",
        "difference",
        "sum",
        "product",
        "remainder",
        "round",
        "estimate",
        "pattern",
        "sequence",
        "term",
    ],
    "Factors & Multiples": [
        "factor",
        "multiple",
        "common factor",
        "hcf",
        "gcf",
        "highest common factor",
        "lowest common multiple",
        "lcm",
        "prime",
        "composite",
    ],
    "Fractions & Mixed Numbers": [
        "fraction",
        "numerator",
        "denominator",
        "mixed number",
        "improper",
        "simplify",
        "simplified fraction",
        "equal fraction",
        "add the fractions",
    ],
    "Decimals": [
        "decimal",
        "decimal place",
        "nearest tenth",
        "nearest hundredth",
        "hundredths",
        "tenths",
    ],
    "Percentage": [
        "%",
        "percent",
        "percentage",
        "gst",
        "discount",
        "increase by",
        "decrease by",
    ],
    "Ratio & Proportion": [
        "ratio",
        "proportion",
        "share equally",
        "divide equally",
        "part :",
        "part to",
        "increased ratio",
        "reduced ratio",
    ],
    "Rate & Speed": [
        "rate",
        "per hour",
        "per minute",
        "per second",
        "speed",
        "km/h",
        "km per",
        "m/s",
        "metres per",
        "litres per",
    ],
    "Algebra & Equations": [
        "algebra",
        "expression",
        "equation",
        "unknown",
        "variable",
        "solve for",
        "value of x",
        "value of y",
        "x =",
        "y =",
    ],
    "Financial Arithmetic (Money)": [
        "$",
        "dollar",
        "cents",
        "money",
        "cost",
        "price",
        "paid",
        "change",
        "profit",
        "loss",
        "sold",
        "bought",
    ],
    "Measurement (Length, Mass, Time)": [
        "metre",
        "meter",
        "centimetre",
        "centimeter",
        "millimetre",
        "millimeter",
        "kilogram",
        "kg",
        "gram",
        "g",
        "mass",
        "weigh",
        "length",
        "breadth",
        "height",
        "time",
        "minute",
        "minutes",
        "hour",
        "hours",
        "clock",
        "elapsed",
        "duration",
    ],
    "Perimeter & Area": [
        "perimeter",
        "area",
        "square centimetre",
        "square meter",
        "cm2",
        "m2",
        "surface area",
        "rectangular",
        "triangle",
        "parallelogram",
    ],
    "Volume & Capacity": [
        "volume",
        "capacity",
        "litre",
        "liter",
        "ml",
        "cm3",
        "cubic",
        "tank",
        "container",
        "pour",
        "water level",
    ],
    "Geometry (Angles & Shapes)": [
        "angle",
        "triangle",
        "isosceles",
        "scalene",
        "right angle",
        "quadrilateral",
        "parallel",
        "perpendicular",
        "polygon",
        "diagonal",
        "straight line",
        "symmetry",
    ],
    "Circles": [
        "circle",
        "radius",
        "diameter",
        "circumference",
        "arc",
        "sector",
        "chord",
    ],
    "Data Analysis & Average": [
        "average",
        "mean",
        "median",
        "mode",
        "graph",
        "table",
        "chart",
        "pictogram",
        "survey",
        "data",
    ],
    "Miscellaneous / Logical Reasoning": [
        "puzzle",
        "who is",
        "logic",
        "age",
        "younger",
        "older",
        "difference in ages",
    ],
}

TOPIC_FALLBACK = "Others"


@dataclass
class Question:
    source_pdf: str
    question_number: Optional[str]
    text: str
    page_start: int
    topic: str = field(default=TOPIC_FALLBACK)
    options: List[str] = field(default_factory=list)
    image_paths: List[str] = field(default_factory=list)


def is_noise_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    lowered = stripped.lower()
    if SECTION_PATTERN.match(lowered):
        return True
    if OPTION_MARKER_PATTERN.match(stripped):
        return True
    if lowered in {"p1", "p2", "bp", "pp"}:
        return True
    if not re.search(r"[A-Za-z0-9°]", stripped):
        return True
    compact = re.sub(r"[^a-z0-9%]+", "", lowered)
    for snippet in NOISE_SNIPPETS:
        snippet_compact = re.sub(r"[^a-z0-9%]+", "", snippet.lower())
        if not snippet_compact:
            continue
        if compact == snippet_compact:
            return True
        if compact.startswith(snippet_compact) and len(compact) <= len(
            snippet_compact
        ) + 4:
            return True
    return False


def looks_like_question_text(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    lower = stripped.lower()
    if "?" in stripped or ":" in stripped:
        return True
    for keyword in QUESTION_KEYWORDS:
        if keyword in lower:
            return True
    if len(stripped) >= 25:
        return True
    word_like = re.findall(r"[A-Za-z]+", stripped)
    if len(word_like) >= 2:
        return True
    return False


def normalise_line(line: str) -> str:
    cleaned = (
        line.replace('\ufffd', '\xb0')
        .replace('~', '-')
        .replace('\xe2\u20ac\u2122', "'")
        .replace('\xe2\u20ac\u0153', '"')
        .replace('\xe2\u20ac\x9d', '"')
        .replace('\xe2\u20ac\u201d', '-')
        .replace('\xe2\u20ac\u201c', '-')
        .replace('\xc2', '')
        .replace('???', "'")
        .replace('???', '"')
        .replace('???', '"')
        .replace('???', '-')
        .replace('???', '-')
        .replace('|', ' ')
    )
    cleaned = cleaned.strip()
    return cleaned


def apply_corrections(text: str) -> str:
    cleaned = text
    for wrong, right in COMMON_CORRECTIONS.items():
        cleaned = re.sub(
            rf"\b{re.escape(wrong)}\b", right, cleaned, flags=re.IGNORECASE
        )
    cleaned = re.sub(r"(\d)\s*'\s*(\d)", r"\1 - \2", cleaned)
    cleaned = re.sub(r"\s+([,.;:?!])", r"\1", cleaned)
    cleaned = re.sub(r"\s{2,}", ' ', cleaned)
    return cleaned.strip()


def iter_page_images(
    pdf_path: Path, max_pages: Optional[int] = None
) -> Iterable[tuple[int, "Image.Image"]]:
    """Yield (page_index, PIL image) tuples, falling back to PDFium as needed."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            if total_pages > 0:
                limit = total_pages if max_pages is None else min(max_pages, total_pages)
                for page_index in range(limit):
                    page = pdf.pages[page_index]
                    pil_image = page.to_image(resolution=220).original.convert("L")
                    yield page_index, pil_image
                return
    except Exception as exc:
        print(f"  pdfplumber fallback on {pdf_path.name}: {exc}")

    print(f"  Using PDFium renderer for {pdf_path.name}")
    doc = pypdfium2.PdfDocument(str(pdf_path))
    try:
        total_pages = len(doc)
        if total_pages == 0:
            return
        limit = total_pages if max_pages is None else min(max_pages, total_pages)
        scale = 220 / 72  # ~220 DPI
        for page_index in range(limit):
            page = doc.get_page(page_index)
            bitmap = page.render(scale=scale, rotation=0)
            pil_image = bitmap.to_pil().convert("L")
            bitmap.close()
            page.close()
            yield page_index, pil_image
    finally:
        doc.close()

def parse_questions_from_pdf(
    pdf_path: Path,
    image_dir: Optional[Path] = None,
    max_pages: Optional[int] = None,
) -> List[Question]:
    questions: List[Question] = []

    if image_dir is not None:
        image_dir.mkdir(parents=True, exist_ok=True)

    current_lines: List[str] = []
    current_number: Optional[str] = None
    current_page_start: Optional[int] = None
    current_page_images: List[str] = []
    current_options: List[str] = []
    current_option_label: Optional[str] = None
    current_option_lines: List[str] = []

    def finalize_current_option() -> None:
        nonlocal current_option_label, current_option_lines, current_options
        if current_option_label is not None:
            option_text = " ".join(current_option_lines).strip()
            option_text = re.sub(r"\s+", " ", option_text)
            option_text = apply_corrections(option_text)
            if option_text:
                label = current_option_label.strip()
                formatted = (
                    option_text if not label else f"{label}) {option_text}"
                )
                current_options.append(formatted)
        current_option_label = None
        current_option_lines = []

    def finalize_current_question() -> None:
        nonlocal current_lines, current_number, current_page_start, current_page_images, current_options, current_option_label, current_option_lines
        finalize_current_option()
        if current_lines and current_number is not None:
            question_text = " ".join(current_lines).strip()
            question_text = re.sub(r"\s+", " ", question_text)
            question_text = apply_corrections(question_text)
            if question_text:
                questions.append(
                    Question(
                        source_pdf=pdf_path.name,
                        question_number=current_number,
                        text=question_text,
                        page_start=current_page_start or 1,
                        options=current_options.copy(),
                        image_paths=list(dict.fromkeys(current_page_images)),
                    )
                )
        current_lines = []
        current_number = None
        current_page_start = None
        current_page_images = []
        current_options = []
        current_option_label = None
        current_option_lines = []


    for page_index, pil_image in iter_page_images(pdf_path, max_pages=max_pages):
        pil_image = ImageOps.autocontrast(pil_image)

        page_image_path = None
        if image_dir is not None:
            image_name = f"{pdf_path.stem}_p{page_index + 1:03d}.png"
            image_path = image_dir / image_name
            if not image_path.exists():
                pil_image.convert("RGB").save(image_path)
            page_image_path = str(image_path)

        raw_text = pytesseract.image_to_string(
            pil_image, lang="eng", config="--oem 3 --psm 6"
        )
        lines = [normalise_line(line) for line in raw_text.splitlines()]

        for line in lines:
            if not line:
                finalize_current_option()
                continue

            if is_noise_line(line):
                continue

            if current_number is not None and page_image_path:
                if page_image_path not in current_page_images:
                    current_page_images.append(page_image_path)

            question_match = QUESTION_START_PATTERN.match(line)
            if not question_match:
                paren_match = QUESTION_START_PAREN_PATTERN.match(line)
                if paren_match:
                    remainder_paren = paren_match.group(2).strip()
                    if remainder_paren and not looks_like_question_text(
                        remainder_paren
                    ):
                        option_match = INLINE_OPTION_PATTERN.match(line)
                        if option_match and current_number is not None:
                            finalize_current_option()
                            current_option_label = option_match.group(1)
                            option_text = line[option_match.end():].strip()
                            current_option_lines = [option_text] if option_text else []
                            continue
                        continue
                    question_match = paren_match

            if question_match:
                finalize_current_question()
                current_number = question_match.group(1)
                current_page_start = page_index + 1
                current_page_images = [page_image_path] if page_image_path else []
                current_lines = []
                current_options = []
                remainder = question_match.group(2).strip()
                if remainder:
                    if looks_like_question_text(remainder):
                        current_lines.append(remainder)
                    else:
                        option_match = INLINE_OPTION_PATTERN.match(remainder)
                        if option_match:
                            current_option_label = option_match.group(1)
                            option_text = remainder[option_match.end():].strip()
                            current_option_lines = [option_text] if option_text else []
                continue

            number_only_match = re.fullmatch(r"(\d{1,3})", line)
            if (
                number_only_match
                and current_option_label is None
                and (current_number is None or not current_lines)
            ):
                finalize_current_question()
                current_number = number_only_match.group(1)
                current_page_start = page_index + 1
                current_page_images = [page_image_path] if page_image_path else []
                current_lines = []
                current_options = []
                continue

            option_match = INLINE_OPTION_PATTERN.match(line)
            if option_match and current_number is not None:
                finalize_current_option()
                current_option_label = option_match.group(1)
                option_text = line[option_match.end():].strip()
                if page_image_path and page_image_path not in current_page_images:
                    current_page_images.append(page_image_path)
                current_option_lines = [option_text] if option_text else []
                continue

            option_marker_match = OPTION_MARKER_PATTERN.match(line)
            if option_marker_match and current_number is not None:
                finalize_current_option()
                current_option_label = option_marker_match.group(1)
                if page_image_path and page_image_path not in current_page_images:
                    current_page_images.append(page_image_path)
                current_option_lines = []
                continue

            if current_option_label is not None:
                if page_image_path and page_image_path not in current_page_images:
                    current_page_images.append(page_image_path)
                current_option_lines.append(line)
                continue

            if current_number is not None:
                if page_image_path and page_image_path not in current_page_images:
                    current_page_images.append(page_image_path)
                current_lines.append(line)
                if current_page_start is None:
                    current_page_start = page_index + 1
                continue

        if current_number is not None and page_image_path:
            if page_image_path not in current_page_images:
                current_page_images.append(page_image_path)

    finalize_current_question()
    return questions

def determine_topic(question_text: str) -> str:
    lowered = question_text.lower()
    topic_scores: Dict[str, int] = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword in lowered:
                score += 1
        topic_scores[topic] = score
    best_topic = max(topic_scores, key=topic_scores.get)
    if topic_scores[best_topic] == 0:
        return TOPIC_FALLBACK
    return best_topic


def assign_topics(questions: List[Question]) -> None:
    for question in questions:
        question.topic = determine_topic(question.text)


def write_outputs(questions: List[Question], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    structured = [
        {
            "topic": question.topic,
            "source_pdf": question.source_pdf,
            "page_start": question.page_start,
            "question_number": question.question_number,
            "question_text": question.text,
            "options": question.options,
            "image_paths": question.image_paths,
        }
        for question in questions
    ]

    (output_dir / "psle_questions.json").write_text(
        json.dumps(structured, indent=2), encoding="utf-8"
    )

    by_topic: Dict[str, List[Question]] = defaultdict(list)
    for question in questions:
        by_topic[question.topic].append(question)

    topic_order = list(TOPIC_KEYWORDS.keys()) + [TOPIC_FALLBACK]

    lines: List[str] = []
    lines.append("# PSLE Mathematics Questions Organised by Topic")
    lines.append("")
    for topic in topic_order:
        if topic not in by_topic:
            continue
        lines.append(f"## {topic}")
        lines.append("")
        sorted_questions = sorted(
            by_topic[topic],
            key=lambda q: (q.source_pdf, q.page_start, q.question_number or "0"),
        )
        for question in sorted_questions:
            label = f"{question.source_pdf} p.{question.page_start}"
            if question.question_number:
                label += f" Q{question.question_number}"
            entry = f"- **{label}** - {question.text}"
            if question.options:
                entry += " Options: " + " | ".join(question.options)
            if question.image_paths:
                entry += " Images: " + " | ".join(question.image_paths)
            lines.append(entry)
        lines.append("")

    (output_dir / "psle_questions_by_topic.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract PSLE mathematics questions from scanned PDFs and "
            "organise them by topic."
        )
    )
    parser.add_argument(
        "--pdf",
        action="append",
        dest="pdfs",
        help="Specific PDF file to process (can be repeated). Defaults to all PDFs in the current directory.",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs",
        help="Directory to write JSON and Markdown outputs (default: outputs).",
    )
    parser.add_argument(
        "--image-dir",
        default="outputs/images",
        help="Directory to store extracted page images (default: outputs/images).",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Optional limit on number of pages processed per PDF (for quick smoke tests).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.pdfs:
        pdf_files = [Path(pdf_path) for pdf_path in args.pdfs]
    else:
        pdf_dir = Path(".")
        pdf_files = sorted(pdf_dir.glob("*.pdf"))

    if not pdf_files:
        raise SystemExit("No PDF files found in the current directory.")

    output_dir = Path(args.output_dir)
    image_dir = Path(args.image_dir) if getattr(args, "image_dir", None) else None

    all_questions: List[Question] = []
    for pdf_file in pdf_files:
        print(f"OCR and parsing: {pdf_file.name}")
        questions = parse_questions_from_pdf(
            pdf_file,
            image_dir=image_dir,
            max_pages=args.max_pages,
        )
        if not questions:
            print(f"  Warning: No questions captured from {pdf_file.name}")
        else:
            print(f"  Extracted {len(questions)} questions from {pdf_file.name}")
        all_questions.extend(questions)

    assign_topics(all_questions)
    write_outputs(all_questions, output_dir)
    print(f"Total questions captured: {len(all_questions)}")

if __name__ == "__main__":
    main()
