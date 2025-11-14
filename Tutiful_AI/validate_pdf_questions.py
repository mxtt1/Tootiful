"""
Validate questions extracted from the PDF file
"""
import argparse
import re
from pathlib import Path
from typing import Dict, List


def validate_question_structure(question_text: str, question_num: int) -> List[str]:
    """Validate individual question structure and content."""
    issues = []

    # Check for missing answer choices in MCQ
    if "MCQ" in question_text or (
        question_text.strip().startswith("Question") and "mark:" in question_text
    ):
        option_pattern = re.compile(r'^\s*\d+\.\s+\S', re.MULTILINE)
        options = option_pattern.findall(question_text)
        if len(options) < 4:
            issues.append(
                f"Question {question_num}: MCQ has fewer than 4 options ({len(options)} found)"
            )
        elif len(options) > 4:
            issues.append(
                f"Question {question_num}: MCQ has more than 4 options ({len(options)} found)"
            )

    # Check for references to diagrams/images
    if re.search(r'[Ll]ook at (the )?(diagram|figure|picture|number line|graph)', question_text, re.IGNORECASE):
        issues.append(
            f"Question {question_num}: References a diagram/figure but PDF may not display it properly"
        )

    # Check for unit consistency in "how many" questions
    question_part = question_text.split("Answer:")[0] if "Answer:" in question_text else question_text
    if "how many" in question_part.lower():
        units_in_question = set(re.findall(r'\b(m|cm|km|ml|l|kg|g|m²|cm²)\b', question_part, re.IGNORECASE))
        if len(units_in_question) > 2:
            issues.append(
                f"Question {question_num}: Multiple different units mentioned, may be confusing"
            )

    # Check for typographical artefacts observed in past generations
    if "in most" in question_text.lower():
        issues.append(f"Question {question_num}: Likely typo - 'in most' should probably be 'in all'")
    if "requiring equation solving" in question_text.lower():
        issues.append(
            f"Question {question_num}: Contains extraneous text 'requiring equation solving' that shouldn't be in question"
        )

    # Check for missing question mark (unless open-ended working prompt)
    if question_text.count("?") == 0 and "Show your working:" not in question_text:
        cleaned = question_text.strip()
        cleaned = re.sub(r'^Question\s+\d+\s*(?:\([^)]+\))?\s*-\s*\d+\s*mark[s]?:\s*', '', cleaned, flags=re.IGNORECASE)
        imperative_starts = ("find", "calculate", "determine", "work out", "compute", "solve", "express")
        lower_clean = cleaned.lower()
        if not lower_clean.startswith(imperative_starts) and not re.search(r'\b(express|find|calculate|determine|solve|work out|compute)\b', lower_clean):
            issues.append(f"Question {question_num}: No question mark found - may be incomplete")

    # Check for unit mismatch in options for "how many" prompts
    if re.search(r'\d+\.\s+\d+\s+m[²]?', question_text, re.MULTILINE):
        if "how many" in question_text.lower() and "equal parts" in question_text.lower():
            issues.append(
                f"Question {question_num}: Asks for 'how many equal parts' but answer choices are in metres (units don't match)"
            )

    return issues


def validate_pdf_content(full_text: str) -> Dict[str, object]:
    """Validate all questions from PDF text."""
    issues: List[str] = []

    mcq_section = re.search(r'MULTIPLE CHOICE QUESTIONS(.*?)OPEN-ENDED QUESTIONS', full_text, re.DOTALL)
    open_ended_section = re.search(r'OPEN-ENDED QUESTIONS(.*?)$', full_text, re.DOTALL)

    mcq_questions = []
    oe_questions = []

    if mcq_section:
        mcq_text = mcq_section.group(1)
        mcq_questions = re.findall(r'Question \d+.*?(?=Question \d+|$)', mcq_text, re.DOTALL)
        print(f"\nFound {len(mcq_questions)} MCQ questions")

        for q_text in mcq_questions:
            q_num_match = re.search(r'Question (\d+)', q_text)
            if q_num_match:
                q_num = int(q_num_match.group(1))
                issues.extend(validate_question_structure(q_text, q_num))

    if open_ended_section:
        oe_text = open_ended_section.group(1)
        oe_questions = re.findall(r'Question \d+.*?(?=Question \d+|$)', oe_text, re.DOTALL)
        print(f"Found {len(oe_questions)} Open-ended questions")

    return {
        "total_mcq": len(mcq_questions),
        "total_oe": len(oe_questions),
        "issues": issues,
    }


def main():
    parser = argparse.ArgumentParser(description="Validate generated PSLE math PDF questions.")
    parser.add_argument(
        "--pdf",
        type=str,
        help="Path to the PDF to validate. Defaults to the most recent psle_math_practice_*.pdf in outputs/.",
    )
    parser.add_argument(
        "--outputs-dir",
        type=str,
        default="outputs",
        help="Directory to search for generated PDFs when --pdf is not provided.",
    )
    args = parser.parse_args()

    print("=" * 80)
    print("PDF QUESTION VALIDATION REPORT")
    print("=" * 80)

    import PyPDF2

    if args.pdf:
        pdf_candidate = Path(args.pdf)
    else:
        output_dir = Path(args.outputs_dir)
        candidates = sorted(
            output_dir.glob("psle_math_practice_*.pdf"),
            key=lambda p: p.stat().st_mtime if p.exists() else 0,
            reverse=True,
        )
        pdf_candidate = candidates[0] if candidates else None

    if not pdf_candidate or not pdf_candidate.exists():
        print("No suitable PDF found to validate. Provide one with --pdf or generate a paper first.")
        return

    pdf_path = pdf_candidate.resolve()
    print(f"Validating PDF: {pdf_path}")

    with open(pdf_path, "rb") as pdf_file:
        reader = PyPDF2.PdfReader(pdf_file)
        full_text = ""
        for page in reader.pages:
            full_text += (page.extract_text() or "") + "\n\n"

    validation_result = validate_pdf_content(full_text)

    print(f"\nQuestion Count:")
    print(f"  MCQ Questions: {validation_result['total_mcq']}")
    print(f"  Open-ended Questions: {validation_result['total_oe']}")

    print(f"\n{'=' * 80}")
    print("VALIDATION ISSUES FOUND")
    print(f"{'=' * 80}\n")

    issues = validation_result["issues"]
    if issues:
        for issue in issues:
            print(f"- {issue}")
    else:
        print("No structural issues detected by automated checks.")

    print(f"\n{'=' * 80}")
    print("SUMMARY")
    print(f"{'=' * 80}\n")
    print(f"Total Issues Flagged: {len(issues)}")


if __name__ == "__main__":
    main()
