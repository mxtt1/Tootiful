# Complete Question Generation Flow Explanation

## Overview
The system generates a 30-question PSLE Math practice paper with diverse topics and contexts. Here's the complete flow:

---

## PHASE 1: INITIALIZATION

```
1. Load Data
   └─> Loads 483 questions from `final_cleaned_withtopics.json`
   └─> Creates QuestionGenerator, QuestionValidator, LMStudioClient, PaperFormatter

2. Check LM Studio
   └─> Tests if local AI model is available (http://127.0.0.1:1234)
   └─> If available: Uses AI generation
   └─> If not available: Falls back to variations only
```

---

## PHASE 2: PAPER PLANNING (Pre-generation Strategy)

### Step 1: Topic Distribution Planning
```python
# Defines desired topic distribution (based on PSLE weightage)
desired_topics = {
    "Whole Numbers & Operations": 4,
    "Fractions": 3,
    "Decimals": 3,
    "Percentage": 3,
    # ... etc (total = 30 questions)
}
```

### Step 2: Map to Available Topics
- Checks which topics exist in the dataset
- Maps desired topics to actual available topics (with fallbacks for missing ones)

### Step 3: Create Paper Structure (`_plan_paper_structure`)
```python
# For each topic:
   - Calculate MCQ count: int(count * 0.7)  # 70% MCQ
   - Calculate Open-ended: count - mcq_count  # 30% Open-ended
   - Shuffle both lists
   - Combine: [MCQ questions] + [Open-ended questions]
   - Result: List of (topic, question_type) tuples for all 30 questions
```

**Example Paper Plan:**
```
Q1:  (Decimals, MCQ)
Q2:  (Fractions, MCQ)
Q3:  (Percentage, MCQ)
...
Q21: (Fractions, Open-ended)
Q22: (Decimals, Open-ended)
...
Q30: (Money & Rates, Open-ended)
```

---

## PHASE 3: QUESTION GENERATION LOOP

For each question in the paper plan:

### Step 1: Extract Used Contexts
```python
existing_contexts = _extract_contexts_from_questions(all_questions)
```
- Scans all previously generated questions
- Extracts key contexts (park, garden, hall, art project, mural, tank, etc.)
- Returns a set of contexts already used

**Purpose:** Avoid repeating the same scenario/context multiple times

### Step 2: Generate Question (`generate_question`)

This is the **core generation function**. Here's what happens:

#### 2A. Get Sample Questions (RAG Context)
```python
sample_questions = get_sample_questions_by_topic(topic, 4)
```
- Finds 4 example questions from the dataset for this topic
- Uses these as examples for the AI model
- If exact topic not found, uses similar topics (e.g., "Perimeter" → "Perimeter & Area")

#### 2B. Generation Attempt Loop (up to 2 attempts)

**ATTEMPT 1: LM Studio Generation** (if available)

```
1. Create RAG Context (_create_rag_context)
   ├─> Includes sample questions
   ├─> Adds template hints for the topic
   ├─> Includes warning about used contexts (if any)
   └─> Encourages diverse scenarios

2. Create Prompt (_create_generation_prompt)
   ├─> Includes RAG context
   ├─> Specifies topic, question type (MCQ/Open-ended)
   ├─> Adds diversity requirements
   └─> Instructs model to output JSON format

3. Call LM Studio
   ├─> Sends prompt to local AI model
   ├─> Gets JSON response
   └─> Parses into Question object (_parse_generated_question)

4. MCQ Auto-Repair (_repair_mcq_options)
   ├─> Fixes malformed options (if needed)
   ├─> Ensures exactly 4 options
   └─> Sets correct_answer_index

5. Context Diversity Check (_check_context_diversity)
   ├─> Checks if question uses repeated contexts
   ├─> Art contexts: Only rejects if 2+ art contexts already used
   ├─> Other contexts: Only rejects if appears 2+ times or early in question
   └─> **LENIENT:** Allows if quality score >= 5 despite repetition

6. Validation (validate_question)
   ├─> Checks question length (>= 35 chars)
   ├─> Checks complexity score (>= 2)
   ├─> MCQ: Validates 4 options, correct index
   └─> Checks for proper question words

7. Quality Scoring (get_quality_score)
   ├─> Length score (0-2): Optimal 80-120 chars
   ├─> PSLE topic coverage (0-3): Multiple PSLE topics mentioned
   ├─> Cognitive level (0-2): Action verbs (explain, calculate)
   ├─> Real-world context (0-2): Practical scenarios
   ├─> Format compliance (0-1): Proper MCQ/Open-ended format
   └─> Returns score 0-10

8. Quality Check
   ├─> If score >= 6: ✅ RETURN QUESTION (SUCCESS)
   ├─> If score < 6: Try "Quality Nudge"
   └─> Save as "best_question" if better than previous
```

