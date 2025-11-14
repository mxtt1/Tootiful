# AgentDataEngineering

A specialized toolkit for extracting, cleaning, validating, and curating Primary 6 PSLE Math questions from Singapore school papers using PyMuPDF, LM Studio, and a custom multi-agent workflow.

## Features

- **PDF Text Extraction**: Uses PyMuPDF for reliable text extraction from scanned PDFs
- **LM Studio Integration**: Leverages Qwen2.5-Math-7B-Instruct for question validation and enhancement
- **PSLE Topic Classification**: Automatically classifies questions into 10 PSLE math topics
- **Question Filtering**: Intelligently filters out non-question content (cover pages, answer keys, etc.)
- **Multiple Output Formats**: Saves results in JSON, text, and individual question files
- **Confidence Scoring**: Provides confidence scores for extracted questions

## PSLE Math Topics Covered

1. **Whole Numbers** - Operations, place value, rounding, estimation
2. **Fractions** - Understanding and operations with fractions
3. **Decimals** - Understanding and operations with decimals
4. **Percentage** - Calculations with percentages, rates, discounts
5. **Ratio** - Ratios, proportions, sharing problems
6. **Algebra** - Basic algebraic concepts, equations, patterns
7. **Geometry** - Shapes, measurements, area, perimeter, volume
8. **Measurement** - Units, conversions, time, temperature
9. **Data Analysis** - Graphs, charts, statistics, probability
10. **Patterns** - Number patterns, geometric patterns, sequences

## Installation

1. **Clone or download** this repository
2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Setup LM Studio** (optional but recommended):
   - Download and install [LM Studio](https://lmstudio.ai/)
   - Download the `Qwen2.5-Math-7B-Instruct` model
   - Start the model in LM Studio (usually on port 1234)

## Multi-Agent Workflow (New)

Located under `AgentDataEngineering/src`, the new `QuestionWorkflowManager` wires four agents together:

1. **Cleaning Agent** – Normalises text/options coming from `SampleSchoolPapers/outputs/psle_questions.cleaned*.json`.
2. **Doability Agent** – Sends each question to LM Studio (Qwen2.5-Math-7B-Instruct) to verify clarity, solvability, and single-answer MCQ compliance. When LM Studio is offline the agent gracefully skips but flags the question for later review.
3. **Answer Validation Agent** – Ensures MCQ options remain sensible and, when LM Studio is available, independently solves the question to confirm the stored answer.
4. **Aggregation Agent** – Writes verified questions into `AgentDataEngineering/outputs/validation/updated_clean_341_questions.json`, keeping IDs stable for downstream tooling and embedding agent metadata per question.

### Running the agents

```bash
# From the repo root
python AgentDataEngineering/src/question_agent_pipeline.py \
  --input SampleSchoolPapers/outputs/psle_questions.cleaned.json \
  --output AgentDataEngineering/outputs/validation/updated_clean_341_questions.json \
  --limit 50
```

Useful flags:

- `--offline`: Skip LM Studio calls (marks questions as needing review).
- `--limit N`: Process only the first `N` questions for smoke testing.
- `--start-line 10461`: Resume from the question whose block begins at the given line number inside `psle_questions.cleaned.json`.
- `--start-question-id <id>` / `--start-index <n>`: Alternate resume controls when you already know the ID or 0-based index.
- `--skip-answer-model`: Run structural option checks but suppress the LM Studio double-check (useful when you must ingest data while the model is offline).
- `--verbose`: Include debug logging in `AgentDataEngineering/outputs/logs/agent_pipeline.log`.

> The loader automatically falls back to `psle_questions.cleaned.valid.json` when the main file contains OCR artefacts that break JSON parsing.

### Legacy extractor CLI

If you still need the legacy PDF extractor, keep using `run_extraction.py` with the existing flags documented below.

## Output Files

The extractor creates several output files:

### Main Output Files

- `psle_questions_YYYYMMDD_HHMMSS.json` - Structured JSON format
- `psle_questions_YYYYMMDD_HHMMSS.txt` - Human-readable text format
- `topic_summary_YYYYMMDD_HHMMSS.json` - Topic distribution summary

### Individual Question Files

- `questions/question_001_whole_numbers.txt` - Individual question files
- `questions/question_002_fractions.txt` - Organized by topic

### Logs

- `logs/extraction.log` - Detailed extraction logs

## Configuration

Edit `config/psle_config.py` to customize:

- **LM Studio settings**: URL, model name, timeout
- **Processing parameters**: Confidence thresholds, batch sizes
- **PSLE topics**: Add or modify topic keywords
- **Question filters**: Adjust filtering criteria
- **Output formats**: Choose which formats to save

## How It Works

1. **PDF Processing**:

   - Opens PDF files using PyMuPDF
   - Skips non-question pages (cover pages, answer keys)
   - Extracts text from each page

2. **Question Extraction**:

   - Splits text into potential question blocks
   - Filters out non-question content
   - Validates question quality

3. **Topic Classification**:

   - Uses keyword matching for initial classification
   - LM Studio provides advanced classification if available

4. **Validation** (if LM Studio is running):

   - Validates question quality
   - Cleans up OCR errors
   - Provides reasoning for classification

5. **Output Generation**:
   - Saves questions in multiple formats
   - Generates topic summaries
   - Creates individual question files

## LM Studio Integration

The extractor integrates with LM Studio for advanced question validation:

### Benefits of LM Studio Validation

- **Better accuracy**: AI-powered question validation
- **Error correction**: Fixes OCR errors in extracted text
- **Enhanced classification**: More accurate topic assignment
- **Quality reasoning**: Provides explanations for decisions

### Without LM Studio

- Still works with basic validation
- Uses keyword-based classification
- Faster processing
- Good results for most cases

## Troubleshooting

### Common Issues

1. **No questions extracted**:

   - Check if PDFs contain text (not just images)
   - Lower the confidence threshold
   - Check logs for specific errors

2. **LM Studio connection failed**:

   - Ensure LM Studio is running
   - Check if model is loaded
   - Verify port 1234 is accessible
   - Use `--no-lm-validation` to skip

3. **Low confidence scores**:
   - Check PDF quality
   - Adjust confidence threshold
   - Review question filtering criteria

### Logs

Check `outputs/logs/extraction.log` for detailed information about the extraction process.

## Performance Tips

1. **For faster processing**: Use `--no-lm-validation`
2. **For better accuracy**: Ensure LM Studio is running
3. **For large datasets**: Use `--max-questions` to limit per PDF
4. **For debugging**: Check logs and adjust confidence thresholds

## Contributing

Feel free to contribute by:

- Adding new PSLE math topics
- Improving question filtering
- Enhancing LM Studio integration
- Adding new output formats

## License

This project is designed for educational purposes in Singapore's PSLE Math curriculum.
