"""Validate the generated paper - check questions, diversity, quality"""
from final_working_generator import FinalWorkingPSLEMathPaperGenerator
import re
import json

print("Generating a fresh paper for validation...")
gen = FinalWorkingPSLEMathPaperGenerator('final_cleaned_withtopics.json')
paper = gen.generate_practice_paper(total_questions=30)

if not paper:
    print("FAILED: No paper generated")
    exit(1)

print(f"\n{'='*80}")
print("PAPER VALIDATION REPORT")
print(f"{'='*80}\n")

# Basic stats
print(f"Total Questions: {len(paper['questions'])}")
print(f"Topics Covered: {len(paper['topics_covered'])}")
print(f"Question Sources: {paper['question_sources']}")

# Quality scores
scores = []
art_count = 0
contexts_used = {}
context_issues = []

print(f"\n{'='*80}")
print("QUALITY ANALYSIS")
print(f"{'='*80}\n")

for i, q in enumerate(paper['questions'], 1):
    score = gen.validator.get_quality_score(q)
    scores.append(score)
    
    # Check for art-related contexts
    q_lower = q.question.lower()
    if re.search(r'\b(school\s+)?art\s+project|community\s+art\s+project|mural|geometric\s+pattern', q_lower):
        art_count += 1
    
    # Track contexts
    context_found = None
    for pattern_name, pattern in [
        ('park', r'\bpark[s]?\b'),
        ('garden', r'\bgarden[s]?\b'),
        ('hall', r'\bhall[s]?\b'),
        ('room', r'\broom[s]?\b'),
        ('art project', r'\b(school\s+)?art\s+project'),
        ('mural', r'\bmural[s]?\b'),
        ('tank', r'\btank[s]?\b'),
        ('pool', r'\bpool[s]?\b'),
        ('field', r'\bfield[s]?\b'),
        ('building', r'\bbuilding[s]?\b'),
    ]:
        if re.search(pattern, q_lower):
            context_found = pattern_name
            contexts_used[pattern_name] = contexts_used.get(pattern_name, 0) + 1
            break
    
    # Validation check
    is_valid = gen.validator.validate_question(q)
    
    print(f"Q{i} [{q.topic[:25]:<25}] [{q.question_type:<12}] Score: {score}/10 | Valid: {is_valid} | Context: {context_found or 'other'}")
    print(f"    {q.question[:120]}{'...' if len(q.question) > 120 else ''}")
    
    if not is_valid:
        print(f"    ⚠ VALIDATION FAILED")
    
    if score < 4:
        print(f"    ⚠ Low quality score ({score}/10)")

print(f"\n{'='*80}")
print("DIVERSITY ANALYSIS")
print(f"{'='*80}\n")

print(f"Art-related questions: {art_count}/30")
if art_count > 5:
    print(f"⚠ WARNING: High number of art-related questions ({art_count})")
elif art_count <= 2:
    print("✓ Good diversity - minimal art repetition")
else:
    print(f"✓ Acceptable diversity ({art_count} art-related questions)")

print(f"\nContext distribution:")
for context, count in sorted(contexts_used.items(), key=lambda x: -x[1]):
    print(f"  {context}: {count} questions")
    if count > 4:
        print(f"    ⚠ High repetition of '{context}' context")

print(f"\n{'='*80}")
print("QUALITY SUMMARY")
print(f"{'='*80}\n")

print(f"Average Quality Score: {sum(scores)/len(scores):.1f}/10")
print(f"Min Score: {min(scores)}/10")
print(f"Max Score: {max(scores)}/10")
print(f"\nScore Distribution:")
score_ranges = {
    'Excellent (9-10)': sum(1 for s in scores if s >= 9),
    'Good (7-8)': sum(1 for s in scores if 7 <= s < 9),
    'Decent (5-6)': sum(1 for s in scores if 5 <= s < 7),
    'Low (3-4)': sum(1 for s in scores if 3 <= s < 5),
    'Very Low (1-2)': sum(1 for s in scores if s < 3),
}
for range_name, count in score_ranges.items():
    print(f"  {range_name}: {count} questions")

# Validation check
all_valid = all(gen.validator.validate_question(q) for q in paper['questions'])
print(f"\n{'='*80}")
print("VALIDATION STATUS")
print(f"{'='*80}\n")
if all_valid:
    print("✓ ALL QUESTIONS PASSED VALIDATION")
else:
    invalid_count = sum(1 for q in paper['questions'] if not gen.validator.validate_question(q))
    print(f"⚠ {invalid_count} questions failed validation")

# Sample questions for manual review
print(f"\n{'='*80}")
print("SAMPLE QUESTIONS FOR MANUAL REVIEW (First 10)")
print(f"{'='*80}\n")

for i, q in enumerate(paper['questions'][:10], 1):
    print(f"\nQuestion {i} ({q.topic} - {q.question_type})")
    print(f"Quality Score: {gen.validator.get_quality_score(q)}/10")
    print(f"Full Question: {q.question}")
    if q.question_type == "MCQ":
        print("Options:")
        for j, opt in enumerate(q.options, 1):
            marker = "✓" if j-1 == q.correct_answer_index else " "
            print(f"  {marker} {j}. {opt}")
    print(f"Answer: {q.correct_answer_text}")

print(f"\n{'='*80}")
print("VALIDATION COMPLETE")
print(f"{'='*80}")

