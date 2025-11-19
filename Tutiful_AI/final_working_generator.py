"""
Final working PSLE Math Paper Generator with improved variations
Optimized for Mistral 7B Instruct v0.3 model in LM Studio
"""

import json
import random
import logging
import os
import re
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
from AgentDataEngineering.src.lm_studio_client import LMStudioClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Question:
    id: str
    question: str
    options: List[str]
    correct_answer_index: int
    correct_answer_text: str
    topic: str
    source: str
    question_type: str  # "MCQ" or "Open-ended"
    marks: int = 1  # Default marks for MCQ, can be 2-5 for open-ended

class FinalWorkingPSLEMathPaperGenerator:
    """Final working PSLE Math Paper Generator with improved variations"""
    
    def __init__(self, questions_file: str):
        self.questions_file = questions_file
        self.questions_data = self._load_questions()

        lm_base_url = os.getenv("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234")
        lm_model = os.getenv("LM_STUDIO_MODEL", "mistral-7b-instruct-v0.3")
        try:
            lm_timeout = int(os.getenv("LM_STUDIO_TIMEOUT", "120"))
        except (TypeError, ValueError):
            lm_timeout = 120

        self.lm_client = LMStudioClient(
            base_url=lm_base_url,
            model=lm_model,
            timeout=lm_timeout,
        )
        
        # Initialize agents
        self.validator = QuestionValidator(lm_client=self.lm_client)
        self.generator = QuestionGenerator(self.questions_data, self.lm_client, self.validator)
        self.formatter = PaperFormatter()
    
    def _load_questions(self) -> List[Dict]:
        """Load questions from JSON file"""
        try:
            with open(self.questions_file, 'r', encoding='utf-8') as f:
                questions = json.load(f)
            logger.info(f"Loaded {len(questions)} questions from {self.questions_file}")
            return questions
        except Exception as e:
            logger.error(f"Failed to load questions: {e}")
            return []
    
    def check_lm_studio_connection(self) -> bool:
        """Check if LM Studio is available"""
        return self.lm_client.is_available()
    
    def generate_practice_paper(self, 
                              title: str = "PSLE Math Practice Paper",
                              total_questions: int = 30,
                              topics_distribution: Optional[Dict[str, int]] = None) -> Optional[Dict]:
        """Generate a complete practice paper"""
        
        if not self.questions_data:
            logger.error("No questions data available")
            return None
        
        logger.info("Starting practice paper generation...")
        
        # Get available topics
        available_topics = self._get_available_topics()
        
        if not topics_distribution:
            # PSLE-appropriate distribution covering all major topics
            # Based on actual PSLE exam weightage and available topics
            desired_topics = {
                "Whole Numbers & Operations": 4,
                "Fractions": 3,
                "Decimals": 3,
                "Percentage": 3,
                "Ratio & Proportion": 3,
                "Algebra": 2,
                "Geometry & Measurement": 3,
                "Perimeter & Area": 2,
                "Volume & Capacity": 2,
                "Speed & Distance": 2,
                "Time & Measurement": 2,
                "Money & Rates": 1  # Reduced from 2 to 1 to avoid over-representation
            }
            # Map desired topics to available topics in the data
            topics_distribution = self._map_topics_to_available(desired_topics)
            logger.info(f"Mapped topic distribution: {topics_distribution}")
        
        # Filter to available topics only
        topics_distribution = {k: v for k, v in topics_distribution.items() if k in available_topics}
        
        # Pre-plan the entire paper structure: map question numbers to topics and types
        paper_plan = self._plan_paper_structure(topics_distribution, total_questions)
        logger.info(f"Paper plan: {len(paper_plan)} questions mapped out")
        for q_num, (topic, q_type) in enumerate(paper_plan, 1):
            logger.debug(f"  Q{q_num}: {topic} ({q_type})")
        
        # Generate questions following the pre-planned structure
        all_questions = []
        question_sources = {"Generated": 0, "Variation": 0, "Original": 0}
        failed_topics = []

        for i, (topic, question_type) in enumerate(paper_plan, 1):
            logger.info(f"Generating {question_type} question {i}/{len(paper_plan)} for topic: {topic}")

            # Extract key contexts from already generated questions to avoid repetition
            existing_contexts = self._extract_contexts_from_questions(all_questions)
            question = self.generator.generate_question(topic, question_type, used_contexts=existing_contexts)
            if question:
                all_questions.append(question)
                question_sources[question.source] += 1
                logger.info(f"SUCCESS: Added {question_type} question for {topic} (Source: {question.source})")
            else:
                logger.warning(f"Failed to generate {question_type} question for {topic}")
                failed_topics.append((topic, question_type))

        # Fallback: Try to generate additional questions for failed topics (limit attempts)
        if len(all_questions) < total_questions and failed_topics:
            remaining = total_questions - len(all_questions)
            max_fallback_attempts = min(len(failed_topics), remaining * 3)  # Try up to 3x remaining, or all failed topics
            logger.info(f"Attempting fallback generation for {min(len(failed_topics), max_fallback_attempts)} failed topics (need {remaining} more)...")
            fallback_successes = 0
            for i, (topic, question_type) in enumerate(failed_topics[:max_fallback_attempts]):
                if len(all_questions) >= total_questions:
                    break
                logger.info(f"Fallback {i+1}/{max_fallback_attempts}: Trying {question_type} question for {topic}")
                existing_contexts = self._extract_contexts_from_questions(all_questions)
                question = self.generator.generate_question(topic, question_type, used_contexts=existing_contexts)
                if question:
                    all_questions.append(question)
                    question_sources[question.source] += 1
                    fallback_successes += 1
                    logger.info(f"FALLBACK SUCCESS: Added {question_type} question for {topic} ({fallback_successes} success{'es' if fallback_successes != 1 else ''})")
                # If we've tried many but succeeded few, stop early to save time
                if i >= 10 and fallback_successes == 0:
                    logger.info(f"Fallback: No successes after {i+1} attempts, stopping fallback early")
                    break

        # Final top-up: Keep generating until we reach total_questions (best-effort)
        if len(all_questions) < total_questions:
            remaining = total_questions - len(all_questions)
            logger.info(
                f"Topping up remaining questions: need {remaining} more..."
            )
            # Build a pool to sample from; prefer original paper_plan ordering
            pool = paper_plan if paper_plan else [(t, "MCQ") for t in topics_distribution.keys()]
            attempts = 0
            max_attempts = remaining * 8  # Reduced from 10 to 8 - more efficient
            consecutive_failures = 0
            max_consecutive_failures = 15  # Reduced from 20 to 15 - stop sooner
            
            while len(all_questions) < total_questions and attempts < max_attempts and consecutive_failures < max_consecutive_failures:
                topic, question_type = random.choice(pool)
                existing_contexts = self._extract_contexts_from_questions(all_questions)
                question = self.generator.generate_question(topic, question_type, used_contexts=existing_contexts)
                if question:
                    all_questions.append(question)
                    question_sources[question.source] += 1
                    consecutive_failures = 0  # Reset on success
                else:
                    consecutive_failures += 1
                attempts += 1
                
                # If too many consecutive failures, try different question types
                if consecutive_failures >= 8:  # Reduced from 10 to 8
                    logger.info(f"Many consecutive failures ({consecutive_failures}), trying alternative question type...")
                    # Try switching question type
                    alt_question_type = "Open-ended" if question_type == "MCQ" else "MCQ"
                    question = self.generator.generate_question(topic, alt_question_type, used_contexts=existing_contexts)
                    if question:
                        all_questions.append(question)
                        question_sources[question.source] += 1
                        consecutive_failures = 0
                    else:
                        consecutive_failures += 1
            if len(all_questions) < total_questions:
                logger.warning(
                    f"Could only generate {len(all_questions)}/{total_questions} after top-up attempts."
                )
        
        if not all_questions:
            logger.error("No questions generated")
            return None
        
        # Ensure MCQs appear before open-ended questions for consistent PDF sections
        mcq_questions = [q for q in all_questions if q.question_type == "MCQ"]
        non_mcq_questions = [q for q in all_questions if q.question_type != "MCQ"]
        ordered_questions = mcq_questions + non_mcq_questions
        
        logger.info(f"Generated practice paper with {len(ordered_questions)} questions")
        
        # Create paper data
        paper_data = {
            "title": title,
            "questions": ordered_questions,
            "total_questions": len(ordered_questions),
            "topics_covered": list(topics_distribution.keys()),
            "question_sources": question_sources,
            "generated_at": datetime.now().isoformat()
        }
        
        return paper_data
    
    def _get_available_topics(self) -> List[str]:
        """Get list of available topics"""
        topics = set()
        for q in self.questions_data:
            if 'topic' in q:
                topics.add(q['topic'])
        return sorted(list(topics))
    
    def _map_topics_to_available(self, desired_topics: Dict[str, int]) -> Dict[str, int]:
        """Map desired topics to available topics in the data"""
        available_topics = self._get_available_topics()
        mapped_distribution = {}
        
        # Topic mapping from desired to available topics
        topic_mapping = {
            "Whole Numbers & Operations": ["Whole Numbers & Operations", "Whole Numbers & Number Patterns"],
            "Fractions": ["Fractions", "Fractions & Mixed Numbers"],
            "Decimals": ["Decimals"],
            "Percentage": ["Percentage", "percentage"],
            "Ratio & Proportion": ["Ratio & Proportion", "ratio"],
            "Algebra": ["Algebra", "Algebra & Equations", "algebra"],
            "Geometry & Measurement": ["Geometry & Measurement", "Geometry (Angles & Shapes)", "Perimeter & Area"],
            "Perimeter & Area": ["Perimeter & Area", "Geometry & Measurement"],
            "Volume & Capacity": ["Volume & Capacity"],
            "Speed & Distance": ["Speed & Distance", "Speed & Rate"],
            "Time & Measurement": ["Time & Measurement", "Measurement (Length, Mass, Time)", "measurement"],
            "Money & Rates": ["Money & Rates", "Financial Arithmetic (Money)"]
        }
        
        # Map each desired topic to available topics
        for desired_topic, count in desired_topics.items():
            if desired_topic in topic_mapping:
                # Find the first available topic from the mapping
                for mapped_topic in topic_mapping[desired_topic]:
                    if mapped_topic in available_topics:
                        mapped_distribution[mapped_topic] = count
                        break
                else:
                    # If no mapped topic found, try to find a similar one
                    for available_topic in available_topics:
                        if any(keyword in available_topic.lower() for keyword in desired_topic.lower().split()):
                            mapped_distribution[available_topic] = count
                            break
                    else:
                        logger.warning(f"No suitable topic found for '{desired_topic}'")
            else:
                # Direct match
                if desired_topic in available_topics:
                    mapped_distribution[desired_topic] = count
                else:
                    logger.warning(f"Topic '{desired_topic}' not found in available topics")
        
        return mapped_distribution
    
    def _plan_paper_structure(self, topics_distribution: Dict[str, int], total_questions: int) -> List[tuple]:
        """Pre-plan which topic and question type goes to which question number"""
        # Define question type distribution (70% MCQ, 30% Open-ended)
        mcq_questions = []
        open_ended_questions = []
        
        for topic, count in topics_distribution.items():
            mcq_count = int(count * 0.7)  # 70% MCQ
            open_ended_count = count - mcq_count  # 30% Open-ended
            mcq_questions.extend([(topic, "MCQ")] * mcq_count)
            open_ended_questions.extend([(topic, "Open-ended")] * open_ended_count)
        
        # Shuffle within each group but keep groups separate
        random.shuffle(mcq_questions)
        random.shuffle(open_ended_questions)
        
        # Combine: MCQ questions first, then open-ended questions
        question_plan = mcq_questions + open_ended_questions
        
        # Ensure we have exactly total_questions (adjust if needed)
        if len(question_plan) > total_questions:
            question_plan = question_plan[:total_questions]
        elif len(question_plan) < total_questions:
            # Fill remaining with random topics/types
            remaining = total_questions - len(question_plan)
            all_topics = list(topics_distribution.keys())
            for _ in range(remaining):
                topic = random.choice(all_topics)
                q_type = random.choice(["MCQ", "Open-ended"])
                question_plan.append((topic, q_type))
        
        return question_plan
    
    def _extract_contexts_from_questions(self, questions: List[Question]) -> set:
        """Extract key objects/contexts from generated questions to track diversity"""
        contexts = set()
        import re
        
        # Common objects/scenarios to track - expanded list including art-related terms
        context_patterns = [
            # Containers/liquids
            r'\b(?:water\s+)?tank[s]?\b',
            r'\b(?:cylindrical\s+)?tank[s]?\b',
            r'\bcontainer[s]?\b',
            r'\b(?:swimming\s+)?pool[s]?\b',
            # Art-related (important to catch these!)
            r'\b(?:school\s+)?art\s+project[s]?\b',
            r'\bcommunity\s+art\s+project[s]?\b',
            r'\b(?:school\s+)?mural[s]?\b',
            r'\bcommunity\s+mural[s]?\b',
            r'\bgeometric\s+pattern[s]?\b',
            r'\bart\s+club\b',
            r'\bart\s+room[s]?\b',
            # Spaces
            r'\b(?:rectangular\s+)?garden[s]?\b',
            r'\b(?:square\s+)?field[s]?\b',
            r'\b(?:rectangular\s+)?field[s]?\b',
            r'\b(?:rectangular\s+)?room[s]?\b',
            r'\b(?:rectangular\s+)?park[s]?\b',
            r'\b(?:rectangular\s+)?hall[s]?\b',
            r'\b(?:rectangular\s+)?playground[s]?\b',
            r'\b(?:rectangular\s+)?banner[s]?\b',
            r'\b(?:rectangular\s+)?plot[s]?\b',
            r'\b(?:rectangular\s+)?lawn[s]?\b',
            r'\bcarpet[s]?\b',
            r'\bpond[s]?\b',
            r'\bfountain[s]?\b',
        ]
        
        for q in questions:
            if not q or not q.question:
                continue
            q_text = q.question.lower()
            for pattern in context_patterns:
                matches = re.findall(pattern, q_text)
                for match in matches:
                    # Normalize the match (remove extra spaces, standardize)
                    normalized = ' '.join(match.strip().split())
                    contexts.add(normalized)
        
        return contexts
    
    def _check_context_diversity(self, question: Question, used_contexts: set) -> bool:
        """Check if question uses contexts that are too similar to already used ones"""
        if not question or not question.question or not used_contexts:
            return True  # Allow if no context to check against
        
        import re
        q_text = question.question.lower()
        
        # Check for art-related terms specifically (strict check)
        art_patterns = [
            r'\b(?:school\s+)?art\s+project',
            r'\bcommunity\s+art\s+project',
            r'\b(?:school\s+)?mural',
            r'\bcommunity\s+mural',
            r'\bgeometric\s+pattern',
            r'\bart\s+club',
            r'\bart\s+room',
        ]
        
        # Check if this question contains art-related terms
        has_art_context = any(re.search(pattern, q_text) for pattern in art_patterns)
        
        # If it has art context and we've already used art contexts, reject it
        # But be lenient - only reject if we've used art contexts multiple times (2+)
        if has_art_context:
            art_keywords_in_used = [
                ctx for ctx in used_contexts
                if 'art' in ctx or 'mural' in ctx or 'pattern' in ctx
            ]
            if len(art_keywords_in_used) >= 2:  # Only reject if 2+ art contexts already used
                logger.debug(f"Rejecting question due to repeated art context (already have {len(art_keywords_in_used)} art contexts): {question.question[:100]}...")
                return False
        
        # Check for other repeated contexts
        for context in used_contexts:
            # Create a pattern to check if the context appears in the question
            # Make it more lenient - only reject if it's the main context
            if len(context.split()) <= 2:  # Single words or short phrases
                pattern = r'\b' + re.escape(context.lower()) + r'\b'
                if re.search(pattern, q_text):
                    # Check if this is a significant match (not just a word in a longer phrase)
                    logger.debug(f"Rejecting question due to repeated context '{context}': {question.question[:100]}...")
                    return False
        
        return True

