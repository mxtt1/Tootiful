"""Quick script to analyze question diversity in generated paper"""
import json
from final_working_generator import FinalWorkingPSLEMathPaperGenerator

gen = FinalWorkingPSLEMathPaperGenerator('final_cleaned_withtopics.json')
paper = gen.generate_practice_paper(total_questions=30)

if paper:
    print(f"\n=== Generated {paper['total_questions']} questions ===\n")
    
    # Track contexts
    contexts = {}
    import re
    
    for i, q in enumerate(paper['questions'], 1):
        # Extract main objects/contexts
        q_lower = q.question.lower()
        found_contexts = []
        
        # Check for common objects
        patterns = {
            'tank': r'\b(?:water\s+)?tank[s]?\b',
            'container': r'\bcontainer[s]?\b',
            'pool': r'\b(?:swimming\s+)?pool[s]?\b',
            'garden': r'\bgarden[s]?\b',
            'park': r'\bpark[s]?\b',
            'field': r'\bfield[s]?\b',
            'room': r'\broom[s]?\b',
            'building': r'\bbuilding[s]?\b',
            'hall': r'\bhall[s]?\b',
            'playground': r'\bplayground[s]?\b',
            'banner': r'\bbanner[s]?\b',
            'plot': r'\bplot[s]?\b',
            'lawn': r'\blawn[s]?\b',
            'carpet': r'\bcarpet[s]?\b',
            'pond': r'\bpond[s]?\b',
            'fountain': r'\bfountain[s]?\b',
            'rectangular': r'\brectangular\b',
            'square': r'\bsquare\b',
            'circle': r'\bcircle[s]?\b',
        }
        
        for name, pattern in patterns.items():
            if re.search(pattern, q_lower):
                found_contexts.append(name)
                contexts[name] = contexts.get(name, 0) + 1
        
        # Show first 150 chars of each question (handle unicode)
        try:
            q_preview = q.question[:150].encode('utf-8', errors='replace').decode('utf-8')
        except:
            q_preview = q.question[:150]
        print(f"Q{i} ({q.topic[:30]}) [{q.question_type}]: {q_preview}{'...' if len(q.question) > 150 else ''}")
        if found_contexts:
            print(f"  Contexts: {', '.join(found_contexts)}")
        print()
    
    print("\n=== Context Summary ===")
    for context, count in sorted(contexts.items(), key=lambda x: -x[1]):
        print(f"  {context}: {count}")
    print(f"\nTotal unique contexts: {len(contexts)}")

