# PSLE Math Paper Generator

An AI-powered system for generating Singapore PSLE Mathematics practice papers using LM Studio and DeepSeek-OCR for question extraction.

## 🎯 Features

- 📚 **PSLE-Focused**: Specialized for Singapore PSLE Mathematics curriculum
- 🤖 **AI-Generated Questions**: Creates original math questions using local AI
- 🔍 **DeepSeek-OCR Extraction**: Extract questions from scanned papers with high accuracy
- 📊 **Multiple Interfaces**: Streamlit web app and CLI for different use cases
- 🎯 **Topic-Focused Papers**: Generate papers focused on specific math topics
- 📈 **Difficulty Control**: Adjustable difficulty levels (easy, medium, hard)
- 💾 **Export Options**: Save papers in text and JSON formats
- 🚀 **Easy Setup**: Simple installation and configuration

## 🚀 Quick Start

### 1. Extract Questions from Existing Papers (NEW!)

```bash
# Extract questions using DeepSeek-OCR
cd deepseek_ocr
python run_extraction.py --sample-dir ../SampleSchoolPapers --min-confidence 85 --topic-summary
```

### 2. Generate New Practice Papers

```bash
# Start PSLE Streamlit interface
streamlit run psle_streamlit_app.py

# Or use CLI interface
python psle_cli.py interactive
```

## 📁 Project Structure

```
├── deepseek_ocr/              # DeepSeek-OCR question extraction
│   ├── src/                   # Source code
│   ├── config/                # Configuration
│   ├── outputs/               # Extracted questions and analysis
│   └── run_extraction.py      # Main extraction script
├── psle_math_agent.py         # Core PSLE math generation agent
├── psle_interface.py          # High-level PSLE interface
├── psle_streamlit_app.py      # Streamlit web interface
├── psle_cli.py               # Command line interface
├── ai_client.py              # AI client for LM Studio
├── config.py                 # Configuration settings
└── requirements.txt          # Python dependencies
```

## 🔧 Prerequisites

1. **LM Studio**: Download and install from [lmstudio.ai](https://lmstudio.ai/)
2. **Python 3.8+**: Make sure you have Python installed
3. **AI Model**: Load Qwen2.5-Math-7B-Instruct in LM Studio
4. **GPU**: RTX 3060 or better (recommended for DeepSeek-OCR)

## 📦 Installation

1. **Clone or download this project**
2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure LM Studio**:
   - Open LM Studio
   - Load Qwen2.5-Math-7B-Instruct model
   - Go to the "Developer" tab
   - Start the server (usually runs on `http://localhost:1234/v1`)

## 🎯 Usage Examples

### Extract Questions from Scanned Papers

```bash
cd deepseek_ocr
python run_extraction.py --sample-dir ../SampleSchoolPapers --min-confidence 85 --topic-summary
```

This will:

- Extract questions from all PDF files in SampleSchoolPapers
- Classify questions by PSLE math topics
- Validate questions using LM Studio
- Generate analysis reports
- Save organized outputs

### Generate New Practice Papers

```python
from psle_interface import psle_interface
import asyncio

async def generate_paper():
    paper = await psle_interface.generate_practice_paper(
        num_questions=30,
        difficulty_focus="exam_simulation",
        paper_title="PSLE Practice Paper 2024"
    )

    # Export the paper
    exports = psle_interface.export_paper_formats(paper)
    print(f"Paper saved as: {exports['text']}")

asyncio.run(generate_paper())
```

### Generate Topic-Focused Paper

```python
async def generate_algebra_paper():
    paper = await psle_interface.generate_topic_focused_paper(
        topic="algebra",
        num_questions=15,
        difficulty="medium"
    )
    return paper
```

## 📚 PSLE Math Topics Covered

The system generates questions for all major PSLE Mathematics topics:

- **Numbers**: Whole numbers, fractions, decimals, percentage, ratio
- **Algebra**: Basic algebra, equations, patterns
- **Geometry**: Area, perimeter, volume, angles, shapes
- **Measurement**: Length, mass, time, capacity, temperature
- **Data Analysis**: Graphs, charts, statistics, probability
- **Problem Solving**: Word problems, real-world applications

## ⚙️ Configuration

### Environment Variables

Create a `.env` file (copy from `env_example.txt`) to customize settings:

```env
# LM Studio Configuration
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=not-needed
MODEL_NAME=local-model

# AI Configuration
MAX_TOKENS=2048
TEMPERATURE=0.7
TOP_P=0.9
```

### DeepSeek-OCR Configuration

Edit `deepseek_ocr/config/deepseek_config.py` to customize:

- Model settings and parameters
- Processing thresholds
- PSLE topic definitions
- Output paths and formats

## 🔍 Troubleshooting

### DeepSeek-OCR Issues

1. **Model Download**: First run downloads ~6GB model (one-time)
2. **GPU Memory**: Ensure sufficient VRAM for your GPU
3. **Dependencies**: Run `pip install -r requirements.txt` if issues occur

### LM Studio Issues

1. **Check LM Studio**: Ensure the server is running in LM Studio
2. **Verify URL**: Default is `http://localhost:1234/v1`
3. **Check Model**: Make sure Qwen2.5-Math-7B-Instruct is loaded

### Question Generation Issues

1. **Model Quality**: Use Qwen2.5-Math-7B-Instruct for best results
2. **System Prompt**: The PSLE-specific prompt is optimized for math education
3. **Temperature Settings**: Lower temperature (0.3-0.7) for more consistent questions

## 🎓 Training Data Preparation

The DeepSeek-OCR extraction creates perfect training data:

1. **Topic-based filtering**: Use topic summary to focus on specific topics
2. **Quality assurance**: High confidence scores ensure clean training data
3. **Structured format**: JSON format ready for model training
4. **Comprehensive metadata**: Topic, difficulty, and type classifications

## 🚀 Next Steps

1. **Extract Questions**: Use DeepSeek-OCR to extract questions from existing papers
2. **Review Results**: Check organized output files and analysis
3. **Generate Papers**: Create new PSLE papers with your trained model
4. **Train Model**: Use extracted questions to train your new model

## 📄 License

This project is open source and available under the MIT License.
