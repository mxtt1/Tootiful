"""Test the generation and analyze context diversity"""
from final_working_generator import FinalWorkingPSLEMathPaperGenerator
import re
import collections

print("Generating full 30-question paper...")
gen = FinalWorkingPSLEMathPaperGenerator('final_cleaned_withtopics.json')
paper = gen.generate_practice_paper(total_questions=30)

if not paper:
    print("FAILED: No paper generated")
    exit(1)

print(f"\n{'='*80}")
print("CONTEXT DIVERSITY ANALYSIS")
print(f"{'='*80}\n")

# Track contexts
contexts_found = collections.defaultdict(list)
art_related = []

for i, q in enumerate(paper['questions'], 1):
    q_lower = q.question.lower()
    
    # Check for art-related
    if re.search(r'\b(school\s+)?art\s+project|community\s+art\s+project|mural|geometric\s+pattern', q_lower):
        art_related.append(i)
    
    # Check for common contexts
    context_patterns = {
        'art project': r'\b(school\s+)?art\s+project|community\s+art\s+project',
        'mural': r'\bmural[s]?\b',
        'park': r'\bpark[s]?\b',
        'garden': r'\bgarden[s]?\b',
        'hall': r'\bhall[s]?\b',
        'room': r'\broom[s]?\b',
        'playground': r'\bplayground[s]?\b',
        'field': r'\bfield[s]?\b',
        'pool': r'\bpool[s]?\b',
        'tank': r'\btank[s]?\b',
        'container': r'\bcontainer[s]?\b',
        'building': r'\bbuilding[s]?\b',
        'construction': r'\bconstruction\b',
        'sports': r'\bsports|basketball|soccer|tennis|running\s+track',
        'library': r'\blibrary|bookshelf',
        'kitchen': r'\bkitchen|cooking|baking',
        'farm': r'\bfarm|orchard|vegetable\s+garden',
        'transport': r'\bbus|train|vehicle|parking',
        'museum': r'\bmuseum|gallery|exhibit',
        'zoo': r'\bzoo|aquarium|enclosure',
        'restaurant': r'\brestaurant|cafe|dining',
        'mall': r'\bmall|shopping|store|supermarket',
        'school': r'\bschool\s+(?!art)',
        'community': r'\bcommunity\s+(?!art)',
        'nature': r'\bnature|wildlife|trail|forest',
    }
    
    found = None
    for context_name, pattern in context_patterns.items():
        if re.search(pattern, q_lower):
            found = context_name
            contexts_found[context_name].append(i)
            break
    
    if found:
        print(f"Q{i:2d}: {found:20s} | {q.question[:80]}{'...' if len(q.question) > 80 else ''}")
    else:
        # Try to identify other contexts
        other_contexts = ['playground', 'equipment', 'court', 'lab', 'studio', 'center', 'station']
        other_found = any(ctx in q_lower for ctx in other_contexts)
        print(f"Q{i:2d}: {'other/unique':20s} | {q.question[:80]}{'...' if len(q.question) > 80 else ''}")

print(f"\n{'='*80}")
print("SUMMARY STATISTICS")
print(f"{'='*80}\n")

print(f"Total Questions: {len(paper['questions'])}")
print(f"Art-related questions: {len(art_related)}")
if art_related:
    print(f"  Questions: {art_related}")

print(f"\nContext Distribution:")
for context, question_nums in sorted(contexts_found.items(), key=lambda x: -len(x[1])):
    print(f"  {context:20s}: {len(question_nums)} questions (Q{', '.join(map(str, question_nums[:5]))}{'...' if len(question_nums) > 5 else ''})")

# Check for repetition issues
repetition_issues = []
for context, question_nums in contexts_found.items():
    if len(question_nums) > 3:
        repetition_issues.append((context, len(question_nums)))

if repetition_issues:
    print(f"\n[WARNING] REPETITION ISSUES:")
    for context, count in repetition_issues:
        print(f"  - '{context}' appears {count} times")
else:
    print(f"\n[OK] Good diversity - no context appears more than 3 times")

# Check unique contexts
unique_contexts = sum(1 for nums in contexts_found.values() if len(nums) == 1)
print(f"\nUnique contexts (used only once): {unique_contexts}")
print(f"Context diversity score: {len(contexts_found)} unique contexts out of {len(paper['questions'])} questions")

if len(contexts_found) >= len(paper['questions']) * 0.6:  # 60% unique contexts
    print("[EXCELLENT] Excellent diversity!")
elif len(contexts_found) >= len(paper['questions']) * 0.4:  # 40% unique contexts
    print("[GOOD] Good diversity")
else:
    print("[WARNING] Could improve diversity")