class QuestionGenerator:
    """Enhanced question generator with improved variations"""
    
    def __init__(self, questions_data: List[Dict], lm_client: LMStudioClient, validator: 'QuestionValidator'):
        self.questions_data = questions_data
        self.lm_client = lm_client
        self.validator = validator
        self._used_question_ids = set()
        # Track recently used character names to avoid repetition across questions
        try:
            from collections import deque
            self._recent_names = deque(maxlen=16)
            # Track existential openings usage (There is/are/was/were) to limit frequency
            self._recent_existential = deque(maxlen=20)
            # Track opening patterns for variety (person names, numbers, actions, questions, etc.)
            self._recent_opening_patterns = deque(maxlen=30)
        except Exception:
            self._recent_names = None
            self._recent_existential = None
            self._recent_opening_patterns = None
    
    def _check_context_diversity(self, question: Question, used_contexts: set) -> bool:
        """Check if question uses contexts that are too similar to already used ones"""
        if not question or not question.question or not used_contexts:
            return True  # Allow if no context to check against
        
        import re
        q_text = question.question.lower()
        
        # Check for art-related terms specifically (strict check)
        art_patterns = [
            r'\b(?:school\s+)?art\s+project',
            r'\bcommunity\s+art\s+project',
            r'\b(?:school\s+)?mural',
            r'\bcommunity\s+mural',
            r'\bgeometric\s+pattern',
            r'\bart\s+club',
            r'\bart\s+room',
        ]
        
        # Check if this question contains art-related terms
        has_art_context = any(re.search(pattern, q_text) for pattern in art_patterns)
        
        # If it has art context and we've already used art contexts, reject it
        # But be lenient - only reject if we've used art contexts multiple times (2+)
        if has_art_context:
            art_keywords_in_used = [
                ctx for ctx in used_contexts
                if 'art' in ctx or 'mural' in ctx or 'pattern' in ctx
            ]
            if len(art_keywords_in_used) >= 2:  # Only reject if 2+ art contexts already used
                logger.debug(f"Rejecting question due to repeated art context (already have {len(art_keywords_in_used)} art contexts): {question.question[:100]}...")
                return False
        
        # Check for other repeated contexts
        for context in used_contexts:
            # Create a pattern to check if the context appears in the question
            # Make it more lenient - only reject if it's the main context
            if len(context.split()) <= 2:  # Single words or short phrases
                pattern = r'\b' + re.escape(context.lower()) + r'\b'
                if re.search(pattern, q_text):
                    # Check if this is a significant match (not just a word in a longer phrase)
                    logger.debug(f"Rejecting question due to repeated context '{context}': {question.question[:100]}...")
                    return False
        
        return True
    
    def get_sample_questions_by_topic(self, topic: str, count: int = 4) -> List[Dict]:
        """Get sample questions for a specific topic with graceful fallbacks for similar topics."""
        required_fields = ['question', 'options', 'correct_answer_index', 'correct_answer_text', 'topic']
        topic_questions = [
            q for q in self.questions_data 
            if q.get('topic') == topic and all(field in q for field in required_fields)
        ]
        if not topic_questions:
            # Fallback 1: substring/similarity match on topic words
            t_words = [w for w in re.split(r"[^a-zA-Z]+", topic.lower()) if w]
            def similar_topic(qt: str) -> bool:
                qt_l = (qt or '').lower()
                return any(w in qt_l for w in t_words)
            topic_questions = [
                q for q in self.questions_data
                if similar_topic(q.get('topic', '')) and all(field in q for field in required_fields)
            ]
        return random.sample(topic_questions, min(count, len(topic_questions)))
    
    def _sample_original_question(self, topic: str, question_type: str) -> Optional[Question]:
        """Sample a validated question directly from the curated dataset to ensure correctness."""
        candidates = []
        for data in self.questions_data:
            if data.get('topic') != topic:
                continue
            has_options = bool(data.get('options'))
            if question_type == "MCQ" and not has_options:
                continue
            if question_type != "MCQ" and has_options:
                continue
            q_id = data.get('id')
            if q_id in self._used_question_ids:
                continue
            candidates.append(data)
        
        if not candidates:
            return None
        
        random.shuffle(candidates)
        for data in candidates:
            q_id = data.get('id')
            options = [str(opt) for opt in (data.get('options') or [])]
            correct_index = data.get('correct_answer_index', -1)
            try:
                if isinstance(correct_index, str) and correct_index.strip():
                    correct_index = int(correct_index)
            except ValueError:
                correct_index = -1
            question_text = (data.get('question', '') or '').strip()
            if question_text and not question_text.endswith(('.', '?', '!')):
                question_text += '?'
            question_obj = Question(
                id=q_id or f"original_{topic}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                question=question_text,
                options=options,
                correct_answer_index=correct_index,
                correct_answer_text=str(data.get('correct_answer_text', '') or ''),
                topic=topic,
                source="Original",
                question_type=question_type,
                marks=data.get('marks', 1 if question_type == "MCQ" else 4)
            )
            
            if question_type == "MCQ":
                if not self._repair_mcq_options(question_obj):
                    continue
            else:
                question_obj.options = []
                question_obj.correct_answer_index = -1
            
            if not self.validator.validate_question(question_obj):
                continue
            
            self._used_question_ids.add(q_id)
            return question_obj
        
        return None
    
    def generate_question(self, topic: str, question_type: str = "MCQ", difficulty: str = "Medium", used_contexts: Optional[set] = None) -> Optional[Question]:
        """Generate a high-quality question with validation and retry"""
        sample_questions = self.get_sample_questions_by_topic(topic, 4)
        
        if not sample_questions:
            logger.warning(f"No sample questions found for topic: {topic}")
            return None
        
        # Prefer curated originals whenever available to guarantee correctness
        original_question = self._sample_original_question(topic, question_type)
        if original_question:
            return original_question
        
        # Try multiple times to get a high-quality question
        # Further reduced attempts to speed up runtime; rely on better prompts/templates
        max_attempts = 2
        max_context_rejections = 4  # Allow up to 4 context diversity rejections before being lenient
        context_rejection_count = 0
        best_question = None
        best_score = 0
        
        # Track and avoid overuse of location-leading openings like "In a ..."
        def _starts_with_location_opener(text: str) -> bool:
            try:
                import re
                return bool(re.match(r"^\s*(in|at|on)\s+(a|an|the)\s+\w", (text or "").strip(), flags=re.IGNORECASE))
            except Exception:
                return False

        def _rewrite_away_from_location_opener(text: str) -> str:
            """Heuristic rewrite: move leading location prepositional phrase later.
            Example: "In a park, Sarah planted trees." -> "Sarah planted trees in a park."""
            try:
                import re
                s = (text or "").strip()
                # Pattern capturing: In a/the/an <place>, <rest>
                m = re.match(r"^\s*(in|at|on)\s+(a|an|the)\s+([^,]+),\s*(.+)$", s, flags=re.IGNORECASE)
                if m:
                    prep, art, place, rest = m.groups()
                    # Clean up rest - remove trailing fragments like ". are" or ". is"
                    rest = re.sub(r"\.\s+(are|is|was|were)\s*$", "", rest.strip(), flags=re.IGNORECASE)
                    # Ensure proper ending punctuation
                    if not rest.endswith(('.', '!', '?')):
                        rest = rest.rstrip('.')
                    return f"{rest} {prep.lower()} {art.lower()} {place}."
                # Another pattern: "In a <place> <subject> ..." (no comma)
                m2 = re.match(r"^\s*(in|at|on)\s+(a|an|the)\s+([^,]+)\s+(.*)$", s, flags=re.IGNORECASE)
                if m2:
                    prep, art, place, rest = m2.groups()
                    # Clean up rest
                    rest = re.sub(r"\.\s+(are|is|was|were)\s*$", "", rest.strip(), flags=re.IGNORECASE)
                    if not rest.endswith(('.', '!', '?')):
                        rest = rest.rstrip('.')
                    return f"{rest} {prep.lower()} {art.lower()} {place}."
                return text
            except Exception:
                return text

        def _polish_question_opening(text: str) -> str:
            """Polish the beginning of a question: ensure capitalization and reduce repetitive 'The ...' starts.
            Heuristics only; aim to avoid harming content.
            """
            try:
                import re
                s = (text or "").strip()
                if not s:
                    return text
                # Ensure first letter uppercase without altering acronyms/numbers
                if re.match(r"^[a-z]", s):
                    s = s[0].upper() + s[1:]

                # Replace leading 'the ' with 'The '
                s = re.sub(r"^\s*the\s+", "The ", s)

                # If starts with 'The ' followed by a generic noun, swap to 'A/An '
                generic_nouns = (
                    "park", "garden", "hall", "room", "field", "playground", "banner", "plot", "lawn", "carpet",
                    "pond", "fountain", "container", "tank", "box", "crate", "pool", "building", "area",
                    "number", "amount", "ratio", "sum", "difference", "product", "average", "volume", "perimeter",
                    "area", "length", "mass", "time", "distance", "speed", "rate", "student", "students",
                    "teacher", "shop", "store"
                )
                m = re.match(r"^The\s+([A-Za-z]+)(\b.*)$", s)
                if m:
                    noun = m.group(1)
                    rest = m.group(2)
                    if noun.lower() in generic_nouns:
                        article = "An" if noun[0].lower() in "aeiou" else "A"
                        s = f"{article} {noun}{rest}"

                # Normalize spaces before punctuation
                s = re.sub(r"\s+([,.;!?])", r"\1", s)
                return s
            except Exception:
                return text

        def _diversify_names(text: str) -> str:
            """Replace overused default names with diverse alternatives, avoiding recent repeats."""
            try:
                import re, random
                s = (text or "")
                if not s:
                    return text
                # Pool of diverse given names (gender-balanced, culturally varied)
                name_pool = [
                    "Aisha", "Hiro", "Priya", "Diego", "Liam", "Noah", "Emma", "Olivia", "Mia", "Zoe",
                    "Lucas", "Mateo", "Sofia", "Aria", "Isla", "Ethan", "Ava", "Nora", "Leo", "Ivy",
                    "Amir", "Yuna", "Jia", "Wei", "Hana", "Kai", "Maya", "Ravi", "Fatima", "Omar",
                    "Elena", "Camila", "Jonas", "Greta", "Silas", "Anya", "Nikolai", "Layla", "Youssef", "Sora"
                ]
                # Overused/common defaults to swap away from
                stale_names = [
                    "Sarah", "David", "John", "Mary", "Peter", "Jane", "Tom", "James", "Emma", "Michael"
                ]
                # Build exclusion set from recent names already used and names already present in the text
                recent = set(self._recent_names or [])
                present = set(re.findall(r"\b[A-Z][a-z]+\b", s))
                # Replacement function that picks a name not in recent or present
                def pick_name() -> str:
                    candidates = [n for n in name_pool if n not in recent and n not in present]
                    if not candidates:
                        candidates = [n for n in name_pool if n not in recent]
                    return random.choice(candidates) if candidates else random.choice(name_pool)
                # Replace each stale name separately to possibly get different replacements
                for old in stale_names:
                    pattern = r"\b" + re.escape(old) + r"\b"
                    if re.search(pattern, s):
                        new_name = pick_name()
                        s = re.sub(pattern, new_name, s)
                        try:
                            if self._recent_names is not None:
                                self._recent_names.append(new_name)
                        except Exception:
                            pass
                return s
            except Exception:
                return text

        def _clean_trailing_fragments(text: str) -> str:
            """Remove trailing fragments like location phrases or verbs that appear after the question ends."""
            try:
                import re
                s = (text or "").strip()
                if not s:
                    return text
                
                # CRITICAL FIX: Remove trailing fragments AFTER question mark or period
                # Pattern: "? are" or "? are " or "? are." -> "?"
                # Must be more aggressive to catch fragments that slip through
                s = re.sub(r"([?!\.])\s*(are|is|was|were|have|has|had|do|does|did)\s*\.?\s*$", r"\1", s, flags=re.IGNORECASE)
                
                # Remove location phrases that come after question mark or period
                # Examples: "? in a playground." -> "?"
                #           ". in a bakery. were" -> "."
                s = re.sub(r"([?!\.])\s+(in|at|on)\s+(a|an|the)\s+[^.!?]+\s*\.?\s*(are|is|was|were|have|has|had|do|does|did)?\s*$", r"\1", s, flags=re.IGNORECASE)
                
                # Remove trailing fragments: period followed by common verbs
                s = re.sub(r"\.\s+(are|is|was|were|have|has|had|do|does|did)\s*$", ".", s, flags=re.IGNORECASE)
                
                # Remove trailing standalone words like "are" or "were" without period (after any whitespace)
                s = re.sub(r"\s+(are|is|was|were|have|has|had|do|does|did)\s*$", "", s, flags=re.IGNORECASE)
                
                # Remove location phrases at the very end (after any punctuation)
                # Pattern: ". in a location" or "? in a location" or just " in a location"
                s = re.sub(r"([?!\.])\s+(in|at|on)\s+(a|an|the)\s+\w+[^.!?]*\.?\s*$", r"\1", s, flags=re.IGNORECASE)
                
                # More aggressive: if we have question mark, keep only up to and including it
                q_match = re.search(r"([?!])", s)
                if q_match:
                    # Keep everything up to and including the last question mark or exclamation
                    last_punct = max(s.rfind('?'), s.rfind('!'))
                    if last_punct >= 0:
                        # Check if there's trailing junk after the punctuation
                        after_punct = s[last_punct+1:].strip()
                        # If after punctuation is just location phrases or fragments, remove it
                        if re.match(r"^(in|at|on)\s+(a|an|the)\s+", after_punct, flags=re.IGNORECASE):
                            s = s[:last_punct+1]
                        elif re.match(r"^(are|is|was|were|have|has|had|do|does|did)\s*\.?\s*$", after_punct, flags=re.IGNORECASE):
                            s = s[:last_punct+1]
                        elif after_punct and '.' in after_punct:
                            # If there's a period after, it might be a location phrase
                            parts = after_punct.split('.')
                            if len(parts) > 1 and re.match(r"^\s*(in|at|on)\s+(a|an|the)\s+", parts[0], flags=re.IGNORECASE):
                                s = s[:last_punct+1]
                
                # Clean up any remaining trailing period fragments
                s = re.sub(r"\.\s*\.\s*$", ".", s)  # Multiple periods
                s = re.sub(r"\?\s*\.\s*$", "?", s)  # Question mark followed by period
                
                # CRITICAL: If question ends with ?, aggressively remove anything after it
                if '?' in s:
                    last_q = s.rfind('?')
                    if last_q >= 0:
                        # ALWAYS remove everything after the last question mark if it's just fragments
                        after_q = s[last_q+1:].strip()
                        # If there's ANY text after ?, check if it's just fragments
                        if after_q:
                            # Check if it's just common fragment words (with or without punctuation)
                            fragment_pattern = r'^(are|is|was|were|have|has|had|do|does|did)\s*\.?\s*$'
                            if re.match(fragment_pattern, after_q, flags=re.IGNORECASE):
                                s = s[:last_q+1]
                            # If it starts with fragment word followed by anything, still remove it
                            elif re.match(r'^(are|is|was|were)\s+', after_q, flags=re.IGNORECASE):
                                s = s[:last_q+1]
                        # If after ? is empty or just whitespace, that's fine
                
                # Final aggressive cleanup - remove any trailing fragments after ANY punctuation
                # This catches cases where fragments might have slipped through
                s = re.sub(r"([?!\.])\s*(are|is|was|were|have|has|had|do|does|did)\s*\.?\s*$", r"\1", s, flags=re.IGNORECASE)
                s = re.sub(r"\s+(are|is|was|were|have|has|had|do|does|did)\s*$", "", s, flags=re.IGNORECASE)
                
                # Remove duplicate instructions (e.g., "to 1 decimal place. to 2 decimal places")
                s = re.sub(r'to\s+(\d+)\s+decimal\s+place(?:s)?\.\s*to\s+(\d+)\s+decimal\s+place(?:s)?', r'to \2 decimal places', s, flags=re.IGNORECASE)
                s = re.sub(r'correct\s+to\s+(\d+)\s+decimal\s+place(?:s)?\.\s*to\s+(\d+)\s+decimal\s+place(?:s)?', r'correct to \2 decimal places', s, flags=re.IGNORECASE)
                
                # Remove trailing instruction fragments after decimal place instructions
                # Pattern: "...decimal place. with cash or measurements." -> "...decimal place."
                s = re.sub(r'(decimal\s+place(?:s)?)\.\s+(with|or|and|using|in|for)\s+[^.!?]+\s*\.?$', r'\1.', s, flags=re.IGNORECASE)
                
                # Remove common trailing instruction fragments
                # Pattern: "...? with cash or measurements."
                trailing_patterns = [
                    r'\s+with\s+(cash|measurements|money|units)\s+or\s+[^.!?]+\s*\.?$',
                    r'\s+(with|or|and|using)\s+(cash|measurements|money|units)\s*\.?$',
                ]
                for pattern in trailing_patterns:
                    s = re.sub(pattern, '', s, flags=re.IGNORECASE)
                
                return s.strip()
            except Exception:
                return text
        
        def _detect_incomplete_fractions(text: str) -> bool:
            """Detect incomplete fractions like '3/' or '3/ of' that make questions unsolvable."""
            try:
                import re
                # Pattern: digit followed by / but no digit after (or just whitespace/end)
                # Examples: "3/", "3/ ", "3/ of", "3/ of the"
                if re.search(r'\d+\s*/\s*(?=\s|of|$|[^0-9])', text, flags=re.IGNORECASE):
                    return True
                # Also check for fractions at word boundaries like "3/of" or "3/ " followed by non-digit
                if re.search(r'\b\d+\s*/\s+(?!\d)', text, flags=re.IGNORECASE):
                    # But allow if followed by a word that might be part of fraction notation
                    # Actually, if it's "/ of" or "/ " and no number, it's incomplete
                    match = re.search(r'\d+\s*/\s+', text, flags=re.IGNORECASE)
                    if match:
                        after_slash = text[match.end():].strip()
                        # If next character is not a digit, it's likely incomplete
                        if after_slash and not re.match(r'^\d', after_slash):
                            # Exception: "3/4" is complete, but "3/ of" is not
                            if re.match(r'^(of|the|a|an)\s', after_slash, flags=re.IGNORECASE):
                                return True
                return False
            except Exception:
                return False

        def _replace_placeholder_names(text: str) -> str:
            """Replace placeholders like [Name] (case-insensitive) with a single chosen name per question."""
            try:
                import re, random
                s = (text or "")
                if not s:
                    return text
                # Detect placeholder occurrences
                placeholders = re.findall(r"\[(?:name|Name|NAME)\]", s)
                if not placeholders:
                    return text
                # Use the same name for all placeholders in this question
                name_pool = [
                    "Aisha", "Hiro", "Priya", "Diego", "Liam", "Noah", "Emma", "Olivia", "Mia", "Zoe",
                    "Lucas", "Mateo", "Sofia", "Aria", "Isla", "Ethan", "Ava", "Nora", "Leo", "Ivy",
                    "Amir", "Yuna", "Jia", "Wei", "Hana", "Kai", "Maya", "Ravi", "Fatima", "Omar",
                    "Elena", "Camila", "Jonas", "Greta", "Silas", "Anya", "Nikolai", "Layla", "Youssef", "Sora"
                ]
                recent = set(self._recent_names or [])
                present = set(re.findall(r"\b[A-Z][a-z]+\b", s))
                candidates = [n for n in name_pool if n not in recent and n not in present]
                if not candidates:
                    candidates = [n for n in name_pool if n not in recent]
                chosen = random.choice(candidates) if candidates else random.choice(name_pool)
                s = re.sub(r"\[(?:name|Name|NAME)\]", chosen, s)
                try:
                    if self._recent_names is not None:
                        self._recent_names.append(chosen)
                except Exception:
                    pass
                return s
            except Exception:
                return text

        def _rewrite_existential_opening(text: str) -> str:
            """Rewrite openings like 'There is/are/was/were ...' to subject-first.
            Examples:
              There are 24 apples in a box. -> 24 apples are in a box.
              There is a tank that holds 80 L. -> A tank holds 80 L.
            """
            try:
                import re
                s = (text or "").strip()
                if not s:
                    return text
                m = re.match(r"^There\s+(is|are|was|were)\s+(.+)$", s, flags=re.IGNORECASE)
                if not m:
                    return text
                verb = m.group(1).lower()
                rest = (m.group(2) or "").strip()
                if not rest:
                    return text

                # Normalize sentence fragments for recombination
                rest = rest.rstrip()
                rest_no_trailing = rest.rstrip(".!?")

                # Prepare subject/detail split
                subject_phrase = rest_no_trailing
                detail_phrase = ""

                # Case 1: relative clause "that/which"
                rel_match = re.match(r"^([^.?,;]+?)\s+(that|which)\s+(.*)$", rest_no_trailing, flags=re.IGNORECASE)
                if rel_match:
                    subject_phrase = rel_match.group(1).strip()
                    detail_phrase = rel_match.group(3).strip()
                else:
                    # Case 2: prepositional phrase following the noun phrase
                    prep_match = re.match(r"^([^.?,;]+?)(\s+(?:in|at|on|with|within|inside|outside|by|for|from|over|under|near|beside|among)\b.*)$", rest_no_trailing, flags=re.IGNORECASE)
                    if prep_match:
                        subject_phrase = prep_match.group(1).strip()
                        detail_phrase = prep_match.group(2).strip()

                # Capitalize subject appropriately (unless it starts with a number)
                if subject_phrase and subject_phrase[0].isalpha():
                    subject_phrase = subject_phrase[0].upper() + subject_phrase[1:]

                verb_map = {"is": "is", "are": "are", "was": "was", "were": "were"}
                new_verb = verb_map.get(verb, verb)

                if rel_match:
                    # Detail already contains a verb (e.g., "holds 80 L") - drop the copula
                    sentence = f"{subject_phrase} {detail_phrase}"
                elif detail_phrase:
                    sentence = f"{subject_phrase} {new_verb} {detail_phrase}"
                else:
                    sentence = f"{subject_phrase} {new_verb}"

                sentence = re.sub(r"\s+", " ", sentence).strip()
                if sentence and sentence[-1] not in ".!?":
                    sentence += "."
                return sentence
            except Exception:
                return text

        def _is_existential_opening(text: str) -> bool:
            try:
                import re
                return bool(re.match(r"^\s*there\s+(is|are|was|were)\b", (text or "").strip(), flags=re.IGNORECASE))
            except Exception:
                return False

        def _should_allow_existential() -> bool:
            """Allow existential openings occasionally (e.g., <= 20% over recent 20 questions)."""
            try:
                import random
                if self._recent_existential is None or len(self._recent_existential) == 0:
                    # Cold start: allow with 1/4 probability
                    return random.random() < 0.25
                window = list(self._recent_existential)
                used = sum(1 for x in window if x)
                ratio = used / max(1, len(window))
                # Target <= 0.2; allow if under target, else small chance to avoid hard ban
                if ratio < 0.2:
                    return True
                # 10% chance even if above target to avoid deterministic feel
                return random.random() < 0.10
            except Exception:
                return False

        def _classify_opening_pattern(text: str) -> str:
            """Classify the opening pattern of a question for variety tracking."""
            try:
                import re
                s = (text or "").strip()
                if not s:
                    return "unknown"
                s_lower = s.lower()
                # Direct questions
                if re.match(r"^(how|what|which|when|where|why)\s+", s_lower):
                    return "direct_question"
                # Person/name starts
                if re.match(r"^[A-Z][a-z]+\s+(has|had|buys|bought|sells|sold|makes|made|gets|got|wants|needed|distributed|collected|painted|planted|shared|divided)", s_lower):
                    return "person_action"
                # Numbers/quantities
                if re.match(r"^(\d+|A\s+total\s+of|A\s+group\s+of|An?\s+amount\s+of)\s+", s_lower):
                    return "quantity_start"
                # Existential
                if re.match(r"^there\s+(is|are|was|were)\s+", s_lower):
                    return "existential"
                # Actions/time-based
                if re.match(r"^(after|before|during|when|while|once|if)\s+", s_lower):
                    return "action_time"
                # Articles + noun (generic)
                if re.match(r"^(a|an|the)\s+", s_lower):
                    return "article_noun"
                # Prepositional location
                if re.match(r"^(in|at|on)\s+(a|an|the)\s+", s_lower):
                    return "location_prep"
                # Imperative/instructions
                if re.match(r"^(find|calculate|solve|determine|work\s+out|compute)\s+", s_lower):
                    return "imperative"
                return "other"
            except Exception:
                return "unknown"


        for attempt in range(max_attempts):
            logger.info(f"Generation attempt {attempt + 1}/{max_attempts} for {topic} ({question_type})")
            
            # Try LM Studio generation first
            if self.lm_client.is_available():
                try:
                    generated_question = self._try_lm_studio_generation(sample_questions, topic, question_type, difficulty, used_contexts)
                    if generated_question:
                        # Heuristic fix: rewrite opening if it starts with a location
                        if _starts_with_location_opener(generated_question.question or ""):
                            rewritten = _rewrite_away_from_location_opener(generated_question.question)
                            if rewritten and rewritten != generated_question.question:
                                generated_question.question = rewritten
                        # Polish opening capitalization and reduce repetitive 'The ...' starts
                        generated_question.question = _polish_question_opening(generated_question.question)
                        # Replace placeholder names like [Name]
                        generated_question.question = _replace_placeholder_names(generated_question.question)
                        # Clean trailing fragments like ". are" or standalone "are"
                        generated_question.question = _clean_trailing_fragments(generated_question.question)
                        # Existential openings: allow occasionally based on recent frequency; otherwise rewrite
                        if _is_existential_opening(generated_question.question):
                            allow = _should_allow_existential()
                            try:
                                if self._recent_existential is not None:
                                    self._recent_existential.append(bool(allow))
                            except Exception:
                                pass
                            if not allow:
                                generated_question.question = _rewrite_existential_opening(generated_question.question)
                        else:
                            try:
                                if self._recent_existential is not None:
                                    self._recent_existential.append(False)
                            except Exception:
                                pass
                        # Track opening pattern for variety
                        try:
                            if self._recent_opening_patterns is not None:
                                pattern = _classify_opening_pattern(generated_question.question)
                                self._recent_opening_patterns.append(pattern)
                        except Exception:
                            pass
                        # Diversify character names to avoid repeats like "Sarah"
                        generated_question.question = _diversify_names(generated_question.question)
                        
                        # FINAL AGGRESSIVE CLEANUP: Multiple passes to catch all trailing fragments
                        for _ in range(3):  # Multiple passes to catch stubborn fragments
                            old_q = generated_question.question
                            generated_question.question = _clean_trailing_fragments(generated_question.question)
                            if generated_question.question == old_q:
                                break  # No more changes needed
                        
                        # Final check: ensure no trailing "are", "is", etc. after question mark
                        if generated_question.question and '?' in generated_question.question:
                            last_q_idx = generated_question.question.rfind('?')
                            if last_q_idx >= 0 and last_q_idx + 1 < len(generated_question.question):
                                after_q = generated_question.question[last_q_idx+1:].strip()
                                if after_q and re.match(r'^(are|is|was|were)\s*\.?\s*$', after_q, flags=re.IGNORECASE):
                                    generated_question.question = generated_question.question[:last_q_idx+1]
                        
                        # Check for incomplete fractions - reject immediately if found
                        if _detect_incomplete_fractions(generated_question.question):
                            logger.warning(f"REJECTED: Question has incomplete fraction (e.g., '3/') - unsolvable | Q: {generated_question.question[:80]}...")
                            continue
                        
                        # Attempt MCQ auto-repair before validation
                        if generated_question.question_type == "MCQ":
                            if not self._repair_mcq_options(generated_question):
                                logger.warning("Rejected MCQ: option repair failed to produce valid choices")
                                continue
                        # Check context diversity (but be lenient - only check if we have many contexts already)
                        # Allow questions through if quality is good enough (>= 5) even with context repetition
                        context_check = self._check_context_diversity(generated_question, used_contexts or set())
                        if not context_check:
                            context_rejection_count += 1
                            # If quality is decent (>=5), allow it despite context repetition
                            quality_preview = self.validator.get_quality_score(generated_question)
                            if quality_preview >= 5:
                                logger.debug(f"Allowing question with context repetition due to good quality ({quality_preview}/10)")
                                # Allow it through
                            elif context_rejection_count >= max_context_rejections:
                                logger.info(f"Context diversity rejected {context_rejection_count} times, allowing question through to avoid infinite loop")
                                # Allow it through, but continue to check quality
                            else:
                                logger.debug(f"Rejected question due to context repetition ({context_rejection_count}/{max_context_rejections}), retrying...")
                                continue  # Skip this attempt and try again
                        
                        # Validate the question
                        if self.validator.validate_question(generated_question):
                            # Manual review - comprehensive quality check
                            is_approved, review_reason = self.validator.manual_review_question(generated_question, topic)
                            if not is_approved:
                                logger.warning(f"REJECTED by manual review: {review_reason} | Q: {generated_question.question[:80]}...")
                                continue  # Skip this question and try again
                            
                            quality_score = self.validator.get_quality_score(generated_question)
                            logger.info(f"Generated valid question with quality score: {quality_score}/10 | Review: {review_reason}")
                            
                            # Stricter quality threshold to reject poor questions
                            if quality_score >= 7:  # Raised from 6 to ensure better quality
                                logger.info(f"SUCCESS: High-quality question generated for {topic} (Score: {quality_score}/10)")
                                return generated_question
                            else:
                                # Try a quality nudge re-prompt
                                nudge_q = self._try_quality_nudge(sample_questions, topic, question_type, difficulty, used_contexts)
                                if nudge_q:
                                    if _starts_with_location_opener(nudge_q.question or ""):
                                        rewritten_n = _rewrite_away_from_location_opener(nudge_q.question)
                                        if rewritten_n and rewritten_n != nudge_q.question:
                                            nudge_q.question = rewritten_n
                                    nudge_q.question = _polish_question_opening(nudge_q.question)
                                    nudge_q.question = _replace_placeholder_names(nudge_q.question)
                                    nudge_q.question = _clean_trailing_fragments(nudge_q.question)
                                    if _is_existential_opening(nudge_q.question):
                                        allow_n = _should_allow_existential()
                                        try:
                                            if self._recent_existential is not None:
                                                self._recent_existential.append(bool(allow_n))
                                        except Exception:
                                            pass
                                        if not allow_n:
                                            nudge_q.question = _rewrite_existential_opening(nudge_q.question)
                                    else:
                                        try:
                                            if self._recent_existential is not None:
                                                self._recent_existential.append(False)
                                        except Exception:
                                            pass
                                    nudge_q.question = _diversify_names(nudge_q.question)
                                    # FINAL AGGRESSIVE CLEANUP: Multiple passes
                                    for _ in range(3):
                                        old_q = nudge_q.question
                                        nudge_q.question = _clean_trailing_fragments(nudge_q.question)
                                        if nudge_q.question == old_q:
                                            break
                                    # Final check for trailing fragments after ?
                                    if nudge_q.question and '?' in nudge_q.question:
                                        last_q_idx = nudge_q.question.rfind('?')
                                        if last_q_idx >= 0 and last_q_idx + 1 < len(nudge_q.question):
                                            after_q = nudge_q.question[last_q_idx+1:].strip()
                                            if after_q and re.match(r'^(are|is|was|were)\s*\.?\s*$', after_q, flags=re.IGNORECASE):
                                                nudge_q.question = nudge_q.question[:last_q_idx+1]
                                    # Check for incomplete fractions
                                    if _detect_incomplete_fractions(nudge_q.question):
                                        logger.warning(f"REJECTED nudge: incomplete fraction | Q: {nudge_q.question[:80]}...")
                                        nudge_q = None
                                        continue
                                    # Track opening pattern for variety
                                    try:
                                        if self._recent_opening_patterns is not None:
                                            pattern = _classify_opening_pattern(nudge_q.question)
                                            self._recent_opening_patterns.append(pattern)
                                    except Exception:
                                        pass
                                    # Check context diversity for nudge result too (but be lenient after many rejections)
                                    nudge_context_check = self._check_context_diversity(nudge_q, used_contexts or set())
                                    if not nudge_context_check:
                                        context_rejection_count += 1
                                        if context_rejection_count >= max_context_rejections:
                                            logger.info(f"Context diversity rejected {context_rejection_count} times for nudge, allowing through")
                                            # Allow it through and continue processing
                                        else:
                                            logger.debug(f"Rejected nudge question due to context repetition ({context_rejection_count}/{max_context_rejections})")
                                            nudge_q = None  # Skip this nudge
                                    
                                    if nudge_q:  # Only process if nudge passed context check or we're being lenient
                                        if nudge_q.question_type == "MCQ":
                                            if not self._repair_mcq_options(nudge_q):
                                                logger.warning("Rejected nudge MCQ: option repair failed")
                                                nudge_q = None
                                                continue
                                        if self.validator.validate_question(nudge_q):
                                            # Manual review for nudge question
                                            is_approved, review_reason = self.validator.manual_review_question(nudge_q, topic)
                                            if not is_approved:
                                                logger.warning(f"REJECTED nudge question: {review_reason}")
                                                nudge_q = None
                                            else:
                                                n_score = self.validator.get_quality_score(nudge_q)
                                                logger.info(f"Nudge result quality score: {n_score}/10 | Review: {review_reason}")
                                                if n_score >= 7:  # Raised threshold for quality
                                                    return nudge_q
                                    elif self.validator.validate_question(nudge_q):
                                        # Manual review for nudge question
                                        is_approved, review_reason = self.validator.manual_review_question(nudge_q, topic)
                                        if is_approved:
                                            n_score = self.validator.get_quality_score(nudge_q)
                                            logger.info(f"Nudge result quality score: {n_score}/10 | Review: {review_reason}")
                                            if n_score >= 7:  # Raised threshold for quality
                                                return nudge_q
                                        else:
                                            logger.warning(f"REJECTED nudge question: {review_reason}")
                            
                            if quality_score > best_score:
                                best_question = generated_question
                                best_score = quality_score
                                logger.info(f"Better question found (score: {quality_score}/10), continuing search...")
                        else:
                            logger.warning(f"Generated question failed validation for {topic}")
                except Exception as e:
                    logger.warning(f"LM Studio generation failed: {e}")
            
            # If LM Studio failed or produced low quality, try enhanced variations
            try:
                variation_question = self._generate_enhanced_variation(sample_questions, topic, question_type)
                if variation_question:
                    if _starts_with_location_opener(variation_question.question or ""):
                        rewritten_v = _rewrite_away_from_location_opener(variation_question.question)
                        if rewritten_v and rewritten_v != variation_question.question:
                            variation_question.question = rewritten_v
                    variation_question.question = _polish_question_opening(variation_question.question)
                    variation_question.question = _replace_placeholder_names(variation_question.question)
                    variation_question.question = _clean_trailing_fragments(variation_question.question)
                    if _is_existential_opening(variation_question.question):
                        allow_v = _should_allow_existential()
                        try:
                            if self._recent_existential is not None:
                                self._recent_existential.append(bool(allow_v))
                        except Exception:
                            pass
                        if not allow_v:
                            variation_question.question = _rewrite_existential_opening(variation_question.question)
                    else:
                        try:
                            if self._recent_existential is not None:
                                self._recent_existential.append(False)
                        except Exception:
                            pass
                    variation_question.question = _diversify_names(variation_question.question)
                    # FINAL AGGRESSIVE CLEANUP: Multiple passes
                    for _ in range(3):
                        old_q = variation_question.question
                        variation_question.question = _clean_trailing_fragments(variation_question.question)
                        if variation_question.question == old_q:
                            break
                    # Final check for trailing fragments after ?
                    if variation_question.question and '?' in variation_question.question:
                        last_q_idx = variation_question.question.rfind('?')
                        if last_q_idx >= 0 and last_q_idx + 1 < len(variation_question.question):
                            after_q = variation_question.question[last_q_idx+1:].strip()
                            if after_q and re.match(r'^(are|is|was|were)\s*\.?\s*$', after_q, flags=re.IGNORECASE):
                                variation_question.question = variation_question.question[:last_q_idx+1]
                    # Check for incomplete fractions - reject if found
                    if _detect_incomplete_fractions(variation_question.question):
                        logger.warning(f"REJECTED variation: incomplete fraction | Q: {variation_question.question[:80]}...")
                        continue
                    # Track opening pattern for variety
                    try:
                        if self._recent_opening_patterns is not None:
                            pattern = _classify_opening_pattern(variation_question.question)
                            self._recent_opening_patterns.append(pattern)
                    except Exception:
                        pass
                    # Check context diversity for variations too (but be lenient after many rejections)
                    var_context_check = self._check_context_diversity(variation_question, used_contexts or set())
                    if not var_context_check:
                        context_rejection_count += 1
                        if context_rejection_count >= max_context_rejections:
                            logger.info(f"Context diversity rejected {context_rejection_count} times for variation, allowing through")
                            # Allow it through and continue processing
                        else:
                            logger.debug(f"Rejected variation due to context repetition ({context_rejection_count}/{max_context_rejections})")
                            variation_question = None  # Skip this variation
                    
                    if variation_question:  # Only process if variation passed context check or we're being lenient
                        if variation_question.question_type == "MCQ":
                            if not self._repair_mcq_options(variation_question):
                                logger.warning("Variation question failed option repair for %s", topic)
                                variation_question = None
                                continue
                        if self.validator.validate_question(variation_question):
                            # Manual review for variation question
                            is_approved, review_reason = self.validator.manual_review_question(variation_question, topic)
                            if not is_approved:
                                logger.warning(f"REJECTED variation question: {review_reason}")
                                variation_question = None
                            else:
                                quality_score = self.validator.get_quality_score(variation_question)
                                logger.info(f"Generated valid variation with quality score: {quality_score}/10 | Review: {review_reason}")
                                
                                if quality_score >= 7:  # Keep variation threshold higher
                                    logger.info(f"SUCCESS: High-quality variation generated for {topic}")
                                    return variation_question
                                elif quality_score > best_score:
                                    best_question = variation_question
                                    best_score = quality_score
                                    logger.info(f"Better variation found (score: {quality_score}/10), continuing search...")
                    elif self.validator.validate_question(variation_question):
                        # Manual review for variation question
                        is_approved, review_reason = self.validator.manual_review_question(variation_question, topic)
                        if is_approved:
                            quality_score = self.validator.get_quality_score(variation_question)
                            logger.info(f"Generated valid variation with quality score: {quality_score}/10 | Review: {review_reason}")
                            
                            if quality_score >= 7:  # Keep variation threshold higher
                                logger.info(f"SUCCESS: High-quality variation generated for {topic}")
                                return variation_question
                            elif quality_score > best_score:
                                best_question = variation_question
                                best_score = quality_score
                                logger.info(f"Better variation found (score: {quality_score}/10), continuing search...")
                        else:
                            logger.warning(f"REJECTED variation question: {review_reason}")
                    else:
                        logger.warning(f"Variation question failed validation for {topic}")
            except Exception as e:
                logger.warning(f"Variation generation failed: {e}")
        
        # Return the best question found, even if not perfect - BUT only after manual review
        if best_question and best_score >= 5:  # Raised threshold - minimum quality for fallback
            # Final manual review check before using fallback
            is_approved, review_reason = self.validator.manual_review_question(best_question, topic)
            if not is_approved:
                logger.warning(f"REJECTED best available question: {review_reason} | Score: {best_score}/10")
                return None  # Don't use rejected questions even as fallback
            
            # Final context diversity check - but be lenient for fallback (especially if we've already rejected many)
            context_ok = self._check_context_diversity(best_question, used_contexts or set())
            if context_ok:
                logger.info(f"Using best available question for {topic} (score: {best_score}/10, review: {review_reason})")
                return best_question
            else:
                # If we've already rejected many contexts, be lenient
                if context_rejection_count >= max_context_rejections or best_score >= 6:
                    logger.info(f"Using best available question despite context repetition (score: {best_score}/10, context_rejections: {context_rejection_count}, review: {review_reason})")
                    return best_question
                else:
                    logger.debug(f"Best question failed context diversity check (score: {best_score}/10, context_rejections: {context_rejection_count})")
        else:
            if best_question:
                logger.warning(f"Failed to generate acceptable question for {topic} after {max_attempts} attempts (best score was {best_score}/10, threshold: 5)")
            else:
                logger.warning(f"Failed to generate any valid question for {topic} after {max_attempts} attempts")
            return None

    def _repair_mcq_options(self, question: 'Question') -> bool:
        """Normalize and repair MCQ options to ensure plausibility and one-correct mapping.

        Returns True when a consistent 4-option set with a verifiable correct choice is produced,
        otherwise returns False so callers can retry generation.
        """
        import re
        import random
        if not question or question.question_type != "MCQ":
            return True
        options = list(question.options or [])
        # Strip leading labels (A-D or 1-4 with various formats)
        def strip_label(s: str) -> str:
            if not s:
                return ""
            s = str(s).strip()
            # Remove A-D labels: "A)", "A.", "A:", "A -", etc.
            s = re.sub(r"^\s*[A-D][)\.:\-\s]*\s*", "", s, flags=re.IGNORECASE)
            # Handle numeric labels more carefully
            # Pattern 1: "1.4) 42" - remove "1.4) "
            # We match digit.digit followed by ) or similar punctuation
            s = re.sub(r"^\s*\d+\.\d+\s*[)\.:\-\s]+\s*", "", s)
            # Pattern 2: "1)", "1.", "1:", "1 -", etc. - single digit option labels
            # But only if followed by space or another pattern that suggests it's a label
            s = re.sub(r"^\s*\d+\s*[)\.:\-\s]+\s*(?=\S)", "", s)  # Lookahead ensures there's content after
            # Pattern 3: Remove standalone option numbers at start if they're clearly labels
            # Match "1 " or "1." followed by a number (not part of decimal)
            s = re.sub(r"^([1-4])\s*[)\.:\-]?\s+(?=\d)", "", s)  # "1. 42" -> "42" but keep "1.5" as is
            return s.strip()
        options = [strip_label(o) for o in options]
        # Filter out options that look like just option numbers (e.g., "1.5", "2.5" when they should be answers)
        # This catches cases where options are malformed
        def looks_like_option_number(opt: str) -> bool:
            """Check if option looks like just an option number (1-4) with decimal."""
            opt_clean = opt.strip()
            # Pattern: starts with 1-4, has decimal, ends with single digit (like "1.5", "2.5")
            if re.match(r"^[1-4]\.\d$", opt_clean):
                return True
            return False
        
        def is_placeholder_option(opt: str) -> bool:
            """Check if option is a placeholder like 'Option 1', 'Option 2', etc."""
            opt_lower = str(opt).strip().lower()
            # Match patterns like "Option 1", "option 2", "Option1", etc.
            if re.match(r"^(option|choice)\s*\d+$", opt_lower):
                return True
            return False
        
        # Remove options that are just option numbers, placeholders, or empty
        options = [o for o in options if not looks_like_option_number(o) and not is_placeholder_option(o) and o.strip()]
        
        # If we have too few valid options or mostly placeholders, we'll need to regenerate
        # Parse number and unit from correct answer first
        correct = strip_label(question.correct_answer_text or "")
        m = re.match(r"^\$?-?\d+(?:[.,]\d+)?\s*(.*)$", correct)
        unit = (m.group(1).strip() if m else "")
        
        # Detect units from question text if not already in correct answer
        if not unit and question.question:
            q_text = question.question.lower()
            # Common unit patterns in questions
            unit_patterns = [
                (r'\b(m²|m\s*\^?\s*2|square\s+meter[s]?|sq\s+m)', 'm²'),
                (r'\b(cm²|cm\s*\^?\s*2|square\s+centimeter[s]?|sq\s+cm)', 'cm²'),
                (r'\b(\d+\s*)?meter[s]?\b(?!\s*(squared|²|\^2|per|/))', 'm'),
                (r'\b(\d+\s*)?centimeter[s]?\b(?!\s*(squared|²|\^2|per|/))', 'cm'),
                (r'\b(\d+\s*)?kilometer[s]?\b', 'km'),
                (r'\b(\d+\s*)?gram[s]?\b', 'g'),
                (r'\b(\d+\s*)?kilogram[s]?\b', 'kg'),
                (r'\b(\d+\s*)?liter[s]?|L\b', 'L'),
                (r'\b(\d+\s*)?milliliter[s]?\b', 'mL'),
                (r'\b(\d+\s*)?minute[s]?\b', 'minutes'),
                (r'\b(\d+\s*)?hour[s]?\b', 'hours'),
                (r'\bsquare\s+feet|sq\s+ft', 'sq ft'),
            ]
            # Check if question asks for units explicitly
            asks_for_unit = any(re.search(pattern, q_text) for pattern, _ in unit_patterns)
            if asks_for_unit:
                # Extract the unit from question text
                for pattern, extracted_unit in unit_patterns:
                    if re.search(pattern, q_text):
                        unit = extracted_unit
                        break
        
        # Ensure correct answer present
        if correct and correct not in options:
            if isinstance(question.correct_answer_index, int) and 0 <= question.correct_answer_index < len(options):
                options[question.correct_answer_index] = correct
            else:
                options.append(correct)
        # Helper to parse numeric
        def parse_num(s: str):
            s2 = re.sub(r"[,$]", "", s)
            m2 = re.match(r"-?\d+(?:[.,]\d+)?", s2)
            try:
                return float(m2.group(0).replace(',', '')) if m2 else None
            except Exception:
                return None
        correct_num = parse_num(correct)
        
        # If we don't have enough valid options (less than 2) and we have a correct answer, regenerate options
        if len(options) < 2 and correct_num is not None:
            # Clear invalid options and regenerate
            options = []
        def fmt(val: float) -> str:
            if val is None:
                return correct
            if abs(val - int(val)) < 1e-9:
                s = f"{int(val)}"
            else:
                s = f"{val:.2f}"
            prefix = "$" if (question.correct_answer_text or "").strip().startswith("$") else ""
            # Add unit if available
            if unit:
                return prefix + s + f" {unit}"
            return prefix + s
        # Remove duplicates based on numeric value (treat "1062" and "1062 cm²" as same)
        def get_numeric_value(opt: str) -> tuple:
            """Extract numeric value from option for duplicate detection."""
            num = parse_num(opt)
            return (num, None) if num is not None else (None, opt.lower())
        
        # First, remove duplicates based on numeric value
        seen_nums = {}
        deduplicated = []
        for o in options:
            num_val, non_num = get_numeric_value(o)
            if num_val is not None:
                # If we've seen this number, prefer the one with unit if question asks for units
                if num_val in seen_nums:
                    existing = seen_nums[num_val]
                    has_unit_existing = bool(re.search(r'[a-zA-Z²]', existing))
                    has_unit_current = bool(re.search(r'[a-zA-Z²]', o))
                    if unit:
                        # Prefer the one with unit
                        if has_unit_current and not has_unit_existing:
                            # Replace existing with current (has unit)
                            deduplicated = [x for x in deduplicated if x != existing]
                            deduplicated.append(o)
                            seen_nums[num_val] = o
                        # else keep existing
                    else:
                        # Prefer the one without unit
                        if not has_unit_current and has_unit_existing:
                            deduplicated = [x for x in deduplicated if x != existing]
                            deduplicated.append(o)
                            seen_nums[num_val] = o
                else:
                    deduplicated.append(o)
                    seen_nums[num_val] = o
            else:
                # Non-numeric option, check full string
                if o.lower() not in [x.lower() for x in deduplicated]:
                    deduplicated.append(o)
        options = deduplicated
        
        # Ensure ALL options have the unit if question asks for units
        if unit:
            # Force add unit to ALL numeric options that don't have units
            options = [fmt(parse_num(o)) if (parse_num(o) is not None and not re.search(r'[a-zA-Z²]', o)) else o for o in options]
        
        # Generate distractors if fewer than 4
        seen = set(o.lower() for o in options)
        seen_nums_for_dist = {parse_num(o) for o in options if parse_num(o) is not None}
        while len(options) < 4 and correct_num is not None:
            for v in [correct_num * 1.1, correct_num * 0.9, correct_num + 1, max(0.0, correct_num - 1)]:
                cand = fmt(v)
                # Check both full string and numeric value for uniqueness
                if cand.lower() not in seen and v not in seen_nums_for_dist:
                    options.append(cand)
                    seen.add(cand.lower())
                    seen_nums_for_dist.add(v)
                if len(options) == 4:
                    break
            else:
                break
        
        # Final deduplication pass (by numeric value) to ensure no repeats
        final_options = []
        final_seen_nums = set()
        for o in options:
            num_val = parse_num(o)
            if num_val is not None:
                if num_val not in final_seen_nums:
                    final_options.append(o)
                    final_seen_nums.add(num_val)
            else:
                if o.lower() not in [x.lower() for x in final_options]:
                    final_options.append(o)
            if len(final_options) == 4:
                break
        options = final_options[:4]
        
        # Final pass: Ensure ALL numeric options have units if question asks for units
        if unit:
            options = [fmt(parse_num(o)) if (parse_num(o) is not None and not re.search(r'[a-zA-Z²]', o)) else o for o in options]
        
        # Determine the final correct answer string format
        correct_with_unit = None
        if unit and correct_num is not None:
            correct_with_unit = fmt(correct_num)
            # Replace any option with same numeric value with the one that has unit
            options = [fmt(parse_num(o)) if parse_num(o) == correct_num else o for o in options]
            if correct_with_unit not in options:
                # Find index of correct answer and update it
                for i, o in enumerate(options):
                    if parse_num(o) == correct_num:
                        options[i] = correct_with_unit
                        break
            correct = correct_with_unit
        
        # Final validation: ensure all options are valid (not empty, not just labels)
        # Remove any options that are still malformed after all processing
        validated_options = []
        for o in options:
            o_clean = str(o).strip()
            # Skip if empty
            if not o_clean:
                continue
            # Skip if still looks like an option number
            if looks_like_option_number(o_clean):
                continue
            # Skip if it's a placeholder
            if is_placeholder_option(o_clean):
                continue
            # Skip if it's just a label pattern (like "1." or "A)")
            if re.match(r"^[1-4A-D]\s*[)\.:\-]?\s*$", o_clean, flags=re.IGNORECASE):
                continue
            validated_options.append(o_clean)
        
        # If we lost options, try to regenerate from correct answer
        if len(validated_options) < 4 and correct_num is not None:
            # Add correct answer if missing
            correct_str = correct_with_unit if correct_with_unit else (str(int(correct_num)) if correct_num == int(correct_num) else str(correct_num))
            if correct_str not in validated_options:
                validated_options.insert(0, correct_str)
            # Regenerate missing distractors - use more diverse strategies
            distractor_strategies = [
                correct_num * 1.1, correct_num * 0.9,  # 10% off
                correct_num * 1.2, correct_num * 0.8,  # 20% off
                correct_num + 1, max(0.0, correct_num - 1),  # ±1
                correct_num * 1.5, correct_num * 0.5,  # 50% off
                correct_num + 5, max(0.0, correct_num - 5),  # ±5
                int(correct_num) + 10, max(0, int(correct_num) - 10),  # ±10
            ]
            for v in distractor_strategies:
                if len(validated_options) >= 4:
                    break
                cand = fmt(v)
                # Make sure it's different and not a placeholder
                if (cand not in validated_options and 
                    not looks_like_option_number(cand) and 
                    not is_placeholder_option(cand) and
                    parse_num(cand) != correct_num):
                    validated_options.append(cand)
        
        options = validated_options[:4]
        
        # Shuffle and set correct index
        if correct_num is not None:
            # Ensure correct answer is in options
            correct_str = correct_with_unit if correct_with_unit else (str(int(correct_num)) if correct_num == int(correct_num) else str(correct_num))
            if correct_str not in options:
                if len(options) < 4:
                    options.append(correct_str)
                else:
                    options[0] = correct_str
            random.shuffle(options)
            question.options = options
            question.correct_answer_index = options.index(correct_str) if correct_str in options else 0
            question.correct_answer_text = correct_str
        elif options:
            # Fallback if we don't have a numeric correct answer
            question.options = options
            if question.correct_answer_text:
                correct_str = question.correct_answer_text
                if correct_str not in options:
                    options[0] = correct_str
                question.correct_answer_index = options.index(correct_str) if correct_str in options else 0
            else:
                question.correct_answer_index = 0
        else:
            question.options = []
            return False

        # Final guardrails: ensure we end up with exactly four options and a matching correct answer
        if not question.options or len(question.options) != 4:
            logger.warning("MCQ option repair failed: need exactly four options after normalization")
            return False

        # Normalise texts for comparison
        def _norm(text: str) -> str:
            text = strip_label(text or "")
            return re.sub(r"\s+", " ", text.strip().lower())

        norm_options = [_norm(opt) for opt in question.options]
        norm_correct = _norm(question.correct_answer_text or "")

        if not norm_correct:
            logger.warning("MCQ option repair failed: correct answer text missing after normalization")
            return False

        if norm_correct not in norm_options:
            logger.warning(
                "MCQ option repair failed: correct answer not found among options | correct=%s | options=%s",
                question.correct_answer_text,
                question.options,
            )
            return False

        # Ensure index points to the correct option
        correct_idx = norm_options.index(norm_correct)
        if question.correct_answer_index != correct_idx:
            question.correct_answer_index = correct_idx

        return True

    def _try_quality_nudge(self, sample_questions: List[Dict], topic: str, question_type: str, difficulty: str, used_contexts: Optional[set] = None) -> Optional['Question']:
        """One-off re-prompt with explicit quality nudges (units, steps, rounding)."""
        context = self._create_rag_context(sample_questions, topic, question_type, used_contexts)
        nudge = (
            self._create_generation_prompt(context, topic, question_type, difficulty, used_contexts)
            + "\n\nADDITIONAL QUALITY REQUIREMENTS:\n"
              "- CRITICAL: Ensure the question is COMPLETE and SOLVABLE - include ALL necessary numbers/information.\n"
              "- If using fractions/percentages, MUST state the total/base amount explicitly.\n"
              "- Include explicit units and realistic magnitudes.\n"
              "- Ensure at least two steps with sequencing words.\n"
              "- For numeric answers, state rounding (nearest whole number or 1 dp).\n"
              "- For open-ended, options must be [].\n"
              "- AVOID repeating contexts/scenarios already used in this paper.\n"
              "- Verify the question can be solved with the information provided."
        )
        try:
            response, success = self.lm_client.chat(
                messages=[{"role": "user", "content": nudge}],
                temperature=0.6,
                max_tokens=1100,
            )
            if success and response:
                return self._parse_generated_question(response, topic, question_type)
        except Exception as e:
            logger.debug(f"Quality nudge error: {e}")
        return None
    
    def _try_lm_studio_generation(self, sample_questions: List[Dict], topic: str, question_type: str, difficulty: str, used_contexts: Optional[set] = None) -> Optional[Question]:
        """Try to generate a question using LM Studio with retry mechanism"""
        # Create RAG context
        context = self._create_rag_context(sample_questions, topic, question_type, used_contexts)
        prompt = self._create_generation_prompt(context, topic, question_type, difficulty, used_contexts)
        
        # Streamlined retry settings to improve latency
        retry_configs = [
            {"temperature": 0.6, "max_tokens": 1100, "prompt": prompt},
            {"temperature": 0.5, "max_tokens": 900,  "prompt": self._create_simple_prompt(topic, question_type)}
        ]
        
        for i, config in enumerate(retry_configs):
            try:
                logger.debug(f"LM Studio attempt {i+1}/8 with temperature {config['temperature']}")
                
                response, success = self.lm_client.chat(
                    messages=[{"role": "user", "content": config['prompt']}],
                    temperature=config['temperature'],
                    max_tokens=config['max_tokens']
                )
                
                if success and response:
                    logger.debug(f"LM Studio response (attempt {i+1}): {response}")
                    question = self._parse_generated_question(response, topic, question_type)
                    if question:
                        logger.info(f"Successfully generated question on attempt {i+1}")
                        return question
                    else:
                        logger.debug(f"Failed to parse response on attempt {i+1}")
                else:
                    logger.debug(f"LM Studio failed on attempt {i+1}")
                    
            except Exception as e:
                logger.debug(f"LM Studio error on attempt {i+1}: {e}")
        
        logger.warning("All LM Studio generation attempts failed")
        return None
    
    def _create_simple_prompt(self, topic: str, question_type: str) -> str:
        """Create a simpler prompt optimized for Mistral retry attempts"""
        if question_type == "MCQ":
            return f"""<s>[INST] Create ONE Primary 6 PSLE-standard {topic} MCQ.

- Strictly align to {topic}.
- Avoid money terms (money, dollars, price, cost, fees) unless TOPIC is Money & Rates.
- Vary scenarios; avoid overused contexts (food, shopping, school canteen) unless essential.
- Options must be numeric and plausible; exactly 4 options; only one correct.

Respond with ONLY this JSON (no extra text):
{{
    "question": "Question text",
    "options": ["A) 12.5", "B) 15.75", "C) 18.25", "D) 21.5"],
    "correct_answer_index": 0,
    "correct_answer_text": "A) 12.5",
    "question_type": "MCQ",
    "marks": 1
}}[/INST]"""
        else:
            return f"""<s>[INST] Create ONE Primary 6 PSLE-standard {topic} open-ended question.

- Strictly align to {topic}.
- Avoid money terms unless TOPIC is Money & Rates.
- Vary scenarios; avoid overused contexts (food, shopping, school canteen) unless essential.
- Require working.

Respond with ONLY this JSON (no extra text):
{{
    "question": "Question text",
    "options": [],
    "correct_answer_index": -1,
    "correct_answer_text": "Answer with working",
    "question_type": "Open-ended",
    "marks": 3
}}[/INST]"""
    
    def _get_underused_opening_suggestion(self) -> str:
        """Suggest an opening pattern that's underused recently to encourage variety."""
        try:
            import random
            if self._recent_opening_patterns is None or len(self._recent_opening_patterns) == 0:
                return ""
            patterns = list(self._recent_opening_patterns)
            from collections import Counter
            counts = Counter(patterns)
            total = len(patterns)
            # Find patterns used less than 15% of the time
            underused = [p for p, c in counts.items() if c / total < 0.15]
            if underused:
                return f"Consider starting with: {random.choice(underused).replace('_', ' ')} style"
            # All patterns fairly used, suggest a random one
            all_patterns = ["direct question", "person action", "quantity", "action/time-based", "imperative"]
            return f"Vary the opening - consider: {random.choice(all_patterns)}"
        except Exception:
            return ""

    def _create_rag_context(self, sample_questions: List[Dict], topic: str, question_type: str, used_contexts: Optional[set] = None) -> str:
        """Create RAG context optimized for Mistral from sample questions"""
        context = f"TOPIC: {topic}\nTYPE: {question_type}\n\nREFERENCE EXAMPLES (learn the structure, NOT the context):\n"
        
        for i, q in enumerate(sample_questions, 1):
            context += f"\nExample {i}:\n"
            context += f"Question: {q['question']}\n"
            if 'options' in q and q['options']:
                context += f"Options: {', '.join(q['options'])}\n"
            context += f"Answer: {q.get('correct_answer_text', 'N/A')}\n"
        
        # Create a diverse list of random contexts to choose from
        diverse_contexts = [
            "playground equipment", "basketball court", "soccer field", "tennis court", "running track",
            "library bookshelf", "classroom desks", "school canteen tables", "computer lab", "music room",
            "swimming pool", "beach area", "river bank", "lake shore", "pond area",
            "farm animals", "vegetable garden", "fruit orchard", "flower bed", "herb garden",
            "park bench", "picnic area", "walking trail", "cycling path", "jogging track",
            "construction site", "building materials", "tiles", "carpets", "wall paint",
            "sports equipment", "fitness center", "dance studio", "gymnasium", "sports hall",
            "community center", "neighborhood park", "public square", "town hall", "marketplace",
            "kitchen counter", "baking ingredients", "cooking utensils", "recipe measurements", "food containers",
            "storage room", "warehouse shelves", "delivery boxes", "shipping crates", "packaging materials",
            "art studio", "craft supplies", "fabric materials", "sewing patterns", "sculpture clay",
            "vehicle parking", "bus stop", "train station", "airport terminal", "harbor dock",
            "wildlife reserve", "nature trail", "forest path", "mountain hiking", "camping site",
            "museum exhibit", "art gallery", "science lab", "observatory", "planetarium",
            "zoo enclosure", "aquarium tank", "botanical garden", "greenhouse", "conservatory",
            "restaurant tables", "cafe seating", "food court", "buffet area", "dining hall",
            "shopping mall", "retail store", "supermarket aisle", "checkout counter", "store shelves",
            "school bus", "public transport", "car parking", "bicycle rack", "motorcycle bay"
        ]
        
        # Randomly select 10-15 contexts to suggest (different each time)
        import random
        suggested_contexts = random.sample(diverse_contexts, min(12, len(diverse_contexts)))
        
        # Add diversity guidance based on what's been used
        diversity_note = ""
        if used_contexts:
            contexts_list = list(used_contexts)[:5]  # Show up to 5 examples
            diversity_note = f"\n🚫 FORBIDDEN CONTEXTS (already used in this paper): {', '.join(contexts_list)}\n"
            diversity_note += "DO NOT use any of these contexts. Choose something completely different!\n\n"
            
        context += f"\nTEMPLATE HINTS for {topic}:\n" + "\n".join([f"- {h}" for h in self._topic_templates(topic)]) + "\n"
        context += diversity_note
        context += f"✨ RANDOM CONTEXT SELECTION:\n"
        context += f"- You MUST randomly choose a context from this diverse list: {', '.join(suggested_contexts)}\n"
        context += f"- Or create your own UNIQUE context (different from the examples and forbidden contexts)\n"
        context += f"- Be CREATIVE - use contexts like: {', '.join(random.sample(diverse_contexts, 5))}\n"
        context += f"\nTASK: Create a NEW {question_type} question that:"
        context += f"\n- Uses the MATH STRUCTURE from examples above, but with a RANDOM, DIFFERENT context"
        context += f"\n- Randomly picks a scenario from the diverse contexts list above (or creates a new unique one)"
        context += f"\n- Tests the same math concepts but with a COMPLETELY DIFFERENT scenario than examples"
        context += f"\n- Uses realistic numbers and measurements"
        context += f"\n- Is challenging but solvable for P6 students"
        context += f"\n- For MCQ, options must be actual numbers, not generic text"
        context += f"\n\n🚨 CRITICAL SOLVABILITY REQUIREMENT:"
        context += f"\n- MUST include ALL numbers needed to solve the problem"
        context += f"\n- If using fractions (e.g., 3/4 of...), MUST state the total (e.g., 3/4 of 60 seats)"
        context += f"\n- If using percentages, MUST state the base amount"
        context += f"\n- If asking 'how many', provide enough context/numbers to calculate"
        context += f"\n- NEVER create unsolvable questions - verify the question is complete before generating"
        context += f"\n\n⚠️ CRITICAL: The context MUST be different from the examples and forbidden contexts!"
        context += f"\n\n📝 QUESTION STRUCTURE VARIETY (CRITICAL FOR PROFESSIONAL EXAM):"
        context += f"\n  - Vary opening patterns across the paper - don't repeat the same structure"
        context += f"\n  - Start with people: '[Name] has...', '[Name] bought...', 'The teacher distributed...'"
        context += f"\n  - Start with quantities: '24 apples are...', 'A total of 48...', 'A group of...'"
        context += f"\n  - Start with actions: 'After painting...', 'When mixing...', 'During a race...'"
        context += f"\n  - Start with direct questions: 'How many...', 'What fraction...', 'Which...'"
        context += f"\n  - Start with imperatives: 'Find...', 'Calculate...', 'Determine...'"
        context += f"\n  - Occasionally 'There are/There is...' (but not too often)"
        context += f"\n  - Avoid: 'In a...', 'At the...', 'On the...' at the start"
        context += f"\n  - If a location is needed, mention it later in the question, not at the beginning"
        # Add dynamic variety suggestion if available
        variety_hint = self._get_underused_opening_suggestion()
        if variety_hint:
            context += f"\n  - {variety_hint}"
            
        return context

    def _topic_templates(self, topic: str) -> List[str]:
        """Return lightweight template hints by topic to guide structure and diversity."""
        t = topic.lower()
        common = [
            "Use realistic magnitudes and units",
            "Include at least two steps using sequencing words (then/after/remaining)",
            "VARY scenarios widely: parks, gardens, buildings, sports, art, construction, vehicles, nature, rooms, fields, paths, borders"
        ]
        if "fraction" in t:
            return common + [
                "Use mixed numbers and common denominators (LCM)",
                "Include addition/subtraction or fraction of a quantity",
                "Use diverse scenarios: distances traveled, time spent, materials used, participants/teams, areas, lengths"
            ]
        if "percentage" in t or "percent" in t:
            return common + [
                "Increase/decrease by % or % of a quantity",
                "Ensure rounding instruction (nearest whole number or 1 dp)"
            ]
        if "ratio" in t or "proportion" in t:
            return common + [
                "Part–part–whole reasoning and scaling",
                "Use a total and find a missing part via ratio"
            ]
        if "speed" in t or "distance" in t or "time" in t:
            return common + [
                "Use D=ST with unit conversions (minutes/hours, m/km)",
                "Have two segments with different speeds"
            ]
        if "area" in t or "perimeter" in t:
            return common + [
                "Composite shapes; compute missing side; consistent units",
                "Include at least one conversion (cm↔m)"
            ]
        if "volume" in t or "capacity" in t:
            return common + [
                "Use scenarios like: room dimensions, building spaces, storage boxes, garden beds, swimming pools, containers, crates, boxes",
                "Use ml/L conversions; multi-step",
                "Vary the objects/scenarios - don't repeat the same type"
            ]
        if "algebra" in t:
            return common + [
                "Translate a word equation to solve for an unknown",
                "Use one or two variables with a simple equation"
            ]
        return common
    
    def _create_generation_prompt(self, context: str, topic: str, question_type: str, difficulty: str, used_contexts: Optional[set] = None) -> str:
        """Create prompt optimized for Mistral 7B Instruct v0.3"""
        if question_type == "MCQ":
            return f"""<s>[INST] Create ONE challenging PSLE-standard MCQ for Primary 6.

TOPIC: {topic}
DIFFICULTY: {difficulty}

CONTEXT EXAMPLES:
{context}

REQUIREMENTS:
- **CRITICAL: COMPLETE & SOLVABLE QUESTIONS**: Every question MUST include ALL necessary information to solve it:
  * If using fractions (e.g., "3/4 of..."), MUST state the total (e.g., "3/4 of 60 seats")
  * If using percentages (e.g., "20% of..."), MUST state the total or base amount
  * If asking "how many", MUST provide enough numbers/context to calculate the answer
  * All quantities needed for calculation MUST be explicitly stated in the question
  * NEVER create questions that are missing key information - test that your question is solvable before outputting
- **CRITICAL: NO DIAGRAM REFERENCES**: NEVER reference diagrams, figures, number lines, graphs, charts, or images. All questions must be self-contained and solvable without visual aids.
- **CRITICAL: UNIT CONSISTENCY**: If question asks "how many" (counting), answer choices must be NUMBERS WITHOUT UNITS. If question asks for measurement (length, area, volume, etc.), answer choices can include units.
- **CRITICAL: TYPO PREVENTION**: Use "in all" NOT "in most". Avoid extraneous text like "requiring equation solving" or location mentions at the end.
- Strictly align to the TOPIC; avoid off-topic content.
- Avoid money terms unless TOPIC is Money & Rates.
- **RANDOMLY SELECT** a context from the diverse list provided in CONTEXT EXAMPLES, or create a completely NEW unique context.
- **NEVER REPEAT** contexts already used - check the forbidden contexts list in CONTEXT EXAMPLES.
- **BE CREATIVE** - use contexts like: playground equipment, basketball court, library bookshelf, farm animals, construction site, sports equipment, kitchen counter, vehicle parking, wildlife reserve, museum exhibit, zoo enclosure, restaurant tables, shopping mall, school bus, etc.
- **RANDOMIZE** - Don't pick the first context that comes to mind. Randomly choose from many diverse options!
- **PROFESSIONAL EXAM VARIETY (CRITICAL)**: Vary question openings across the entire paper. Mix different opening patterns:
  * Person/character starts: "[Name] has...", "[Name] bought...", "The teacher distributed..."
  * Quantity/number starts: "24 apples are...", "A total of 48...", "A group of..."
  * Action/time starts: "After painting...", "When mixing...", "During a race..."
  * Direct questions: "How many...", "What fraction...", "Which..."
  * Imperatives: "Find...", "Calculate...", "Determine..."
  * Occasionally: "There are/There is..." (but limit frequency)
  * Avoid repetitive patterns - don't use the same opening style consecutively
- **OPENING QUALITY**: Begin with a capital letter; avoid generic "The ..." stems. Prefer a named person, a number, an action, or a direct question.
- **NAMES**: Use varied, culturally diverse given names; avoid repeating the same name across questions.
- **LOCATION PLACEMENT**: If using a location, mention it naturally in the middle or end, not at the start. Avoid prepositional openers like "In a", "In the", "At the", "On the" at the beginning.
- Aim for multi-step reasoning using fractions/decimals/percentages/ratio/algebra where appropriate.
- Exactly 4 numeric options; only one correct; all plausible.
- Use clear, professional exam wording.
 - First compute the full solution silently. Then output JSON only.
 - Generate distractors using realistic mistakes (wrong denominator LCM, early rounding, swapped ratio parts, unit conversion error).

TWO-STEP MCQ POLICY:
- Compute the correct numeric answer first (with unit if appropriate).
- Then create three distractors by applying common mistakes (wrong denominator/LCM, early rounding, +/- 10%, swapped ratio, unit conversion error).
- Ensure options are purely numeric (with unit/currency if needed) and unique.
- Make sure correct_answer_text exactly matches options[correct_answer_index].

RESPOND WITH ONLY THIS JSON (no extra text):
{{
    "question": "Your word problem here",
    "options": ["A) 12.5", "B) 15.75", "C) 18.25", "D) 21.5"],
    "correct_answer_index": 1,
    "correct_answer_text": "B) 15.75",
    "question_type": "MCQ",
    "marks": 1
}}[/INST]"""
        else:  # Open-ended
            diversity_warning = ""
            if used_contexts:
                contexts_list = list(used_contexts)[:3]
                diversity_warning = f"\nIMPORTANT: Already used contexts in this paper: {', '.join(contexts_list)}. DO NOT repeat these. "
            
            return f"""<s>[INST] Create ONE challenging PSLE-standard open-ended question for Primary 6.

TOPIC: {topic}
DIFFICULTY: {difficulty}

CONTEXT EXAMPLES:
{context}

REQUIREMENTS:
- **CRITICAL: COMPLETE & SOLVABLE QUESTIONS**: Every question MUST include ALL necessary information to solve it:
  * If using fractions (e.g., "3/4 of..."), MUST state the total (e.g., "3/4 of 60 seats")
  * If using percentages (e.g., "20% of..."), MUST state the total or base amount
  * If asking "how many", MUST provide enough numbers/context to calculate the answer
  * All quantities needed for calculation MUST be explicitly stated in the question
  * NEVER create questions that are missing key information - test that your question is solvable before outputting
- **CRITICAL: NO DIAGRAM REFERENCES**: NEVER reference diagrams, figures, number lines, graphs, charts, or images. All questions must be self-contained and solvable without visual aids.
- **CRITICAL: CLEAR PHRASING**: When using "X more" or "X times more", clearly state what it's compared to (e.g., "5/4 times as many as the original 120 cans" NOT just "5/4 more cans").
- **CRITICAL: CONSISTENT CONSTRAINTS**: If using ratios AND "X more" constraints, ensure they are mathematically consistent (e.g., ratio 3:2 with total 75 means 45:30, so 15 more, not 18 more).
- **CRITICAL: LOGIC CLARITY**: If mixing categories (e.g., trees and flowers), clearly explain their relationship (e.g., "plant species" includes both).
- Strictly align to the TOPIC; avoid off-topic content.
- Avoid money terms unless TOPIC is Money & Rates.
- **RANDOMLY SELECT** a context from the diverse list provided in CONTEXT EXAMPLES, or create a completely NEW unique context.
{diversity_warning}
- **NEVER REPEAT** contexts already used - check the forbidden contexts list in CONTEXT EXAMPLES.
- **BE CREATIVE** - Randomly pick from diverse contexts like: playground equipment, basketball court, library bookshelf, farm animals, construction site, sports equipment, kitchen counter, vehicle parking, wildlife reserve, museum exhibit, zoo enclosure, restaurant tables, shopping mall, school bus, etc.
- **RANDOMIZE** - Don't pick the first context that comes to mind. Randomly choose from many diverse options!
- **PROFESSIONAL EXAM VARIETY (CRITICAL)**: Vary question openings across the entire paper. Mix different opening patterns:
  * Person/character starts: "[Name] has...", "[Name] bought...", "The teacher distributed..."
  * Quantity/number starts: "24 apples are...", "A total of 48...", "A group of..."
  * Action/time starts: "After painting...", "When mixing...", "During a race..."
  * Direct questions: "How many...", "What fraction...", "Which..."
  * Imperatives: "Find...", "Calculate...", "Determine..."
  * Occasionally: "There are/There is..." (but limit frequency)
  * Avoid repetitive patterns - don't use the same opening style consecutively
- **OPENING QUALITY**: Begin with a capital letter; avoid generic "The ..." stems.
- **NAMES**: Use varied, culturally diverse given names; avoid repeating the same name across questions.
- **LOCATION PLACEMENT**: If using a location, mention it naturally in the middle or end, not at the start.
- Multi-step problem; require working; use clear exam phrasing.
- Use realistic measurements and quantities.
 - First compute the full solution silently. Then output JSON only.
 - For Fractions: include LCM/mixed numbers or fraction of a quantity.

STRICT FORMAT FOR OPEN-ENDED:
- options must be an empty array []
- correct_answer_index must be -1
- correct_answer_text must contain a single final numeric answer with appropriate unit and brief working

RESPOND WITH ONLY THIS JSON (no extra text):
{{
    "question": "Your detailed word problem here",
    "options": [],
    "correct_answer_index": -1,
    "correct_answer_text": "Detailed answer with working steps",
    "question_type": "Open-ended",
    "marks": 4
}}[/INST]"""
    
    def _parse_generated_question(self, response: str, topic: str, question_type: str) -> Optional[Question]:
        """Parse the generated question from LM Studio response"""
        import re
        import json
        
        try:
            # Clean the response and extract JSON
            response = response.strip()
            logger.debug(f"Raw LM Studio response: {response}")
            
            # Try multiple extraction strategies
            json_str = self._extract_json_from_response(response)
            
            if not json_str:
                logger.warning("No JSON found in LM Studio response")
                return None
            
            # Try multiple parsing strategies
            parsing_strategies = [
                # Strategy 1: Direct parse
                json_str,
                # Strategy 2: Fix quotes
                json_str.replace("'", '"'),
                # Strategy 3: Clean whitespace and fix quotes
                json_str.replace('\n', ' ').replace('\r', ' ').replace("'", '"'),
                # Strategy 4: Remove backslashes and fix quotes
                json_str.replace('\\', '').replace("'", '"'),
                # Strategy 5: More aggressive cleaning
                json_str.replace('\n', ' ').replace('\r', ' ').replace('\\', '').replace("'", '"').replace('  ', ' '),
                # Strategy 6: Handle LaTeX formatting
                json_str.replace('\\[', '').replace('\\]', '').replace('\\{', '{').replace('\\}', '}'),
                # Strategy 7: Handle boxed responses
                json_str.replace('\\boxed{', '').replace('}', ''),
                # Strategy 8: More aggressive cleaning
                json_str.replace('\\[', '').replace('\\]', '').replace('\\{', '{').replace('\\}', '}').replace('\\boxed{', '').replace('\\', '').replace("'", '"'),
                # Strategy 9: Remove any remaining LaTeX
                json_str.replace('\\frac{', '').replace('\\', '').replace('{', '').replace('}', '').replace("'", '"'),
                # Strategy 10: Fix common JSON issues
                json_str.replace('True', 'true').replace('False', 'false').replace('None', 'null'),
                # Strategy 11: Handle malformed quotes
                json_str.replace('"', '"').replace('"', '"').replace(''', "'").replace(''', "'"),
                # Strategy 12: Fix trailing commas
                re.sub(r',\s*}', '}', json_str),
                re.sub(r',\s*]', ']', json_str)
            ]
            
            data = None
            for i, strategy in enumerate(parsing_strategies):
                try:
                    data = json.loads(strategy)
                    logger.debug(f"Successfully parsed JSON with strategy {i+1}")
                    break
                except json.JSONDecodeError as e:
                    logger.debug(f"Strategy {i+1} failed: {e}")
                    continue
            
            if data is None:
                logger.warning("All JSON parsing strategies failed, trying partial extraction")
                return self._extract_partial_question(response, topic, question_type)
            
            # Validate required fields
            required_fields = ['question', 'question_type', 'marks']
            for field in required_fields:
                if field not in data:
                    logger.warning(f"Missing required field: {field}")
                    return None
            
            # Validate question type
            if data['question_type'] not in ['MCQ', 'Open-ended']:
                logger.warning(f"Invalid question_type: {data['question_type']}")
                return None
            
            # Validate based on question type (with auto-repair to avoid dropping usable generations)
            if data['question_type'] == 'MCQ':
                options = data.get('options', [])
                # Handle common bad formats: single string with commas, or string instead of list
                if isinstance(options, str):
                    # e.g., "A) 10, B) 12, C) 15, D) 18"
                    parts = [p.strip() for p in re.split(r",\s*(?=[A-Da-d]\)|[A-Da-d][\.:]|\d+\)|[^,]+)", options) if p.strip()]
                    options = parts if len(parts) >= 4 else [o.strip() for o in options.split(',') if o.strip()]
                if isinstance(options, list) and len(options) == 1 and isinstance(options[0], str) and ',' in options[0]:
                    options = [o.strip() for o in options[0].split(',') if o.strip()]
                # Ensure at least 4 entries by splitting; if still <4, bail
                if not isinstance(options, list) or len(options) < 4:
                    logger.warning(f"Invalid options for MCQ: {options}")
                    return None
                # Trim to exactly 4
                if len(options) > 4:
                    options = options[:4]
                data['options'] = options
                # Correct index: fix if out of range by matching text
                idx = data.get('correct_answer_index', -1)
                if not isinstance(idx, int) or not (0 <= idx <= 3):
                    # Try to derive from correct_answer_text
                    cat = (data.get('correct_answer_text', '') or '').strip()
                    def normalize(ans: str) -> str:
                        return re.sub(r"^[\s]*[A-Da-d][)\.:\-]?\s*", "", ans or "").strip().lower()
                    norm_cat = normalize(cat)
                    candidates = [normalize(o) for o in options]
                    if norm_cat and norm_cat in candidates:
                        data['correct_answer_index'] = candidates.index(norm_cat)
                    else:
                        # Default to first option; downstream repair will re-set if possible
                        data['correct_answer_index'] = 0
            else:  # Open-ended
                if data.get('options', []) != []:
                    logger.warning(f"Open-ended questions should have empty options: {data.get('options', [])}")
                    return None
                if data.get('correct_answer_index', -1) != -1:
                    logger.warning(f"Open-ended questions should have correct_answer_index = -1: {data.get('correct_answer_index', -1)}")
                    return None
            
            # Create Question object
            question_id = f"generated_{topic}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            return Question(
                id=question_id,
                question=data['question'],
                options=data.get('options', []),
                correct_answer_index=data.get('correct_answer_index', -1),
                correct_answer_text=data.get('correct_answer_text', ''),
                topic=topic,
                source="Generated",
                question_type=data['question_type'],
                marks=data['marks']
            )
            
        except Exception as e:
            logger.warning(f"Failed to parse generated question: {e}")
            return None
    
    def _extract_json_from_response(self, response: str) -> Optional[str]:
        """Extract JSON from Mistral response using multiple strategies"""
        import re
        
        # Clean the response first
        response = response.strip()
        
        # Remove Mistral-specific formatting
        response = re.sub(r'^<s>\[INST\].*?\[/INST\]', '', response, flags=re.DOTALL)
        response = re.sub(r'^\[INST\].*?\[/INST\]', '', response, flags=re.DOTALL)
        response = response.strip()
        
        # Strategy 1: Look for complete JSON object
        json_patterns = [
            # Standard JSON object
            r'\{[^{}]*"question"[^{}]*"marks"[^{}]*\}',
            # JSON with nested objects
            r'\{[^{}]*"question"[^{}]*\}',
            # JSON in code blocks
            r'```json\s*(\{.*?\})\s*```',
            r'```\s*(\{.*?\})\s*```',
            # JSON after common phrases
            r'(?:json|JSON|answer|response):\s*(\{.*?\})',
            r'(?:here|below|following):\s*(\{.*?\})',
            # JSON in boxed LaTeX
            r'\\boxed\{([^}]+)\}',
            # JSON after "json format is:"
            r'json format is:\s*([^}]+)',
            # JSON after "final json format is:"
            r'final json format is:\s*([^}]+)',
            # Mistral-specific patterns
            r'(?:Here|Here\'s|This is|Generated):\s*(\{.*?\})',
            r'(?:Question|Answer):\s*(\{.*?\})',
        ]
        
        for pattern in json_patterns:
            matches = re.findall(pattern, response, re.DOTALL | re.IGNORECASE)
            for match in matches:
                # Clean the match
                cleaned = match.strip()
                
                # Remove LaTeX formatting
                cleaned = cleaned.replace('\\', '').replace('{', '').replace('}', '')
                
                # Try to find the actual JSON
                json_start = cleaned.find('{')
                json_end = cleaned.rfind('}') + 1
                
                if json_start != -1 and json_end > json_start:
                    json_str = cleaned[json_start:json_end]
                    logger.debug(f"Found JSON with pattern: {json_str}")
                    return json_str
        
        # Strategy 2: Look for JSON-like structure and reconstruct
        lines = response.split('\n')
        json_lines = []
        in_json = False
        
        for line in lines:
            line = line.strip()
            if line.startswith('{') or in_json:
                in_json = True
                json_lines.append(line)
                if line.endswith('}') and line.count('{') <= line.count('}'):
                    break
        
        if json_lines:
            reconstructed = ' '.join(json_lines)
            logger.debug(f"Reconstructed JSON: {reconstructed}")
            return reconstructed
        
        # Strategy 3: Find any text that looks like JSON
        json_match = re.search(r'\{[^{}]*"question"[^{}]*\}', response, re.DOTALL)
        if json_match:
            logger.debug(f"Found JSON with fallback: {json_match.group()}")
            return json_match.group()
        
        return None
    
    def _extract_partial_question(self, response: str, topic: str, question_type: str) -> Optional[Question]:
        """Extract question information even if JSON parsing fails"""
        import re
        import random
        
        try:
            # Extract question text
            question_patterns = [
                r'"question":\s*"([^"]+)"',
                r'question[:\s]+"([^"]+)"',
                r'Question[:\s]+"([^"]+)"',
                r'Create[^:]*:\s*"([^"]+)"',
                r'Here[^:]*:\s*"([^"]+)"'
            ]
            
            question_text = None
            for pattern in question_patterns:
                match = re.search(pattern, response, re.IGNORECASE)
                if match:
                    question_text = match.group(1).strip()
                    break
            
            if not question_text:
                # Try to find any text that looks like a question
                lines = response.split('\n')
                for line in lines:
                    line = line.strip()
                    if ('?' in line or 'what' in line.lower() or 'how' in line.lower() or 
                        'find' in line.lower() or 'calculate' in line.lower()) and len(line) > 20:
                        question_text = line
                        break
            
            if not question_text:
                logger.warning("Could not extract question text from response")
                return None
            
            # Extract options for MCQ
            options = []
            if question_type == "MCQ":
                option_patterns = [
                    r'"options":\s*\[(.*?)\]',
                    r'options[:\s]*\[(.*?)\]',
                    r'[A-D]\)\s*[^,\n]+'
                ]
                
                for pattern in option_patterns:
                    matches = re.findall(pattern, response, re.DOTALL | re.IGNORECASE)
                    if matches:
                        if pattern == option_patterns[2]:  # A) B) C) D) format
                            options = matches
                        else:
                            # Parse JSON array
                            options_text = matches[0]
                            option_matches = re.findall(r'"([^"]+)"', options_text)
                            options = [f"{chr(65+i)}) {opt}" for i, opt in enumerate(option_matches)]
                        break
                
                if not options:
                    # Generate default options
                    options = ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"]
            
            # Create question ID
            question_id = f"generated_{topic}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Determine marks
            marks = 1 if question_type == "MCQ" else random.randint(2, 4)
            
            return Question(
                id=question_id,
                question=question_text,
                options=options if question_type == "MCQ" else [],
                correct_answer_index=0 if question_type == "MCQ" else -1,
                correct_answer_text=options[0] if question_type == "MCQ" else "Show your working and provide your answer",
                topic=topic,
                source="Generated",
                question_type=question_type,
                marks=marks
            )
            
        except Exception as e:
            logger.warning(f"Partial extraction failed: {e}")
            return None
    
    def _generate_enhanced_variation(self, sample_questions: List[Dict], topic: str, question_type: str) -> Optional[Question]:
        """Generate an enhanced variation of an existing question with quality improvements"""
        if not sample_questions:
            return None
        
        # Select the most complex question to vary
        base_question = max(sample_questions, key=lambda q: len(q.get('question', '')))
        
        # Create variations by changing numbers, names, and contexts
        question_text = base_question['question']
        options = base_question['options'].copy()
        correct_index = base_question['correct_answer_index']
        correct_text = base_question['correct_answer_text']
        
        # Enhance question complexity
        question_text = self._enhance_question_complexity(question_text, topic)
        
        # Enhanced variation system with more diverse changes
        variations = {
            # Names - more diverse
            'John': ['Sarah', 'David', 'Emma', 'Michael', 'Lisa', 'James', 'Anna', 'Tom', 'Grace', 'Ryan', 'Zoe', 'Alex', 'Sam', 'Maya', 'Kai'],
            'Mary': ['Sarah', 'David', 'Emma', 'Michael', 'Lisa', 'James', 'Anna', 'Tom', 'Grace', 'Ryan', 'Zoe', 'Alex', 'Sam', 'Maya', 'Kai'],
            'Peter': ['Sarah', 'David', 'Emma', 'Michael', 'Lisa', 'James', 'Anna', 'Tom', 'Grace', 'Ryan', 'Zoe', 'Alex', 'Sam', 'Maya', 'Kai'],
            'Jane': ['Sarah', 'David', 'Emma', 'Michael', 'Lisa', 'James', 'Anna', 'Tom', 'Grace', 'Ryan', 'Zoe', 'Alex', 'Sam', 'Maya', 'Kai'],
            'Mr. Lee': ['Mr. Tan', 'Mrs. Wong', 'Mr. Lim', 'Mrs. Goh', 'Mr. Chan', 'Mrs. Lim', 'Mr. Ng', 'Mrs. Tay', 'Dr. Kim', 'Ms. Chen', 'Prof. Wang', 'Mr. Kumar'],
            'Mrs. Lee': ['Mrs. Tan', 'Mr. Wong', 'Mrs. Lim', 'Mr. Goh', 'Mrs. Chan', 'Mr. Lim', 'Mrs. Ng', 'Mr. Tay', 'Dr. Kim', 'Ms. Chen', 'Prof. Wang', 'Mrs. Kumar'],
            
            # Places - more creative
            'school': ['library', 'park', 'mall', 'office', 'hospital', 'restaurant', 'gym', 'museum', 'zoo', 'aquarium', 'theater', 'stadium', 'cafe', 'bookstore', 'playground'],
            'classroom': ['library', 'park', 'mall', 'office', 'hospital', 'restaurant', 'gym', 'museum', 'zoo', 'aquarium', 'theater', 'stadium', 'cafe', 'bookstore', 'playground'],
            'hall': ['room', 'area', 'space', 'section', 'zone', 'place', 'venue', 'lobby', 'foyer', 'chamber', 'gallery', 'studio'],
            'shop': ['store', 'market', 'boutique', 'outlet', 'supermarket', 'department store', 'kiosk', 'stall', 'booth', 'stand', 'counter'],
            
            # People - more diverse
            'students': ['children', 'people', 'visitors', 'customers', 'patients', 'guests', 'attendees', 'participants', 'audience', 'crowd', 'group', 'team', 'class', 'pupils'],
            'teacher': ['librarian', 'manager', 'doctor', 'waiter', 'guide', 'supervisor', 'instructor', 'coach', 'tutor', 'mentor', 'trainer', 'facilitator', 'educator'],
            'pupils': ['children', 'students', 'kids', 'youngsters', 'learners', 'participants', 'trainees', 'apprentices', 'scholars', 'cadets'],
            
            # Objects - more creative
            'books': ['toys', 'cookies', 'apples', 'balls', 'pencils', 'candies', 'flowers', 'coins', 'stamps', 'stickers', 'badges', 'tickets', 'cards', 'puzzles'],
            'pencils': ['books', 'toys', 'cookies', 'apples', 'balls', 'candies', 'flowers', 'coins', 'stamps', 'stickers', 'badges', 'tickets', 'cards', 'puzzles'],
            'cookies': ['books', 'toys', 'pencils', 'apples', 'balls', 'candies', 'flowers', 'coins', 'stamps', 'stickers', 'badges', 'tickets', 'cards', 'puzzles'],
            'apples': ['books', 'toys', 'pencils', 'cookies', 'balls', 'candies', 'flowers', 'coins', 'stamps', 'stickers', 'badges', 'tickets', 'cards', 'puzzles'],
            
            # Time references - more diverse
            'minutes': ['seconds', 'hours', 'days', 'weeks', 'months', 'years', 'decades', 'centuries'],
            'hours': ['minutes', 'seconds', 'days', 'weeks', 'months', 'years', 'decades', 'centuries'],
            'days': ['hours', 'minutes', 'weeks', 'months', 'years', 'decades', 'centuries'],
            'weeks': ['days', 'hours', 'months', 'years', 'decades', 'centuries'],
            
            # Money - more diverse
            'dollars': ['cents', 'euros', 'pounds', 'yen', 'ringgit', 'rupees', 'pesos', 'francs', 'marks', 'lira'],
            'cents': ['dollars', 'euros', 'pounds', 'yen', 'ringgit', 'rupees', 'pesos', 'francs', 'marks', 'lira'],
            'money': ['cash', 'coins', 'bills', 'currency', 'funds', 'change', 'payment', 'fee', 'cost', 'price'],
            
            # Additional creative variations
            'bought': ['purchased', 'acquired', 'obtained', 'got', 'received', 'collected', 'gathered'],
            'sold': ['sold', 'disposed', 'gave away', 'donated', 'exchanged', 'traded'],
            'has': ['owns', 'possesses', 'holds', 'contains', 'includes', 'carries'],
            'gave': ['donated', 'handed', 'passed', 'offered', 'presented', 'delivered'],
            'received': ['got', 'obtained', 'acquired', 'accepted', 'took', 'collected'],
            'spent': ['used', 'expended', 'consumed', 'wasted', 'invested', 'allocated'],
            'saved': ['kept', 'stored', 'preserved', 'conserved', 'reserved', 'set aside'],
            'earned': ['gained', 'made', 'received', 'collected', 'acquired', 'obtained']
        }
        
        # Apply variations - use word boundaries to avoid replacing inside other words
        import re
        for old, new_list in variations.items():
            # Use word boundary regex to only replace whole words
            pattern = r'\b' + re.escape(old) + r'\b'
            if re.search(pattern, question_text, flags=re.IGNORECASE):
                new = random.choice(new_list)
                question_text = re.sub(pattern, new, question_text, flags=re.IGNORECASE)
                # Also update options if they contain the old word
                for i, option in enumerate(options):
                    if re.search(pattern, str(option), flags=re.IGNORECASE):
                        options[i] = re.sub(pattern, new, str(option), flags=re.IGNORECASE)
                        if i == correct_index:
                            correct_text = options[i]
        
        # Change numbers (more sophisticated approach)
        import re
        numbers = re.findall(r'\b\d+\b', question_text)
        if numbers:
            for num in numbers:
                if int(num) > 1:  # Don't change 1 or 0
                    # Create more realistic variations
                    original = int(num)
                    if original <= 10:
                        # For small numbers, use more creative variations
                        variations = [original + random.randint(-2, 3), original * 2, original * 3, original + 5, original - 1]
                        new_num = str(random.choice([v for v in variations if v > 0]))
                    elif original <= 100:
                        # For medium numbers, use percentage-based variations
                        variation_percent = random.choice([0.5, 0.75, 1.25, 1.5, 2.0])
                        new_num = str(int(original * variation_percent))
                    else:
                        # For large numbers, use more conservative variations
                        new_num = str(original + random.randint(-50, 100))
                    
                    if int(new_num) > 0:  # Ensure positive
                        question_text = question_text.replace(num, new_num, 1)
                        # Update options too
                        for i, option in enumerate(options):
                            if num in option:
                                options[i] = option.replace(num, new_num)
                                if i == correct_index:
                                    correct_text = options[i]
                        break  # Only change one number to avoid confusion
        
        # Add more creative contextual variations
        context_variations = [
            # Time variations
            ('in the morning', 'in the afternoon'),
            ('in the afternoon', 'in the evening'),
            ('in the evening', 'in the morning'),
            ('last week', 'this week'),
            ('this week', 'next week'),
            ('yesterday', 'today'),
            ('today', 'tomorrow'),
            ('last month', 'this month'),
            ('this month', 'next month'),
            ('last year', 'this year'),
            ('this year', 'next year'),
            
            # Location variations
            ('at home', 'at school'),
            ('at school', 'at the park'),
            ('at the park', 'at home'),
            ('in the library', 'in the classroom'),
            ('in the classroom', 'in the playground'),
            ('in the playground', 'in the library'),
            ('at the mall', 'at the market'),
            ('at the market', 'at the store'),
            ('at the store', 'at the mall'),
            
            # Activity variations
            ('studying', 'playing'),
            ('playing', 'working'),
            ('working', 'studying'),
            ('reading', 'writing'),
            ('writing', 'drawing'),
            ('drawing', 'reading'),
            ('cooking', 'baking'),
            ('baking', 'preparing'),
            ('preparing', 'cooking'),
            
            # Quantity variations
            ('some', 'many'),
            ('many', 'few'),
            ('few', 'several'),
            ('several', 'some'),
            ('all', 'most'),
            ('most', 'half'),
            ('half', 'all'),
            
            # Action variations
            ('bought', 'purchased'),
            ('purchased', 'acquired'),
            ('acquired', 'bought'),
            ('sold', 'disposed'),
            ('disposed', 'gave away'),
            ('gave away', 'sold'),
            ('received', 'got'),
            ('got', 'obtained'),
            ('obtained', 'received')
        ]
        
        for old_context, new_context in context_variations:
            if old_context in question_text:
                question_text = question_text.replace(old_context, new_context)
                break
        
        # Create new question ID
        question_id = f"variation_{topic}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Determine marks based on question type
        marks = 1 if question_type == "MCQ" else random.randint(2, 4)
        
        # For open-ended questions, remove options and set correct index to -1
        if question_type == "Open-ended":
            options = []
            correct_index = -1
            correct_text = "Show your working and provide your answer here"
        
        return Question(
            id=question_id,
            question=question_text,
            options=options,
            correct_answer_index=correct_index,
            correct_answer_text=correct_text,
            topic=topic,
            source="Variation",
            question_type=question_type,
            marks=marks
        )
    
    def _enhance_question_complexity(self, question_text: str, topic: str) -> str:
        """Enhance question complexity for P6 level"""
        # Add complexity indicators based on topic
        complexity_additions = {
            'Fractions': [
                'in a real-world context',
                'requiring multiple steps',
                'with different denominators',
                'involving mixed numbers'
            ],
            'Decimals': [
                'to 2 decimal places',
                'in a practical situation',
                'requiring careful calculation',
                'with money or measurements'
            ],
            'Percentage': [
                'in a real-life scenario',
                'requiring percentage calculations',
                'with multiple percentage changes',
                'involving profit and loss'
            ],
            'Algebra': [
                'using algebraic expressions',
                'requiring equation solving',
                'with unknown variables',
                'in a word problem context'
            ],
            'Ratio & Proportion': [
                'in a practical context',
                'requiring ratio calculations',
                'with multiple ratios',
                'involving scaling or comparison'
            ]
        }
        
        # Add complexity based on topic
        if topic in complexity_additions:
            addition = random.choice(complexity_additions[topic])
            if addition not in question_text.lower():
                question_text += f" {addition}."
        
        # Ensure question ends with proper punctuation
        if not question_text.endswith(('?', '.', '!')):
            question_text += "?"
        
        return question_text

