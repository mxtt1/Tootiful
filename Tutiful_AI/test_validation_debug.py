"""Debug script to capture generated questions and check why they fail validation"""
import logging
from final_working_generator import FinalWorkingPSLEMathPaperGenerator
import json

# Set up logging to see what's happening
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')

print("Loading generator...")
gen = FinalWorkingPSLEMathPaperGenerator("final_cleaned_withtopics.json")

# Test with a few topics that were failing
test_topics = ["Decimals", "Ratio & Proportion", "Percentage"]
failed_questions = []
passed_questions = []

print(f"\nTesting {len(test_topics)} topics that were failing...")
print("=" * 80)

for topic in test_topics:
    print(f"\n{'='*80}")
    print(f"TOPIC: {topic}")
    print('='*80)
    
    for question_type in ["MCQ", "Open-ended"]:
        print(f"\n--- {question_type} ---")
        try:
            # Generate with timeout handling
            q = gen.generator.generate_question(topic, question_type=question_type, used_contexts=set())
            
            if q:
                # Validate manually
                is_valid = gen.validator.validate_question(q)
                quality_score = gen.validator.get_quality_score(q)
                
                print(f"[OK] Generated question")
                print(f"  Validation: {'PASS' if is_valid else 'FAIL'}")
                print(f"  Quality Score: {quality_score}/10")
                print(f"  Source: {q.source}")
                print(f"\n  Question: {q.question[:200]}{'...' if len(q.question) > 200 else ''}")
                
                if q.question_type == "MCQ":
                    print(f"  Options: {len(q.options) if q.options else 0}")
                    if q.options:
                        for i, opt in enumerate(q.options[:4], 1):
                            print(f"    {i}. {opt[:60]}")
                    print(f"  Correct Index: {q.correct_answer_index}")
                
                print(f"  Answer: {q.correct_answer_text[:100] if q.correct_answer_text else 'N/A'}")
                
                # Check what validation might fail on
                if not is_valid:
                    print("\n  ⚠ VALIDATION FAILURES:")
                    # Check each validation criterion
                    if len(q.question) < 35:
                        print(f"    - Question too short: {len(q.question)} chars (min: 35)")
                    if q.question_type == "MCQ":
                        if not q.options or len(q.options) != 4:
                            print(f"    - Invalid options: {len(q.options) if q.options else 0} options (need 4)")
                        if q.correct_answer_index == -1 or q.correct_answer_index not in range(4):
                            print(f"    - Invalid correct_answer_index: {q.correct_answer_index}")
                    if not q.correct_answer_text:
                        print(f"    - Missing correct_answer_text")
                    
                    # Check complexity
                    from final_working_generator import QuestionValidator
                    complexity_score = gen.validator._compute_complexity_score(q)
                    if complexity_score < 2:
                        print(f"    - Low complexity score: {complexity_score} (min: 2)")
                    
                    failed_questions.append({
                        'topic': topic,
                        'type': question_type,
                        'question': q.question,
                        'quality_score': quality_score,
                        'valid': is_valid,
                        'source': q.source
                    })
                else:
                    passed_questions.append({
                        'topic': topic,
                        'type': question_type,
                        'quality_score': quality_score
                    })
                
            else:
                print(f"[FAIL] Failed to generate question")
                failed_questions.append({
                    'topic': topic,
                    'type': question_type,
                    'question': None,
                    'error': 'Generation returned None'
                })
                
        except Exception as e:
            print(f"[ERROR] Exception: {e}")
            import traceback
            traceback.print_exc()
            failed_questions.append({
                'topic': topic,
                'type': question_type,
                'error': str(e)
            })

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Passed: {len(passed_questions)}")
print(f"Failed: {len(failed_questions)}")

if failed_questions:
    print("\nFAILED QUESTIONS:")
    for fq in failed_questions[:5]:  # Show first 5
        print(f"\n  {fq['topic']} ({fq['type']}):")
        if 'question' in fq and fq['question']:
            print(f"    Q: {fq['question'][:150]}...")
            print(f"    Quality: {fq.get('quality_score', 'N/A')}/10")
            print(f"    Valid: {fq.get('valid', False)}")
        else:
            print(f"    Error: {fq.get('error', 'No question generated')}")

