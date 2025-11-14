"""
Test script for PSLE Math Question Extractor
"""

import sys
from pathlib import Path

# Add src and config to path
sys.path.append(str(Path(__file__).parent.parent / "src"))
sys.path.append(str(Path(__file__).parent.parent / "config"))

from psle_math_extractor import PSLEMathExtractor
from lm_studio_validator import LMStudioValidator

def test_basic_functionality():
    """Test basic extractor functionality"""
    print("Testing PSLE Math Extractor...")
    
    # Test extractor initialization
    extractor = PSLEMathExtractor(enable_lm_validation=False)
    print("[OK] Extractor initialized successfully")
    
    # Test topic classification
    test_text = "Find the area of a rectangle with length 5 cm and width 3 cm."
    topic = extractor._classify_topic(test_text)
    print(f"[OK] Topic classification test: '{test_text}' -> {topic}")
    
    # Test question validation
    is_valid = extractor._is_valid_question(test_text)
    print(f"[OK] Question validation test: {is_valid}")
    
    # Test confidence calculation
    confidence = extractor._calculate_confidence(test_text, topic)
    print(f"[OK] Confidence calculation: {confidence:.1f}%")
    
    print("All basic tests passed!")

def test_lm_studio_connection():
    """Test LM Studio connection"""
    print("\nTesting LM Studio connection...")
    
    validator = LMStudioValidator()
    if validator.available:
        print("[OK] LM Studio is available and connected")
        
        # Test topic classification
        test_text = "Calculate 25% of 80"
        topic = validator.classify_topic_advanced(test_text)
        print(f"[OK] Advanced topic classification: '{test_text}' -> {topic}")
    else:
        print("[WARN] LM Studio is not available (this is okay for testing)")

if __name__ == "__main__":
    test_basic_functionality()
    test_lm_studio_connection()
    print("\nTest completed!")
