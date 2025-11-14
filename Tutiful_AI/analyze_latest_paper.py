"""Analyze the latest generated paper to see what can be improved"""
from final_working_generator import FinalWorkingPSLEMathPaperGenerator
import re

print("Generating a fresh paper to analyze...")
gen = FinalWorkingPSLEMathPaperGenerator('final_cleaned_withtopics.json')
paper = gen.generate_practice_paper(total_questions=30)

if not paper:
    print("FAILED: No paper generated")
    exit(1)

print(f"\n{'='*80}")
print("QUESTION ANALYSIS")
print(f"{'='*80}\n")

# Analyze question types
has_story = 0
simple_math = 0
context_based = 0

story_keywords = [
    r'\bin\s+(a|the|an)\s+',
    r'\bat\s+(a|the|an)\s+',
    r'\b(a|the)\s+\w+\s+(has|contains|needs|wants|buys|sells|makes)',
    r'\b(a|the)\s+\w+\s+\w+\s+(is|are|was|were)',
]

simple_patterns = [
    r'^[A-Z][a-z]+\s+(has|had|buys|sells)',
    r'^\d+',
    r'^(What|How|Find|Calculate|Solve)',
    r'^[A-Z][a-z]+\s+(and|&)\s+[A-Z][a-z]+',
]

context_patterns = [
    r'\bpark|garden|hall|room|building|school|library|museum|zoo|restaurant|cafe|mall|store|studio|lab|center|farm|field|pool|playground',
]

print("Sample Questions (First 15):\n")
for i, q in enumerate(paper['questions'][:15], 1):
    question_text = q.question
    has_story_context = any(re.search(pattern, question_text.lower()) for pattern in story_keywords)
    is_simple = any(re.search(pattern, question_text) for pattern in simple_patterns) and not has_story_context
    has_context = any(re.search(pattern, question_text.lower()) for pattern in context_patterns)
    
    if has_story_context:
        has_story += 1
    if is_simple:
        simple_math += 1
    if has_context:
        context_based += 1
    
    print(f"Q{i} ({q.topic[:20]:<20}) [{q.question_type}]")
    print(f"  {question_text[:150]}{'...' if len(question_text) > 150 else ''}")
    
    if is_simple:
        print(f"  [SIMPLE MATH - No story needed]")
    elif has_story_context:
        print(f"  [STORY/CONTEXT-BASED]")
    print()

print(f"\n{'='*80}")
print("ANALYSIS SUMMARY")
print(f"{'='*80}\n")

print(f"Total Questions Analyzed: 15")
print(f"Simple Math Problems: {simple_math}")
print(f"Story/Context-Based: {has_story}")
print(f"Context Keywords Found: {context_based}")

print(f"\nIssues Identified:")
issues = []

# Check if all questions have context/story
if simple_math < 3:
    issues.append("Too many questions have story contexts - should allow more simple math problems")
    print("  - Too many story-based questions (need more simple math problems)")

# Check question length variety
lengths = [len(q.question) for q in paper['questions']]
avg_length = sum(lengths) / len(lengths)
if avg_length > 120:
    issues.append(f"Average question length ({avg_length:.0f} chars) might be too long - simple problems can be shorter")
    print(f"  - Average length: {avg_length:.0f} chars (some could be shorter)")

# Check for repetitive patterns
print(f"\nRecommendations:")
print(f"  1. Allow questions without context/story - simple math problems are fine")
print(f"  2. Mix of story-based and simple problems would be more natural")
print(f"  3. Simple questions can be: 'What is 3/4 of 48?' or 'Calculate 125 × 8'")
print(f"  4. Not every question needs 'In a park...' or 'At a library...'")

