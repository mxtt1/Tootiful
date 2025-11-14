import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Iterable, List


QUESTION_KEYWORDS: Iterable[str] = [
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

QUESTION_PROMPTS: Iterable[str] = [
    "how",
    "what",
    "which",
    "find",
    "calculate",
    "determine",
    "solve",
    "express",
    "write",
    "give",
    "show",
    "state",
    "list",
    "draw",
    "complete",
    "compare",
    "construct",
    "label",
    "identify",
    "simplify",
    "evaluate",
    "work out",
    "compute",
    "explain",
    "prove",
    "name",
]

INSTRUCTION_PREFIX_HINTS: Iterable[str] = [
    "paper",
    "booklet",
    "questions",
    "follow",
    "answer",
    "optical",
    "calculator",
    "total time",
    "do not",
    "name",
    "class",
    "parent",
]

NOISE_PHRASES: Iterable[str] = [
    "do not turn over",
    "follow all instructions",
    "answer all questions",
    "optical answer sheet",
    "o a s",
    "shade your answers",
    "you are not allowed to use a calculator",
    "total time",
    "booklet",
    "booklets a and b",
    "instructions to pupils",
    "this question paper consists of",
    "name:",
    "class:",
    "parent's signature",
    "total marks",
    "make your choice",
    "for teacher's use only",
    "use of calculators",
    "mark each",
    "carry 1 mark",
    "carry 2 marks",
    "time allowed",
    "duration:",
    "printed pages",
    "total time",
    "number of cars",
    "line graph shows",
    "cent coins for",
    "jan feb mar apr",
    "jan feb mar",
    "feb mar apr",
    "mar apr",
    "apr may",
    "blank page",
    "working space",
    "write in this space",
    "write in this",
    "do not write",
    "page not for printing",
    "this page is intentionally left blank",
    "space below",
]

COMMON_CORRECTIONS = {
    "hunan": "human",
    "ariswer": "answer",
    "cany": "carry",
    "maths": "Maths",
    "gue": "Guo",
    "schoot": "school",
    "nat": "not",
    "aver": "over",
    "ail": "all",
    "mari": "Marie",
    "ose": "use",
    "sofd": "sold",
    "lays": "days",
    "How many": "How many",
    "How much": "How much",
    "Whatis": "What is",
    "Whatis": "What is",
    "Whatis": "What is",
    "Whatis": "What is",
    "whatis": "what is",
    "ree": "tree",
    "ee": "",
    "wae": "draw",
    "Z": "∠",
    "Â°": "°",
    "en?": "cm²",
    "cen?": "cm²",
    "en²": "cm²",
    "sig": "six",
    "SSe": "",
    "SS": "",
    "space": "",
    "Spece": "",
    "Gverlapping": "overlapping",
    "Da:": "",
    "Oo net": "",
    "Arca": "",
    "Jan Feb Mar Apr": "",
    "Number of cars sold in 4 months": "",
    "Do not": "",
}

ALLOWED_FIRST_WORDS = {
    "a",
    "after",
    "alan",
    "alex",
    "ali",
    "all",
    "amy",
    "an",
    "andy",
    "anna",
    "annie",
    "are",
    "at",
    "before",
    "ben",
    "benjamin",
    "calculate",
    "carol",
    "charlie",
    "circle",
    "daniel",
    "determine",
    "during",
    "each",
    "emma",
    "eva",
    "every",
    "find",
    "from",
    "given",
    "how",
    "if",
    "in",
    "is",
    "jacob",
    "jane",
    "john",
    "joan",
    "joshua",
    "kate",
    "ken",
    "larry",
    "liang",
    "lily",
    "lucy",
    "mary",
    "mike",
    "mr",
    "mrs",
    "nancy",
    "oliver",
    "ona",
    "once",
    "one",
    "part",
    "peter",
    "rectangle",
    "rita",
    "sam",
    "simplify",
    "square",
    "state",
    "the",
    "there",
    "three",
    "tim",
    "tom",
    "two",
    "what",
    "when",
    "which",
    "while",
    "who",
    "why",
    "yasmin",
    "zoe",
    "samuel",
    "sandy",
    "sarah",
    "sebastian",
    "siti",
    "sophia",
    "terry",
    "vincent",
    "wilson",
    "yong",
    "zara",
}


def normalise_text(text: str) -> str:
    if not text:
        return ""
    cleaned = (
        text.replace("\ufffd", "°")
        .replace("~", "-")
        .replace("â€™", "'")
        .replace("â€˜", "'")
        .replace("â€œ", '"')
        .replace("â€", '"')
        .replace("â€”", "-")
        .replace("â€“", "-")
        .replace("Â", "")
        .replace("|", " ")
        .replace(":", ": ")
        .replace(";", "; ")
        .replace("  ", " ")
    )
    cleaned = re.sub(r"\s+", " ", cleaned)
    for wrong, right in COMMON_CORRECTIONS.items():
        cleaned = re.sub(rf"\b{re.escape(wrong)}\b", right, cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+([,.;:?!])", r"\1", cleaned)
    return cleaned.strip()


def looks_like_question(text: str) -> bool:
    if not text or len(text) < 8:
        return False
    lower = text.lower()
    if any(phrase in lower for phrase in NOISE_PHRASES):
        return False

    if not any(re.search(rf"\b{re.escape(prompt)}\b", lower) for prompt in QUESTION_PROMPTS):
        return False
    if "?" in text:
        return True
    match = re.search(r"[A-Za-z]+", lower)
    if not match:
        return False
    first_word = match.group(0)
    tokens = re.findall(r"[A-Za-z]+", lower)
    if len(tokens) >= 3:
        if any(keyword in lower for keyword in QUESTION_KEYWORDS):
            if "?" in text or first_word in ALLOWED_FIRST_WORDS:
                return True
    # accept sentences ending with a period that look imperative
    if (
        text.endswith(".")
        and any(keyword in lower for keyword in QUESTION_KEYWORDS)
        and first_word in ALLOWED_FIRST_WORDS
    ):
        return True
    # as a fallback, require at least one verb-like word
    if (
        re.search(r"\b(find|give|show|prove|state|name|list)\b", lower)
        and first_word in ALLOWED_FIRST_WORDS
    ):
        return True
    return False


def looks_like_option(option: str) -> bool:
    if not option:
        return False
    option = option.strip()
    if len(option) < 2:
        return False
    if not re.search(r"[A-Za-z0-9]", option):
        return False
    return True


def clean_question_entry(entry: dict) -> dict | None:
    question_text = normalise_text(entry.get("question_text", ""))

    if not question_text:
        return None

    # Remove trailing solution fragments commonly prefixed with "Ans" or similar.
    question_text = re.split(
        r"\b(ans|answer|solution|working)\b",
        question_text,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0].strip()

    # Remove instruction blocks before the first proper sentence/question.
    number_match = re.search(r"\b\d{1,3}\s*[).:-]\s*", question_text)
    if number_match and number_match.start() > 0:
        prefix = question_text[: number_match.start()].lower()
        if any(hint in prefix for hint in INSTRUCTION_PREFIX_HINTS):
            question_text = question_text[number_match.end() :].lstrip()

    # Remove any leading words that are clearly instructions.
    question_text = re.sub(
        r"^(?:use the information below to|study the table below\.|complete the)\s*",
        "",
        question_text,
        flags=re.IGNORECASE,
    )

    # Remove any lingering instruction fragments such as "Questions 1 to 10..."
    for phrase in NOISE_PHRASES:
        question_text = re.sub(
            re.escape(phrase),
            "",
            question_text,
            flags=re.IGNORECASE,
        ).strip()

    question_text = re.sub(r"\b[A-Za-z]/[A-Za-z]\b", "", question_text)

    question_text = normalise_text(question_text)
    if not question_text:
        return None

    if len(question_text) > 220:
        return None
    if question_text.count("=") >= 3:
        return None
    if re.search(r"\bpg\b", question_text, re.IGNORECASE):
        return None
    if re.search(r"\bsession\b", question_text, re.IGNORECASE):
        return None
    if re.search(r"\boption\s+\d", question_text, re.IGNORECASE):
        return None
    if re.search(r"\bq\d+\b", question_text, re.IGNORECASE) and "?" not in question_text:
        return None
    if not looks_like_question(question_text):
        return None

    options = entry.get("options") or []
    cleaned_options: List[str] = []
    for opt in options:
        cleaned_opt = normalise_text(opt)
        if looks_like_option(cleaned_opt):
            cleaned_options.append(cleaned_opt)

    cleaned_entry = {
        "topic": entry.get("topic", "Others"),
        "source_pdf": entry.get("source_pdf", ""),
        "page_start": entry.get("page_start"),
        "question_number": entry.get("question_number"),
        "question_text": question_text,
        "options": cleaned_options,
        "image_paths": entry.get("image_paths") or [],
    }
    return cleaned_entry


def write_markdown(entries: List[dict], markdown_path: Path) -> None:
    by_topic: dict[str, List[dict]] = defaultdict(list)
    for entry in entries:
        by_topic[entry["topic"]].append(entry)

    lines: List[str] = ["# PSLE Mathematics Questions Organised by Topic", ""]
    for topic in sorted(by_topic.keys()):
        lines.append(f"## {topic}")
        lines.append("")
        for item in sorted(
            by_topic[topic],
            key=lambda x: (
                x.get("source_pdf", ""),
                x.get("page_start") or 0,
                x.get("question_number") or "",
            ),
        ):
            label = f"{item.get('source_pdf', '')} p.{item.get('page_start')}"
            if item.get("question_number"):
                label += f" Q{item['question_number']}"
            entry_line = f"- **{label}** — {item['question_text']}"
            if item["options"]:
                entry_line += " Options: " + " | ".join(item["options"])
            if item["image_paths"]:
                entry_line += " Images: " + " | ".join(item["image_paths"])
            lines.append(entry_line)
        lines.append("")

    markdown_path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clean extracted PSLE questions JSON and regenerate Markdown."
    )
    parser.add_argument(
        "--input",
        default="outputs/psle_questions.json",
        help="Input JSON file produced by extract_psle_questions.py (default: outputs/psle_questions.json).",
    )
    parser.add_argument(
        "--output",
        default="outputs/psle_questions.cleaned.json",
        help="Output path for cleaned JSON (default: outputs/psle_questions.cleaned.json).",
    )
    parser.add_argument(
        "--markdown",
        default="outputs/psle_questions_by_topic.cleaned.md",
        help="Output path for regenerated Markdown file (default: outputs/psle_questions_by_topic.cleaned.md).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    markdown_path = Path(args.markdown)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    raw_entries = json.loads(input_path.read_text(encoding="utf-8"))

    cleaned_entries: List[dict] = []
    for entry in raw_entries:
        cleaned_entry = clean_question_entry(entry)
        if cleaned_entry:
            cleaned_entries.append(cleaned_entry)

    cleaned_entries.sort(
        key=lambda x: (
            x.get("source_pdf", ""),
            x.get("page_start") or 0,
            x.get("question_number") or "",
        )
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(cleaned_entries, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    if markdown_path:
        markdown_path.parent.mkdir(parents=True, exist_ok=True)
        write_markdown(cleaned_entries, markdown_path)

    print(
        f"Cleaned {len(cleaned_entries)} questions "
        f"(from {len(raw_entries)} raw entries)."
    )


if __name__ == "__main__":
    main()
    "alvin",
    "belinda",
    "bernice",
    "brenda",
    "bryan",
    "candice",
    "darren",
    "debbie",
    "elaine",
    "jasper",
    "jeremy",
    "joanna",
    "jolene",
    "joseph",
    "joyce",
    "keith",
    "kelly",
    "kevin",
    "leah",
    "linda",
    "oscar",
    "patrick",
    "paul",
    "priya",
    "rachel",