**ATTEMPT 1b: Quality Nudge** (if first attempt scored < 6)
- Re-prompts with explicit quality requirements
- Tries to improve the question
- Same validation process

**ATTEMPT 2: Variation Generation** (if LM Studio failed or low quality)
```
1. _generate_enhanced_variation
   ├─> Takes one of the sample questions
   ├─> Randomly changes:
   │   ├─> Names (e.g., "Alice" → "Bob")
   │   ├─> Numbers (e.g., "24" → "30")
   │   ├─> Objects (e.g., "apples" → "oranges")
   │   └─> Contexts (e.g., "park" → "garden")
   └─> Returns modified question

2. Same validation process (context check, validation, scoring)

3. If score >= 7: ✅ RETURN QUESTION (SUCCESS)
```

#### 2C. Best Question Fallback
- If no attempt succeeded with score >= 6:
- Returns the best question found (score >= 3)
- Final context diversity check (lenient if already rejected many)

---

## PHASE 4: FALLBACK MECHANISMS

### Fallback 1: Retry Failed Topics
```
If questions < 30 and some topics failed:
  ├─> Try generating again for failed topics
  ├─> Limit: min(failed_topics, remaining * 3)
  └─> Stop early if 10+ attempts with 0 successes
```

### Fallback 2: Top-Up Generation
```
If questions < 30 after fallback:
  ├─> Randomly pick topics from paper plan
  ├─> Try generating questions
  ├─> Max attempts: remaining * 8
  ├─> Stop after 15 consecutive failures
  └─> Try alternate question types if many failures
```

---

## PHASE 5: PDF GENERATION

```
1. PaperFormatter.format_paper(paper_data)
   ├─> Creates PDF using ReportLab
   ├─> Adds title, instructions
   ├─> Formats each question with proper numbering
   ├─> MCQ: Shows options (A, B, C, D)
   ├─> Open-ended: Shows answer space
   └─> Saves to outputs/psle_math_practice_[timestamp].pdf
```

---

## KEY DECISION POINTS

### Context Diversity Strategy:
1. **Strict Check:** Rejects questions with repeated contexts
2. **Quality Override:** If quality >= 5, allows despite repetition
3. **Leniency Threshold:** After 4 context rejections, becomes lenient
4. **Art Context:** Only rejects if 2+ art contexts already used

### Quality Thresholds:
- **High Quality:** Score >= 6 → Accept immediately
- **Variation Threshold:** Score >= 7 (higher bar for variations)
- **Acceptable:** Score >= 5 → Allow with context repetition
- **Fallback:** Score >= 3 → Use as last resort

### Generation Priority:
1. **LM Studio AI Generation** (preferred - most creative)
2. **Quality Nudge** (refinement attempt)
3. **Enhanced Variations** (if AI unavailable)
4. **Best Available** (last resort)

---

## EXAMPLE FLOW FOR ONE QUESTION

```
Topic: "Fractions", Type: "MCQ", Position: Q5

1. Extract contexts: {park, garden, hall} (from Q1-Q4)
2. Get 4 sample Fractions questions from dataset
3. Create RAG context with samples + diversity warning
4. Call LM Studio with prompt
5. Parse response: "In a school art project..."
6. Context check: ❌ "art project" already used in Q2
   └─> Quality preview: 7/10
   └─> Quality >= 5, so ✅ ALLOW IT
7. Validate: ✅ Passes (length, complexity, format)
8. Quality score: 7/10 ✅
9. Return question → Add to paper
```

---

## WHY THIS DESIGN?

1. **Pre-planning:** Ensures all topics covered, not random
2. **Context Tracking:** Maintains diversity across paper
3. **Multiple Strategies:** LM Studio → Nudge → Variations → Best
4. **Graceful Degradation:** Always tries to generate something
5. **Quality Assurance:** Multiple validation layers
6. **Leniency:** Balances quality vs. diversity vs. completion

---

## PERFORMANCE OPTIMIZATIONS

1. **Limited Attempts:** Max 2 attempts per question (speed)
2. **Early Exit:** Stops fallback after 15 consecutive failures
3. **Quality Override:** Allows good questions through despite context issues
4. **Context Leniency:** Prevents infinite loops from strict checking

