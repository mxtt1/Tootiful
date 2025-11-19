"""
PSLE Math Question Extractor Configuration
Primary 6 PSLE Math Singapore - Question Extraction and Classification
"""

from pathlib import Path
import os

# Base paths
BASE_DIR = Path(__file__).parent.parent
OUTPUTS_DIR = BASE_DIR / "outputs"
QUESTIONS_DIR = OUTPUTS_DIR / "questions"
LOGS_DIR = OUTPUTS_DIR / "logs"
ANALYSIS_DIR = OUTPUTS_DIR / "analysis"

# LM Studio Configuration
LM_STUDIO_CONFIG = {
    "base_url": "http://127.0.0.1:1234",
    "model_name": "qwen2.5-math-7b-instruct",  # Your Qwen Math model
    "timeout": 120,  # Increased from 30 to 120 seconds
    "max_retries": 2,  # Reduced retries to avoid long waits
    "temperature": 0.1,
    "max_tokens": 500  # Reduced tokens for faster response
}

# Processing Configuration
PROCESSING_CONFIG = {
    "min_confidence_threshold": 85.0,
    "dpi": 300,  # For PDF to image conversion
    "max_questions_per_pdf": 50,
    "batch_size": 5,  # For LM Studio validation
    "enable_lm_validation": True,
    "save_debug_images": False
}

# PSLE Math Topics (Primary 6 Singapore)
PSLE_TOPICS = {
    "whole_numbers": {
        "keywords": ["whole number", "integer", "addition", "subtraction", "multiplication", "division", "sum", "difference", "product", "quotient", "remainder", "place value", "rounding", "estimation"],
        "description": "Operations with whole numbers, place value, rounding, estimation"
    },
    "fractions": {
        "keywords": ["fraction", "numerator", "denominator", "equivalent", "simplify", "mixed number", "improper fraction", "add", "subtract", "multiply", "divide"],
        "description": "Understanding and operations with fractions"
    },
    "decimals": {
        "keywords": ["decimal", "decimal point", "tenths", "hundredths", "thousandths", "place value", "rounding", "addition", "subtraction", "multiplication", "division"],
        "description": "Understanding and operations with decimals"
    },
    "percentage": {
        "keywords": ["percentage", "%", "percent", "rate", "discount", "increase", "decrease", "profit", "loss", "interest", "tax"],
        "description": "Understanding and calculations with percentages"
    },
    "ratio": {
        "keywords": ["ratio", "proportion", "share", "part", "whole", "simplify", "equivalent", "direct proportion", "inverse proportion"],
        "description": "Understanding and working with ratios and proportions"
    },
    "algebra": {
        "keywords": ["algebra", "variable", "equation", "solve", "unknown", "expression", "formula", "pattern", "sequence", "nth term"],
        "description": "Basic algebraic concepts and problem solving"
    },
    "geometry": {
        "keywords": ["angle", "triangle", "rectangle", "square", "circle", "perimeter", "area", "volume", "diameter", "radius", "circumference", "parallel", "perpendicular", "symmetry"],
        "description": "Geometric shapes, measurements, and properties"
    },
    "measurement": {
        "keywords": ["length", "width", "height", "mass", "weight", "volume", "capacity", "time", "temperature", "kilogram", "gram", "metre", "centimetre", "litre", "millilitre"],
        "description": "Units of measurement and conversions"
    },
    "data_analysis": {
        "keywords": ["graph", "chart", "table", "data", "statistics", "mean", "median", "mode", "range", "frequency", "probability", "bar chart", "pie chart", "line graph"],
        "description": "Data representation, interpretation, and basic statistics"
    },
    "patterns": {
        "keywords": ["pattern", "sequence", "rule", "next", "continue", "figure", "shaded", "unshaded", "triangle", "square", "number pattern", "geometric pattern"],
        "description": "Number patterns, geometric patterns, and sequences"
    }
}

# Question filtering patterns
QUESTION_FILTERS = {
    "non_question_keywords": [
        "answer key", "answers", "marking scheme", "rubric", "instructions", 
        "read carefully", "show your working", "use the space provided",
        "cover page", "title page", "contents", "index", "appendix"
    ],
    "question_indicators": [
        "question", "solve", "find", "calculate", "work out", "determine",
        "what is", "how many", "how much", "which", "explain", "show"
    ],
    "min_question_length": 20,  # Minimum characters for a valid question
    "max_question_length": 2000  # Maximum characters for a valid question
}

# Output formats
OUTPUT_CONFIG = {
    "save_json": True,
    "save_txt": True,
    "save_individual_files": True,
    "include_metadata": True,
    "include_confidence_scores": True
}

# Logging configuration
LOGGING_CONFIG = {
    "level": "INFO",
    "format": "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
    "file_logging": True,
    "console_logging": True
}

def ensure_directories():
    """Create all necessary directories"""
    directories = [OUTPUTS_DIR, QUESTIONS_DIR, LOGS_DIR, ANALYSIS_DIR]
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