class QuestionValidator:
    """Enhanced question validator with quality control"""
    
    def __init__(self, lm_client: Optional[LMStudioClient] = None):
        self.enable_manual_review = True  # Enable strict manual review for quality
        self.lm_client = lm_client  # LM Studio client for AI-powered review
        self.min_question_length = 35  # Slightly reduced to avoid rejecting concise valid stems
        self.max_question_length = 1000  # Maximum question length (allow richer scenarios)
        # When False, relax option/answer enforcement to focus on question quality
        # Enforce strict answer/option checks so unsound MCQs are rejected early
        self.strict_answer_checks = True
        self.required_keywords = ['what', 'how', 'find', 'calculate', 'determine', 'solve', 'show', 'work', 'answer', 'find', 'total', 'area', 'perimeter', 'volume', 'cost', 'price', 'time', 'speed', 'distance']
        self.simple_patterns = [
            r'add\s+\d+\s+and\s+\d+',
            r'subtract\s+\d+\s+from\s+\d+',
            r'multiply\s+\d+\s+by\s+\d+',
            r'divide\s+\d+\s+by\s+\d+',
            r'what\s+is\s+\d+\s*\+\s*\d+',
            r'what\s+is\s+\d+\s*-\s*\d+',
            r'what\s+is\s+\d+\s*\*\s*\d+',
            r'what\s+is\s+\d+\s*/\s*\d+'
        ]
    
    def validate_question(self, question: Question) -> bool:
        """Comprehensive question validation"""
        # Basic validation
        if not question.question or len(question.question.strip()) < self.min_question_length:
            logger.warning(f"Question too short: {len(question.question) if question.question else 0} chars")
            return False
        
        if len(question.question) > self.max_question_length:
            logger.warning(f"Question too long: {len(question.question)} chars")
            return False
        
        # Stem-first mode: ignore options/answers unless strict checks are enabled
        if self.strict_answer_checks:
            if question.question_type == "MCQ":
                if not self._validate_mcq_options(question):
                    return False
            elif question.question_type == "Open-ended":
                if question.options and len(question.options) > 0:
                    logger.warning(f"Open-ended questions should have empty options: {question.options}")
                    # Don't fail validation, just warn
        
        # Check question quality
        if not self._validate_question_quality(question):
            return False
        
        # Check for missing content
        if not self._validate_question_content(question):
            return False
        
        # Check for common issues found in PDF validation
        if not self._validate_question_clarity(question):
            return False
        
        return True
    
    def _validate_mcq_options(self, question: Question) -> bool:
        """Validate MCQ options are real answers, not generic placeholders"""
        if not question.options or len(question.options) != 4:
            logger.warning(f"Invalid options count: {len(question.options) if question.options else 0}")
            return False
        
        # Check for generic options
        generic_patterns = [
            r'option\s*\d+',
            r'choice\s*\d+',
            r'answer\s*\d+'
        ]
        
        # Ensure distinct options and numeric plausibility
        import re as _re
        seen = set()
        numeric_like_count = 0
        for i, option in enumerate(question.options):
            option_clean = option.strip().lower()
            
            # Check if option is generic
            for pattern in generic_patterns:
                if re.search(pattern, option_clean):
                    logger.warning(f"Generic option {i+1}: {option}")
                    return False
            
            # Check for unrendered LaTeX
            if '\\(' in option or '\\)' in option or '\\frac' in option:
                logger.warning(f"Unrendered LaTeX in option {i+1}: {option}")
                return False

            # Distinctness check
            if option_clean in seen:
                logger.warning(f"Duplicate option detected: {option}")
                return False
            seen.add(option_clean)

            # Numeric plausibility (accept integers/decimals with optional units or currency)
            if _re.search(r"^\s*[A-D]\)\s*", option, flags=_re.IGNORECASE):
                # Strip label and re-check
                stripped = _re.sub(r"^\s*[A-D]\)\s*", "", option)
            else:
                stripped = option
            unit_pattern = r"(?:\s*(?:cm|mm|m|km|kg|g|mg|l|ml|litre|liter|liters|litres|°c|deg|s|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours|m2|m\^2|m3|m\^3|cm2|cm\^2|cm3|cm\^3))?"
            currency_pattern = r"\$?"
            # Accept decimals or simple fractions with optional unit/currency
            numeric_with_units = rf"^{currency_pattern}\s*-?(?:\d+(?:[.,]\d+)?|\d+\s*/\s*\d+){unit_pattern}\s*$"
            is_numeric_like = bool(_re.search(numeric_with_units, stripped.strip(), flags=_re.IGNORECASE))
            if is_numeric_like:
                numeric_like_count += 1
            # Only enforce minimal length if not numeric-like
            if not is_numeric_like and len(option.strip()) < 3:
                logger.warning(f"Option {i+1} too short: {option}")
                return False
        # Require numeric-like options only in strict mode
        if self.strict_answer_checks and numeric_like_count < 2:
            logger.warning("Options not sufficiently numeric/plausible")
            return False

        # Exactly one correct option mapping (strict mode only)
        if self.strict_answer_checks:
            idx = question.correct_answer_index
            if not isinstance(idx, int) or not (0 <= idx < 4):
                logger.warning(f"Invalid correct_answer_index: {idx}")
                return False
            correct_text = (question.correct_answer_text or "").strip().lower()
            candidate = question.options[idx].strip().lower()
            if correct_text:
                # Normalize: remove leading labels and extra spaces/punctuation
                def normalize(ans: str) -> str:
                    ans = _re.sub(r"^[\s]*[A-D][)\.:-]?\s*", "", ans)
                    ans = ans.replace("$ ", "$")
                    return ans.strip()
                if normalize(correct_text) != normalize(candidate):
                    logger.warning("correct_answer_text does not match option at correct_answer_index")
                    return False
        
        # Additional validation: Unit consistency (check even in non-strict mode)
        # This is important for catching issues like "how many parts" with units in options
        question_text = question.question.lower()
        if _re.search(r'how many\s+\w*\s*(?:equal\s+)?(?:parts|pieces|items|objects|things|can|are)', question_text):
            # Question asks for count - check if options inappropriately have units
            unit_pattern = r'\b(m|cm|mm|km|m2|m\^2|cm2|cm\^2|m3|m\^3|kg|g|mg|l|ml|litre|liter)\b'
            units_in_options = sum(1 for opt in question.options 
                                  if _re.search(unit_pattern, _re.sub(r'^[A-Da-d0-9][\)\.:\-\s]+', '', str(opt).strip()), _re.IGNORECASE))
            if units_in_options >= 3:
                logger.warning(f"REJECTED: Question asks for count but {units_in_options}/4 options have units")
                return False
        
        return True
    
    def _validate_question_quality(self, question: Question) -> bool:
        """Validate question is challenging enough for P6 level"""
        question_text = question.question.lower()
        
        # Check for required question words
        has_question_word = any(keyword in question_text for keyword in self.required_keywords)
        if not has_question_word:
            logger.warning("Question lacks proper question words")
            return False
        
        # Check if question is too simple
        for pattern in self.simple_patterns:
            if re.search(pattern, question_text):
                logger.warning(f"Question too simple: {question.question[:100]}...")
                return False
        
        # Composite mathematical complexity scoring
        complexity_score = self._compute_complexity_score(question_text)
        if complexity_score < 2:  # Slightly relaxed to reduce false negatives
            logger.warning("Question lacks mathematical complexity")
            return False
        
        return True

    def _compute_complexity_score(self, question_text: str) -> int:
        """Compute a lightweight complexity score from multiple signals.
        Returns an integer score; higher is more complex.
        """
        score = 0
        import re

        # 1) Math topic indicators
        math_indicators = [
            'fraction', 'decimal', 'percentage', 'ratio', 'proportion',
            'algebra', 'equation', 'variable', 'unknown',
            'area', 'perimeter', 'volume', 'surface area', 'capacity',
            'angle', 'triangle', 'rectangle', 'circle', 'square', 'polygon',
            'time', 'hour', 'minute', 'second', 'speed', 'distance', 'rate',
            'average', 'mean', 'median', 'mode', 'graph', 'chart', 'table',
            'measurement', 'length', 'width', 'height', 'mass', 'weight', 'temperature',
            'total', 'sum', 'difference', 'product', 'quotient',
            'round', 'estimate', 'approximate'
        ]
        if any(ind in question_text for ind in math_indicators):
            score += 1

        # 2) Presence of at least two numbers (signals data richness)
        numbers = re.findall(r"\b\d+(?:[.,]\d+)?\b", question_text)
        if len(numbers) >= 2:
            score += 1

        # 3) Operations/equation cues (words or symbols)
        if any(sym in question_text for sym in ['+', '-', '×', 'x', '*', '÷', '/', '%']):
            score += 1
        else:
            op_words = ['sum of', 'difference between', 'product of', 'quotient of', 'twice', 'thrice', 'per']
            if any(w in question_text for w in op_words):
                score += 1

        # 4) Units present (measurement realism)
        units = [
            'cm', 'm', 'km', 'mm', 'kg', 'g', 'mg', 'l', 'ml', '°c', 'deg',
            'minutes', 'minute', 'hours', 'hour', 'seconds', 'second'
        ]
        if any(re.search(rf"\b{u}\b", question_text) for u in units):
            score += 1

        # 5) Multi-step / sequencing cues
        multi_step = ['then', 'after', 'next', 'remaining', 'altogether', 'in total', 'finally', 'first']
        if any(w in question_text for w in multi_step):
            score += 1

        return score
    
    def _validate_question_content(self, question: Question) -> bool:
        """Validate question has complete content and is solvable"""
        import re
        # Check for missing question text
        if not question.question or question.question.strip() == "":
            logger.warning("Question text is empty")
            return False
        
        # Check for incomplete questions
        incomplete_indicators = [
            'solve the problem',
            'determine the correct answer',
            'find the answer',
            'calculate the result'
        ]
        
        question_text = question.question.lower()
        for indicator in incomplete_indicators:
            if indicator in question_text and len(question.question) < 100:
                logger.warning(f"Incomplete question: {question.question}")
                return False
        
        # Check for solvability: questions with fractions/ratios/percentages need totals
        # Pattern: "X/Y of" or "X% of" without a total number specified
        fraction_pattern = r'(\d+/\d+|[\d.]+%)\s+of\s+(?:the\s+)?'
        if re.search(fraction_pattern, question_text):
            # Check if there's a total number mentioned AFTER the fraction/percentage
            # Pattern like "3/4 of the 60 seats" or "20% of 100 items"
            numbers = re.findall(r'\b\d+\b', question.question)
            # Need at least 2 numbers (one for fraction/%, one for total) OR the total must be mentioned explicitly
            has_explicit_total = re.search(r'(\d+/\d+|[\d.]+%)\s+of\s+(?:the\s+)?\d+', question_text)
            
            if not has_explicit_total and len(numbers) < 2:
                # Check for total indicators that might imply a number elsewhere
                has_total_indicator = re.search(r'\b(total|altogether|in all|sum|all|whole)\s+(?:of\s+)?\d+', question_text)
                if not has_total_indicator:
                    logger.warning(f"REJECTED: Fraction/percentage without explicit total - {question.question[:100]}")
                    return False
        
        # Check for ratio problems - must have enough information
        if re.search(r'\bratio\b.*\d+.*:\s*\d+', question_text, re.IGNORECASE):
            numbers = re.findall(r'\b\d+\b', question.question)
            # Ratio problems typically need at least 3 numbers (2 for ratio, 1 for quantity)
            if len(numbers) < 3:
                has_total = re.search(r'\b(total|altogether|in all|sum)\s+(?:of\s+)?\d+', question_text, re.IGNORECASE)
                if not has_total:
                    logger.warning(f"REJECTED: Ratio problem without enough information - {question.question[:100]}")
                    return False
        
        # Additional solvability checks for open-ended questions
        if question.question_type == "Open-ended":
            # Detect "each <noun>" constructions without an accompanying quantity for that noun
            each_matches = re.finditer(r'\beach\s+(?:of\s+the\s+)?([a-z]+)', question_text, re.IGNORECASE)
            missing_nouns = []
            for match in each_matches:
                noun = match.group(1).lower()
                # Ignore measurement/unit nouns where individual counts are implied
                if noun in {'centimetre', 'centimeter', 'metre', 'meter', 'kilometre', 'kilometer',
                            'hour', 'minute', 'second', 'day', 'week', 'month', 'year', 'gram', 'kilogram'}:
                    continue
                plural = noun if noun.endswith('s') else noun + 's'
                quantity_patterns = [
                    rf'\b\d+\s+(?:\w+\s+)?{plural}\b',
                    rf'\b\d+\s+(?:\w+\s+)?{noun}\b',
                    rf'each\s+of\s+the\s+\d+\s+(?:\w+\s+)?{plural}\b'
                ]
                if not any(re.search(pattern, question_text, re.IGNORECASE) for pattern in quantity_patterns):
                    missing_nouns.append(noun)
            if missing_nouns:
                logger.warning(
                    f"REJECTED: 'each' reference without explicit count for {', '.join(sorted(set(missing_nouns)))} - "
                    f"{question.question[:100]}"
                )
                return False

            # Fraction-of-total questions must include at least one standalone quantity beyond fractional parts
            fraction_only = re.findall(r'\d+\s*/\s*\d+', question.question)
            if fraction_only:
                stripped = re.sub(r'\d+\s*/\s*\d+', ' ', question.question)
                stripped = re.sub(r'\d+\s*:\s*\d+', ' ', stripped)
                standalone_numbers = re.findall(r'\b\d+\b', stripped)
                if not standalone_numbers:
                    logger.warning(f"REJECTED: Fraction question missing a base quantity - {question.question[:100]}")
                    return False
        
        # Check for questions asking "how many" without enough context
        if re.search(r'how many\s+\w+\s+(are|is|was|were|does|do|did)', question_text):
            numbers = re.findall(r'\b\d+\b', question.question)
            # If asking "how many X are..." need at least one number for context
            if len(numbers) < 1:
                logger.warning(f"REJECTED: 'How many' question without numbers - {question.question[:100]}")
                return False
            # For "how many" with fractions/percentages, need totals
            if re.search(r'how many.*(\d+/\d+|[\d.]+%)', question_text):
                if not re.search(r'(\d+/\d+|[\d.]+%)\s+of\s+\d+', question_text):
                    logger.warning(f"REJECTED: 'How many' with fraction/% without total - {question.question[:100]}")
                    return False
        
        # Check for speed/distance/time problems - need at least 2 of the 3
        if re.search(r'\b(speed|distance|time)\b', question_text, re.IGNORECASE):
            has_speed = bool(re.search(r'\d+\s*(km/h|m/s|mph)', question_text, re.IGNORECASE))
            has_distance = bool(re.search(r'\d+\s*(km|m|miles)', question_text, re.IGNORECASE))
            has_time = bool(re.search(r'\d+\s*(hour|minute|second|hr|min|sec)', question_text, re.IGNORECASE))
            provided = sum([has_speed, has_distance, has_time])
            if provided < 2:
                logger.warning(f"REJECTED: Speed/distance/time problem with insufficient info - {question.question[:100]}")
                return False
        
        return True
    
    def _validate_question_clarity(self, question: Question) -> bool:
        """Validate question clarity and catch common issues from PDF validation"""
        import re
        question_text = question.question
        question_lower = question_text.lower()
        
        # 1. Check for diagram/figure references (CRITICAL - diagrams not shown in PDF)
        diagram_patterns = [
            r'look at (the )?(diagram|figure|picture|number line|graph|chart|table|image)',
            r'refer to (the )?(diagram|figure|picture|number line|graph|chart|table|image)',
            r'see (the )?(diagram|figure|picture|number line|graph|chart|table|image)',
            r'(diagram|figure|picture|number line|graph|chart|table|image) (shown|below|above|here)'
        ]
        for pattern in diagram_patterns:
            if re.search(pattern, question_lower, re.IGNORECASE):
                logger.warning(f"REJECTED: Question references diagram/figure - {question.question[:100]}")
                return False
        
        # 2. Check for common typos
        if re.search(r'\bin most\b', question_lower):
            logger.warning(f"REJECTED: Contains typo 'in most' (should be 'in all') - {question.question[:100]}")
            return False
        
        # 3. Check for extraneous text that shouldn't be in questions
        extraneous_patterns = [
            r'requiring equation solving',
            r'at a construction site\.',
            r'at a [^\.]+\.\s*$'  # Location mention at end of sentence
        ]
        for pattern in extraneous_patterns:
            if re.search(pattern, question_text, re.IGNORECASE):
                logger.warning(f"REJECTED: Contains extraneous text - {question.question[:100]}")
                return False
        
        # 4. For MCQ: Check unit consistency between question and options
        if question.question_type == "MCQ" and question.options:
            # Check if question asks for a count ("how many X")
            count_patterns = [
                r'how many\s+\w+\s+(?:can|are|is|were|was|does|do|did|will)',
                r'how many\s+\w+\s+(?:equal|parts|pieces|items|objects|things)',
                r'how many\s+(?:equal\s+)?parts',
                r'how many\s+(?:pieces|items|objects|things)',
                r'number of\s+\w+\s+(?:equal|parts|pieces)'
            ]
            asks_for_count = any(re.search(pattern, question_lower) for pattern in count_patterns)
            
            if asks_for_count:
                # Check if options have units (indicating measurement, not count)
                unit_pattern = r'\b(m|cm|mm|km|m2|m\^2|cm2|cm\^2|m3|m\^3|kg|g|mg|l|ml|litre|liter)\b'
                options_with_units = 0
                for option in question.options:
                    option_str = str(option).strip()
                    # Remove labels like "A) " or "1. "
                    option_clean = re.sub(r'^[A-Da-d0-9][\)\.:\-\s]+', '', option_str)
                    if re.search(unit_pattern, option_clean, re.IGNORECASE):
                        options_with_units += 1
                
                # If most/all options have units but question asks for count, reject
                if options_with_units >= 3:
                    logger.warning(f"REJECTED: Question asks for count but options have units - {question.question[:100]}")
                    return False
        
        # 5. Check for unclear phrasing in open-ended questions
        if question.question_type == "Open-ended":
            # Check for ambiguous "X more" or "X times more" without clear reference
            if re.search(r'\d+/\d+\s+more\s+(?:than\s+)?(?:what|which|it|they|them)', question_lower):
                logger.warning(f"REJECTED: Ambiguous 'X more' phrasing without clear reference - {question.question[:100]}")
                return False
            
            # Check for contradictory ratio constraints
            ratio_match = re.search(r'ratio.*?(\d+)\s*:\s*(\d+)', question_text, re.IGNORECASE)
            more_match = re.search(r'(\d+)\s+more\s+(?:red|blue|first|second)', question_lower)
            if ratio_match and more_match:
                # This might be a contradictory constraint - log warning but don't reject automatically
                # (let AI review handle this)
                logger.debug(f"Potential contradictory constraints: ratio {ratio_match.group(1)}:{ratio_match.group(2)} and 'more' constraint")
        
        # 6. Check for logic confusion (mixing different categories)
        # Pattern: Questions that mix trees/flowers, red/blue without clear relationship
        category_mix_patterns = [
            (r'\d+\s+tree\s+species', r'\d+\s+(?:flower|plant)\s+species'),
            (r'(?:tree|trees)', r'(?:flower|flowers)'),
        ]
        for pattern1, pattern2 in category_mix_patterns:
            if re.search(pattern1, question_lower) and re.search(pattern2, question_lower):
                # Check if the question makes logical sense
                if 'plant species' not in question_lower and 'species' in question_lower:
                    logger.warning(f"REJECTED: Logic confusion - mixes different categories - {question.question[:100]}")
                    return False
        
        return True
    
    def _manual_rule_checks(self, question: Question) -> tuple[bool, str]:
        """Apply rule-based sanity checks that catch common generation failures."""
        import re
        q_text = question.question or ""
        q_lower = q_text.lower()

        def _value_in_answer(value: str) -> bool:
            if not value:
                return False
            pattern = rf"\b{re.escape(value)}\b"
            if re.search(pattern, question.correct_answer_text or "", re.IGNORECASE):
                return True
            for opt in question.options or []:
                if re.search(pattern, str(opt), re.IGNORECASE):
                    return True
            return False

        def fail(reason: str) -> tuple[bool, str]:
            logger.warning(f"REJECTED: {reason} - {q_text[:100]}")
            return False, reason

        # Obvious corrupted phrases or unnatural wording
        if "how few" in q_lower:
            return fail("Contains unnatural phrase 'how few'")
        bad_tokens = ["parmostel", "smmoster", "mostocated"]
        for token in bad_tokens:
            if token in q_lower:
                return fail(f"Contains corrupted word '{token}'")
        if re.search(r'\bare\.\s*$', q_lower):
            return fail("Ends with stray 'are.' fragment")
        if re.search(r'\bare there are\b', q_lower):
            return fail("Contains duplicated phrase 'are there are'")
        if re.search(r'\bbelow\b', q_lower) or re.search(r'\bshown\b', q_lower):
            return fail("References diagram/table that is not present")

        # Trailing fragments or formatting issues
        if re.search(r'\?\.\s+|\.\s+(are|is|was|were|have|has|had)\s*$', q_lower):
            return fail("Has trailing fragments or formatting issues")
        if re.search(r'\?\s+(in|at|on)\s+(a|an|the)\s+\w+', q_lower):
            return fail("Has location phrase after question mark")

        # Fractions/percentages require explicit totals
        fraction_match = re.search(r'(\d+/\d+|[\d.]+%)\s+of\s+(?:the\s+)?([^.!?]+)', q_lower)
        if fraction_match:
            after_of = fraction_match.group(2)
            if not re.search(r'\d+', after_of):
                numbers = re.findall(r'\b\d+\b', q_text)
                if len(numbers) < 2:
                    has_total = re.search(r'\b(total|altogether|in all|sum|all|whole)\s+(?:of\s+)?\d+', q_lower)
                    if not has_total:
                        return fail(f"Fraction/percentage '{fraction_match.group(1)}' missing explicit total")

        # Ratio problems need enough numbers
        if re.search(r'\bratio\b.*\d+.*:\s*\d+', q_lower, re.IGNORECASE):
            numbers = re.findall(r'\b\d+\b', q_text)
            if len(numbers) < 3:
                has_total = re.search(r'\b(total|altogether|in all|sum)\s+(?:of\s+)?\d+', q_lower, re.IGNORECASE)
                if not has_total:
                    return fail("Ratio problem missing sufficient numbers or total")

        # "How many" questions must include contextual numbers and totals
        if re.search(r'how many\s+\w+\s+(are|is|was|were|does|do|did)', q_lower):
            numbers = re.findall(r'\b\d+\b', q_text)
            if len(numbers) < 1:
                return fail("'How many' question has no numbers")
            if re.search(r'how many.*(\d+/\d+|[\d.]+%)', q_lower):
                if not re.search(r'(\d+/\d+|[\d.]+%)\s+of\s+\d+', q_lower):
                    return fail("'How many' with fraction/% missing total")

        # Speed/distance/time problems need at least 2 of the 3 quantities
        if re.search(r'\b(speed|distance|time)\b', q_lower, re.IGNORECASE):
            has_speed = bool(re.search(r'\d+\s*(km/h|m/s|mph)', q_lower, re.IGNORECASE))
            has_distance = bool(re.search(r'\d+\s*(km|m|miles)', q_lower, re.IGNORECASE))
            has_time = bool(re.search(r'\d+\s*(hour|minute|second|hr|min|sec)', q_lower, re.IGNORECASE))
            provided = sum([has_speed, has_distance, has_time])
            if provided < 2:
                return fail(f"Speed/distance/time problem missing information (has {provided} of 3 needed)")

        discrete_keywords = {
            "goal", "goals", "student", "students", "child", "children", "boy", "boys", "girl", "girls",
            "book", "books", "shelf", "shelves", "swing", "swings", "turtle", "turtles", "plant", "plants",
            "computer", "computers", "stand", "stands", "equipment", "items", "boxes", "signpost", "signposts",
            "dish", "dishes", "test tube", "test tubes", "jar", "jars", "laptop", "laptops", "seat", "seats",
            "painting", "paintings", "instrument", "instruments", "toy", "toys"
        }
        measurement_keywords = {
            "km", "kilometre", "kilometer", "meter", "metre", "centimetre", "centimeter", "cm", "mm",
            "litre", "liter", "ml", "kg", "g", "hour", "hours", "minute", "minutes", "second", "seconds",
            "rate", "speed", "percentage", "percent", "%", "area", "volume", "capacity", "$", "dollar",
            "price", "cost"
        }

        if any(k in q_lower for k in discrete_keywords):
            decimals_in_question = re.findall(r'\d+\.\d+', q_text)
            decimals_in_options = []
            if question.question_type == "MCQ":
                for opt in question.options or []:
                    decimals_in_options.extend(re.findall(r'\d+\.\d+', str(opt)))
            if (decimals_in_question or decimals_in_options) and not any(unit in q_lower for unit in measurement_keywords):
                return fail("Decimal values present in discrete count context")

        still_need_match = re.search(r'still\s+need[s]?\s+(?:to\s+\w+\s+)?(\d+(?:\.\d+)?)', q_lower)
        if still_need_match and re.search(r'left\s+to\s+\w+\s+in\s+total', q_lower):
            expected_val = still_need_match.group(1)
            if not _value_in_answer(expected_val):
                return fail("Mismatch between 'still needs' amount and provided answer/options")

        total_match = re.search(r'together\s+scored\s+(\d+(?:\.\d+)?)', q_lower)
        initial_match = re.search(r'scored\s+a\s+total\s+of\s+(\d+(?:\.\d+)?)', q_lower)
        more_match = re.search(r'scored\s+(\d+(?:\.\d+)?)\s+(?:more|additional)', q_lower)
        if total_match and initial_match and more_match:
            try:
                initial_val = float(initial_match.group(1))
                add_val = float(more_match.group(1))
                total_val = float(total_match.group(1))
                if abs((initial_val + add_val) - total_val) > 0.01:
                    return fail("Addition relationship inconsistent (initial + more != together total)")
            except ValueError:
                pass

        if re.search(r'how many', q_lower) and any(k in q_lower for k in discrete_keywords):
            if re.search(r'\d+\.\d+', question.correct_answer_text or "") and not any(unit in q_lower for unit in measurement_keywords):
                return fail("Correct answer is non-integer for discrete 'How many' question")

        if re.search(r'\d+\s*/\s*\d+', q_lower):
            stripped_numeric = re.sub(r'\d+\s*/\s*\d+', ' ', q_lower)
            stripped_numeric = re.sub(r'\d+(?:\.\d+)?\s*%', ' ', stripped_numeric)
            if not re.search(r'\b\d+\b', stripped_numeric):
                return fail("Fraction problem missing explicit total value")

        if question.question_type == "MCQ":
            if re.search(r'(correct to|decimal place|nearest tenth|nearest hundredth|1 dp|2 dp)', q_lower):
                decimal_options = [opt for opt in question.options if '.' in str(opt)]
                if not decimal_options:
                    return fail("Decimal rounding question without decimal options")

        return True, ""
    
    def manual_review_question(self, question: Question, topic: str):
        """
        AI-powered manual review of a question before adding to paper.
        Uses AI reasoning to validate quality, solvability, and clarity.
        Returns (is_approved, rejection_reason)
        """
        import re
        import json
        
        if not question or not question.question:
            return False, "Question text is missing"
        
        # Quick basic checks first (these are critical and fast)
        q_text = question.question
        q_lower = q_text.lower()
        
        # Basic formatting check
        if '[Name]' in q_text or '[name]' in q_text:
            return False, "Contains placeholder [Name]"
        
        # MCQ basic validation - check if correct answer makes sense for simple problems
        if question.question_type == "MCQ":
            # Quick validation: Check simple division problems
            # Pattern: "X m into Y equal pieces" -> answer should be approximately X ÷ Y
            import re
            division_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:m|cm|km|kg|g|l|ml)?\s+(?:into|÷|divided by|/\s)\s*(\d+)\s+(?:equal\s+)?pieces?', q_lower)
            if division_match:
                try:
                    dividend = float(division_match.group(1))
                    divisor = float(division_match.group(2))
                    expected = dividend / divisor
                    # Get the correct answer value
                    correct_str = question.correct_answer_text or ""
                    correct_match = re.search(r'(\d+(?:\.\d+)?)', correct_str)
                    if correct_match:
                        correct_val = float(correct_match.group(1))
                        # Check if correct answer is close to expected (within 10% tolerance)
                        if abs(correct_val - expected) > max(expected * 0.1, 0.5):
                            # Also check if any option is close to the correct answer
                            options_have_correct = False
                            for opt in question.options:
                                opt_match = re.search(r'(\d+(?:\.\d+)?)', str(opt))
                                if opt_match:
                                    opt_val = float(opt_match.group(1))
                                    if abs(opt_val - expected) <= max(expected * 0.1, 0.5):
                                        options_have_correct = True
                                        break
                            if not options_have_correct:
                                return False, f"MCQ division answer mismatch: expected ~{expected:.1f}, got {correct_val}, options don't match calculation"
                except (ValueError, ZeroDivisionError):
                    pass  # Skip if parsing fails
            if not question.options or len(question.options) < 4:
                return False, f"MCQ has invalid options: {len(question.options) if question.options else 0} options"
            
            # Check for placeholder options
            for opt in question.options:
                opt_str = str(opt).lower().strip()
                if re.match(r'^(option|choice)\s*\d+$', opt_str):
                    return False, f"MCQ contains placeholder option: {opt}"
                if not opt or not str(opt).strip():
                    return False, "MCQ has empty option"
        
        # Rule-based checks before consulting AI review
        rule_ok, rule_reason = self._manual_rule_checks(question)
        if not rule_ok:
            return False, rule_reason
        
        # Now use AI to intelligently review the question
        # Get LM client from the generator (it's passed to validator through generator)
        # We need to find a way to access the LM client - let's check the structure
        # Actually, we should pass lm_client to the validator
        # For now, let's check if we can access it through the generator
        # Actually, the validator might not have direct access to lm_client
        # Let's add it to the validator's __init__
        
        # Build the AI review prompt
        review_prompt = f"""You are an expert PSLE Math teacher reviewing a question for a practice paper.

QUESTION TO REVIEW:
Topic: {topic}
Type: {question.question_type}

Question: {q_text}

"""
        
        if question.question_type == "MCQ":
            review_prompt += f"""Options:
1. {question.options[0] if len(question.options) > 0 else 'N/A'}
2. {question.options[1] if len(question.options) > 1 else 'N/A'}
3. {question.options[2] if len(question.options) > 2 else 'N/A'}
4. {question.options[3] if len(question.options) > 3 else 'N/A'}

Correct Answer: {question.correct_answer_text if question.correct_answer_text else 'N/A'}

"""
        
        review_prompt += """TASK: Carefully review this question and determine if it should be APPROVED or REJECTED.

Check for:
1. **SOLVABILITY**: Can this question be solved with the information provided?
   - If it mentions fractions/percentages (e.g., "3/4 of..." or "20% of..."), is the total/base amount explicitly stated?
   - If it's a ratio problem, are there enough numbers or is a total mentioned?
   - If it asks "how many", are there enough numbers/context to calculate?
   - For speed/distance/time problems, are at least 2 of the 3 quantities provided?
   - Does it have all the information needed to solve it?

2. **QUALITY & CLARITY**: 
   - Is the question clearly written and understandable?
   - Does it have formatting issues, trailing fragments (like "? are" at the end), or incomplete sentences?
   - **CRITICAL**: Does it have incomplete fractions (e.g., "3/" instead of "3/4") that make it unsolvable?
   - Is it asking something that can be answered?

3. **LOGICAL CONSISTENCY**:
   - Does the question make mathematical sense?
   - If asking for percentage increase, are initial and final values provided?
   - Are the numbers realistic and appropriate for the problem type?

4. **MCQ SPECIFIC** (if MCQ):
   - Are all 4 options valid (not placeholders, not empty, not duplicates)?
   - Do the options make sense as distractors?
   - **CRITICAL**: Is the correct answer actually correct for the question? Verify the calculation:
     * If question asks "X into Y equal pieces" or "X ÷ Y" or "X divided by Y", calculate X ÷ Y and check if the correct answer matches (within reasonable rounding)
     * If question asks "How many...", verify the correct answer matches the calculation
     * If question asks for area/volume/length, check units and values are reasonable
     * If question asks about fractions/percentages, verify the correct answer matches the calculation
     * **REJECT if correct answer doesn't match what the question is asking for** - this is a critical error
     * Check if ALL options are wrong (none match the correct calculation) - this is also a critical error

5. **COMPLETENESS**:
   - Does the question have enough numbers/context for the type of problem?
   - Is it missing any critical information?

RESPOND WITH JSON ONLY:
{
  "approved": true or false,
  "reason": "Brief explanation (e.g., 'Approved - question is solvable and well-formed' OR 'Rejected - missing total for fraction calculation')"
}

Be STRICT but FAIR. Only approve if the question is truly complete, solvable, and well-written. Reject if there are any critical issues that would make it unsolvable or confusing for students."""

        # Use AI-powered review with LM Studio if available
        try:
            if self.lm_client and self.lm_client.is_available():
                response, success = self.lm_client.chat(
                    messages=[{"role": "user", "content": review_prompt}],
                    temperature=0.1,  # Low temperature for consistent validation
                    max_tokens=200,
                )
                if success and response:
                    try:
                        # Try to parse JSON response
                        # Sometimes the model wraps JSON in markdown, so clean it
                        response_clean = response.strip()
                        if response_clean.startswith('```'):
                            # Extract JSON from markdown code block
                            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_clean, re.DOTALL)
                            if json_match:
                                response_clean = json_match.group(1)
                        
                        result = json.loads(response_clean)
                        approved = result.get("approved", False)
                        reason = result.get("reason", "No reason provided")
                        
                        if approved:
                            rule_ok, rule_reason = self._manual_rule_checks(question)
                            if not rule_ok:
                                return False, rule_reason
                            logger.info(f"AI REVIEW: APPROVED - {reason}")
                            return True, "Approved by AI review"
                        else:
                            logger.warning(f"AI REVIEW: REJECTED - {reason}")
                            return False, f"AI Review: {reason}"
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.warning(f"AI review response parsing failed: {e}, response: {response[:200]}")
                        # Fall through to enhanced pattern matching
        except AttributeError:
            # No LM client available, fall through to enhanced pattern matching
            pass
        
        # FALLBACK: Enhanced pattern matching if AI review not available
        # Run rule checks again in case AI path was unavailable
        rule_ok, rule_reason = self._manual_rule_checks(question)
        if not rule_ok:
            return False, rule_reason
        
        # Additional MCQ-specific duplicate option check
        if question.question_type == "MCQ":
            option_values = []
            for opt in question.options:
                num_match = re.search(r'-?\d+(?:[.,]\d+)?', str(opt))
                if num_match:
                    val = float(num_match.group(0).replace(',', ''))
                    if val in option_values:
                        return False, f"MCQ has duplicate numeric values in options"
                    option_values.append(val)
            
            if not question.correct_answer_text or question.correct_answer_index not in range(4):
                return False, f"MCQ has invalid correct answer (index: {question.correct_answer_index})"
        
        # 7. CHECK: Question clarity
        if not re.search(r'\?$', q_text) and not re.search(r'(find|calculate|determine|what|how|which)', q_lower):
            return False, "Question doesn't clearly ask for something"
        
        # All checks passed
        return True, "Approved (pattern matching fallback)"
    
    def get_quality_score(self, question: Question) -> int:
        """Score PSLE P6 suitability (0–10) with signals aligned to curriculum expectations."""
        score = 0
        qt = (question.question or "").lower()

        # 1) Length (0–2): broader acceptable window; avoid over-penalizing multi-line stems
        qlen = len(question.question or "")
        if 60 <= qlen <= 220:
            score += 2
        elif 40 <= qlen <= 300:
            score += 1

        # 2) Topic indicators (0–2): presence of PSLE-relevant math terms
        psle_terms = [
            'fraction', 'decimal', 'percentage', 'ratio', 'proportion',
            'area', 'perimeter', 'volume', 'capacity', 'speed', 'distance', 'time',
            'angle', 'triangle', 'rectangle', 'circle', 'algebra', 'equation',
            'average', 'mean', 'data', 'graph', 'chart', 'mass', 'weight', 'length', 'height', 'width', 'unit'
        ]
        if any(t in qt for t in psle_terms):
            score += 2

        # 3) Application verbs and question words (0–2)
        if any(w in qt for w in ['calculate', 'find', 'determine', 'solve', 'how many', 'how much']):
            score += 2
        elif any(w in qt for w in ['what is', 'what', 'work out']):
            score += 1

        # 4) Data richness (numbers) (0–1)
        import re as _re
        nums = _re.findall(r"\b\d+(?:[.,]\d+)?\b", qt)
        if len(nums) >= 2:
            score += 1

        # 5) Units present (0–1)
        if any(_re.search(rf"\b{u}\b", qt) for u in ['cm','m','km','mm','kg','g','mg','l','ml','minutes','minute','hours','hour','seconds','second']):
            score += 1

        # 6) Multi-step cues (0–2)
        if any(w in qt for w in ['then', 'after', 'next', 'remaining', 'altogether', 'in total', 'finally', 'first']):
            score += 2

        # 7) Format compliance (0–1)
        if question.question_type == 'MCQ':
            opts = question.options or []
            if len(opts) == 4:
                # credit if at least 3 numeric-like options
                numeric_like = 0
                for o in opts:
                    s = _re.sub(r"^[\s]*[A-D]\)\s*", "", o, flags=_re.IGNORECASE)
                    if _re.search(r"^\$?\s*-?(?:\d+(?:[.,]\d+)?|\d+\s*/\s*\d+)\s*(?:[a-z%°c]+)?\s*$", s, flags=_re.IGNORECASE):
                        numeric_like += 1
                if numeric_like >= 3:
                    score += 1
        else:
            if any(w in qt for w in ['show your working', 'working', 'steps', 'explain']):
                score += 1

        # 8) Mild penalty for overused contexts (max -1)
        overused = ['canteen', 'shopping', 'mall', 'supermarket', 'pizza', 'ice cream']
        if sum(1 for t in overused if t in qt) >= 1:
            score -= 1

        return max(0, min(10, score))

