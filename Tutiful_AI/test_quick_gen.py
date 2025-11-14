"""Quick test generation to verify fixes"""
from final_working_generator import FinalWorkingPSLEMathPaperGenerator
import time

print("Starting quick test generation (10 questions)...")
start = time.time()

gen = FinalWorkingPSLEMathPaperGenerator('final_cleaned_withtopics.json')
paper = gen.generate_practice_paper(total_questions=10, title='Test Paper')

elapsed = time.time() - start

print(f'\n=== Test Complete ===')
print(f'Time: {elapsed:.1f}s')
if paper:
    print(f'Questions generated: {len(paper["questions"])}')
    print(f'Sources: {paper["question_sources"]}')
    
    # Check for repeated contexts
    contexts_used = set()
    art_count = 0
    import re
    for q in paper["questions"]:
        q_text = q.question.lower()
        if re.search(r'\b(?:school\s+)?art\s+project|community\s+art\s+project|mural', q_text):
            art_count += 1
    
    print(f'Art-related questions: {art_count}/10')
    if art_count <= 2:
        print('✓ Good diversity - minimal art repetition')
    else:
        print(f'⚠ {art_count} art-related questions (may need more diversity)')
else:
    print('FAILED: No paper generated')

