import time
import logging
from datetime import datetime

from final_working_generator import FinalWorkingPSLEMathPaperGenerator


def run_once(topic: str, per_type: int = 1):
    # Enable verbose logs from generator
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s:%(name)s:%(message)s')
    logging.getLogger('final_working_generator').setLevel(logging.DEBUG)
    gen = FinalWorkingPSLEMathPaperGenerator("final_cleaned_withtopics.json")

    if gen.check_lm_studio_connection():
        print("LM Studio: available")
    else:
        print("LM Studio: NOT available (will use variations)")

    print(f"\nTesting topic: {topic}")

    questions = []
    types = ["MCQ", "Open-ended"]
    for qt in types:
        for n in range(per_type):
            start = time.time()
            q = gen.generator.generate_question(topic, question_type=qt)
            elapsed = time.time() - start
            if q:
                score = gen.validator.get_quality_score(q)
                print(f"  {qt} #{n+1}: SUCCESS in {elapsed:.2f}s | score={score}/10 | source={q.source} | marks={q.marks}")
                print(f"    Q: {q.question[:140]}{'...' if len(q.question)>140 else ''}")
                if q.options:
                    for i, opt in enumerate(q.options, 1):
                        if i > 4:
                            break
                        print(f"    {i}. {opt}")
                print(f"    Answer: {q.correct_answer_text}")
                questions.append(q)
            else:
                print(f"  {qt} #{n+1}: FAILED in {elapsed:.2f}s")

    print("\nSummary:")
    print(f"  Generated: {sum(1 for q in questions if q.source=='Generated')} | Variations: {sum(1 for q in questions if q.source=='Variation')}")


def run_benchmark(per_type: int = 2):
    logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
    gen = FinalWorkingPSLEMathPaperGenerator("final_cleaned_withtopics.json")

    topics_preference = [
        "Fractions", "Decimals", "Percentage", "Ratio & Proportion", "Algebra",
        "Geometry & Measurement", "Perimeter & Area", "Volume & Capacity",
        "Speed & Distance", "Time & Measurement", "Whole Numbers & Operations"
    ]
    available = set(gen._get_available_topics())
    topics = [t for t in topics_preference if t in available] or list(available)[:6]

    print(f"Testing topics: {', '.join(topics)} | per_type={per_type}")
    total = 0
    passed = 0
    t0 = time.time()
    for tpc in topics:
        print(f"\n=== {tpc} ===")
        # Reuse the same generator/validator to keep conditions similar
        local_gen = FinalWorkingPSLEMathPaperGenerator("final_cleaned_withtopics.json")
        for qt in ["MCQ", "Open-ended"]:
            for n in range(per_type):
                total += 1
                start = time.time()
                q = local_gen.generator.generate_question(tpc, question_type=qt)
                elapsed = time.time() - start
                if q:
                    score = local_gen.validator.get_quality_score(q)
                    passed += 1
                    print(f"  {qt} #{n+1}: PASS in {elapsed:.2f}s | score={score}/10 | src={q.source}")
                else:
                    print(f"  {qt} #{n+1}: FAIL in {elapsed:.2f}s")
    print(f"\nOverall: {passed}/{total} passed | elapsed={time.time()-t0:.1f}s")


if __name__ == "__main__":
    # Run a small benchmark across topics; increase per_type to probe more
    run_benchmark(per_type=2)