class PDFFormattingAgent:
    """Specialized agent for professional PDF formatting"""
    
    def __init__(self):
        self.page_height = 792  # Letter size height in points
        self.margin = 72  # 1 inch margins
        self.content_height = self.page_height - (2 * self.margin)
        self.current_page_height = 0
        self.questions_per_page = 0
        self.max_questions_per_page = 7  # Fit more questions per page when space allows
    
    def estimate_question_height(self, question_text, question_type):
        """Estimate the height needed for a complete question"""
        # More accurate height estimation based on actual content
        # Count words and estimate lines (assuming ~12 words per line)
        word_count = len(question_text.split())
        estimated_lines = max(1, word_count // 12)
        
        # Base height for question text (more conservative)
        base_height = max(30, estimated_lines * 18)  # ~18 points per line
        
        if question_type == "MCQ":
            # Add space for 4 options + spacing (more conservative)
            return base_height + 110  # ~27 points per option
        else:
            # Add space for working area (increase to avoid split of 'Answer:')
            return base_height + 120
    
    def should_break_before_question(self, question_text, question_type):
        """Determine if we should break before this question to avoid cutting it off"""
        question_height = self.estimate_question_height(question_text, question_type)
        
        # Add buffer space to prevent questions from being cut off
        buffer_space = 100  # Extra space for safety to avoid orphaned lines
        
        # If adding this question would exceed page capacity, break before it
        if self.current_page_height + question_height + buffer_space > self.content_height:
            return True
        
        # If we already have many questions on this page, consider breaking
        if self.questions_per_page >= self.max_questions_per_page:
            return True
            
        return False
    
    def add_question_to_page(self, question_text, question_type):
        """Track that we've added a question to the current page"""
        question_height = self.estimate_question_height(question_text, question_type)
        # Add extra height for spacing between questions
        spacing_height = 12  # Height of Spacer(1, 12)
        self.current_page_height += question_height + spacing_height
        self.questions_per_page += 1
    
    def reset_page(self):
        """Reset counters for a new page"""
        self.current_page_height = 0
        self.questions_per_page = 0

class PaperFormatter:
    """Paper formatter"""
    
    def __init__(self):
        self.pdf_agent = PDFFormattingAgent()
    
    def format_paper(self, paper_data: Dict) -> str:
        """Format paper data into a readable string"""
        if not paper_data:
            return "No paper data available"
        
        output = []
        output.append(f"Title: {paper_data['title']}")
        output.append(f"Total Questions: {paper_data['total_questions']}")
        output.append(f"Topics Covered: {', '.join(paper_data['topics_covered'])}")
        output.append(f"Generated: {paper_data['generated_at']}")
        output.append("")
        
        for i, question in enumerate(paper_data['questions'], 1):
            output.append(f"Question {i}: {question.question}")
            for j, option in enumerate(question.options):
                output.append(f"  {option}")
            output.append(f"  Correct Answer: {question.correct_answer_text}")
            output.append(f"  Topic: {question.topic}")
            output.append(f"  Source: {question.source}")
            output.append("")
        
        return "\n".join(output)
    
    def save_to_pdf(self, paper_data: Dict, filename: str) -> bool:
        """Save paper to PDF"""
        try:
            import os
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, ListFlowable, ListItem
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            import re

            # Ensure output directory exists
            output_dir = os.path.dirname(filename) or "."
            os.makedirs(output_dir, exist_ok=True)
            
            def convert_latex_fractions(text):
                """Convert LaTeX fractions to proper ReportLab formatting"""
                if not text:
                    return text
                
                # Convert (frac{numerator}{denominator}) to proper fractions
                def replace_fraction(match):
                    numerator = match.group(1).strip()
                    denominator = match.group(2).strip()
                    return f'<font size="8"><sup>{numerator}</sup></font>/<font size="8"><sub>{denominator}</sub></font>'
                
                # Handle various LaTeX fraction formats
                # Pattern 1: \(frac{3}{4}\) - with parentheses and backslash
                text = re.sub(r'\\?\(frac\{([^}]+)\}\{([^}]+)\}\)', replace_fraction, text)
                # Pattern 2: \frac{3}{4} - standard LaTeX
                text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', replace_fraction, text)
                # Pattern 3: frac{3}{4} - without backslash
                text = re.sub(r'frac\{([^}]+)\}\{([^}]+)\}', replace_fraction, text)
                # Pattern 4: (frac{3}{4}) - with parentheses only
                text = re.sub(r'\(frac\{([^}]+)\}\{([^}]+)\}\)', replace_fraction, text)
                
                # Handle simple fractions like 3/4 (but not in URLs or complex expressions)
                text = re.sub(r'(?<!\w)(\d+)/(\d+)(?!\w)', r'<font size="8"><sup>\1</sup></font>/<font size="8"><sub>\2</sub></font>', text)
                
                # Handle mixed numbers like 1 3/4
                text = re.sub(r'(\d+)\s+(\d+)/(\d+)', r'\1<font size="8"><sup>\2</sup></font>/<font size="8"><sub>\3</sub></font>', text)
                
                return text
            
            doc = SimpleDocTemplate(filename, pagesize=letter)
            # Allow flowables to split to avoid overflows
            doc.allowSplitting = 1
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                spaceAfter=30,
                alignment=1  # Center alignment
            )
            story.append(Paragraph(paper_data['title'], title_style))
            story.append(Spacer(1, 20))
            
            # Paper info
            info_style = ParagraphStyle(
                'Info',
                parent=styles['Normal'],
                fontSize=10,
                spaceAfter=12
            )
            story.append(Paragraph(f"Total Questions: {paper_data['total_questions']}", info_style))
            story.append(Paragraph(f"Topics: {', '.join(paper_data['topics_covered'])}", info_style))
            story.append(Paragraph(f"Generated: {paper_data['generated_at']}", info_style))
            story.append(Spacer(1, 20))
            
            # Questions - Optimized spacing for better readability
            question_style = ParagraphStyle(
                'Question',
                parent=styles['Normal'],
                fontSize=12,
                spaceAfter=12,  # Reduced from 18 to prevent large gaps
                spaceBefore=6,  # Reduced from 8
                leftIndent=0,
                leading=18  # Increased line spacing for better readability
            )
            
            option_style = ParagraphStyle(
                'Option',
                parent=styles['Normal'],
                fontSize=10,
                spaceAfter=6,  # Reduced from 8
                spaceBefore=2,  # Reduced from 4
                leftIndent=20,
                leading=16  # Increased line spacing
            )
            
            # Track question numbers for each section
            mcq_count = 0
            open_ended_count = 0
            
            # Initialize formatting agent
            formatting_agent = PDFFormattingAgent()
            
            # Add section header for MCQ questions at the beginning
            if paper_data['questions'] and paper_data['questions'][0].question_type == "MCQ":
                section_style = ParagraphStyle(
                    'SectionHeader',
                    parent=styles['Heading2'],
                    fontSize=14,
                    spaceAfter=20,
                    alignment=0  # Left alignment
                )
                story.append(Paragraph("<b>MULTIPLE CHOICE QUESTIONS</b>", section_style))
                story.append(Spacer(1, 10))
                # Track the section header height
                formatting_agent.add_question_to_page("Section Header", "MCQ")
            
            for i, question in enumerate(paper_data['questions']):
                # Add section header for first open-ended question
                if question.question_type == "Open-ended" and open_ended_count == 0:
                    # Add page break before open-ended section
                    story.append(PageBreak())
                    formatting_agent.reset_page()  # Reset page counter for new section
                    section_style = ParagraphStyle(
                        'SectionHeader',
                        parent=styles['Heading2'],
                        fontSize=14,
                        spaceAfter=20,
                        alignment=0  # Left alignment
                    )
                    story.append(Paragraph("<b>OPEN-ENDED QUESTIONS</b>", section_style))
                    story.append(Spacer(1, 10))
                    # Track the section header height
                    formatting_agent.add_question_to_page("Section Header", "Open-ended")
                
                # Determine question number based on type
                if question.question_type == "MCQ":
                    mcq_count += 1
                    question_num = mcq_count
                else:
                    open_ended_count += 1
                    question_num = open_ended_count
                
                # Convert LaTeX fractions to proper HTML format
                converted_question = convert_latex_fractions(question.question)
                
                # Smart page breaking - only break if question would be cut off
                if formatting_agent.should_break_before_question(converted_question, question.question_type):
                    story.append(PageBreak())
                    formatting_agent.reset_page()
                    formatting_agent.reset_page()
                question_header = f"<b>Question {question_num} ({question.question_type}) - {question.marks} mark{'s' if question.marks > 1 else ''}:</b> {converted_question}"
                story.append(Paragraph(question_header, question_style))
                story.append(Spacer(1, 4))  # Reduced from 6 to prevent large gaps

                if question.question_type == "MCQ" and question.options:
                    # Ensure exactly 4 options for MCQ
                    import re as _re
                    options = question.options[:4]  # Take only first 4 options
                    if len(options) < 4:
                        # Pad with generic options if needed
                        for i in range(len(options), 4):
                            options.append(f"Option {i+1}")
                    
                    # Render options as numbered paragraphs
                    for idx, opt in enumerate(options, 1):
                        cleaned = _re.sub(r'^\s*([A-D]|[1-4])[\)\.]\s+', '', opt).strip()
                        cleaned = convert_latex_fractions(cleaned)
                        story.append(Paragraph(f"{idx}. {cleaned}", option_style))
                    story.append(Spacer(1, 6))  # Reduced from 8
                else:
                    # Open-ended: provide working area
                    story.append(Paragraph("Show your working:", option_style))
                    story.append(Spacer(1, 20))  # Reduced from 24
                    story.append(Paragraph("Answer: ________________", option_style))
                    story.append(Spacer(1, 6))  # Reduced from 8
                
                # Add spacing between questions
                story.append(Spacer(1, 12))  # Reduced from 20 to prevent large gaps
                
                # Track this question in the formatting agent
                formatting_agent.add_question_to_page(converted_question, question.question_type)
            
            doc.build(story)
            return True
            
        except Exception as e:
            logger.error(f"Failed to save PDF: {e}")
            return False

def main():
    """Main function"""
    print("Final Working PSLE Math Paper Generator")
    print("=" * 50)
    
    # Initialize generator
    generator = FinalWorkingPSLEMathPaperGenerator("final_cleaned_withtopics.json")
    
    # Check LM Studio connection
    if generator.check_lm_studio_connection():
        print("SUCCESS: LM Studio is available")
    else:
        print("INFO: LM Studio not available - using enhanced variations")
    
    # Generate paper
    print("\nGenerating practice paper...")
    paper_data = generator.generate_practice_paper(
        title="PSLE Math Practice Paper - Enhanced Variations",
        total_questions=30
    )
    
    if paper_data:
        print(f"SUCCESS: Generated paper with {paper_data['total_questions']} questions")
        print(f"Topics covered: {', '.join(paper_data['topics_covered'])}")
        
        # Show question sources (omit 'Original')
        print("\nQuestion Sources:")
        for source, count in paper_data['question_sources'].items():
            if source == 'Original':
                continue
            print(f"   - {source}: {count}")
        
        # Save to PDF
        print("\nSaving to PDF...")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdf_filename = f"outputs/psle_math_practice_{timestamp}.pdf"
        
        if generator.formatter.save_to_pdf(paper_data, pdf_filename):
            print(f"SUCCESS: Practice paper saved to: {pdf_filename}")
        else:
            print("ERROR: Failed to save PDF")
    else:
        print("ERROR: Failed to generate practice paper")

if __name__ == "__main__":
    main()
