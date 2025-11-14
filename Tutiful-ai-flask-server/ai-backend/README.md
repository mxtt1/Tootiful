# AI Backend - Practice Paper Generator

Flask-based backend for generating AI-powered practice papers.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Ensure the `Tutiful_AI` pipeline folder exists in the repo root.**  
   The Flask server dynamically adds `../Tutiful_AI` to `PYTHONPATH`, so no extra packaging is required.

3. **Configure environment variables (`.env`):**
   ```text
   SUPABASE_URL=<your-supabase-project-url>
   SUPABASE_KEY=<service-role-or-anon-key>
   EXPO_ACCESS_TOKEN=<expo-access-token-if-needed>
   LM_STUDIO_BASE_URL=http://127.0.0.1:1234
   LM_STUDIO_MODEL=mistral-7b-instruct-v0.3
   LM_STUDIO_TIMEOUT=180
   ```

## Run

```bash
python app.py
```

Server runs on `http://localhost:5000`

## What's Included

- `paper_generation_service.py` wraps `Tutiful_AI/final_working_generator.py`, normalises requested topics, and enforces the Primary 6 Math constraint.
- `Tutiful_AI/` contains the cleaned dataset, LM Studio client, and PDF formatter needed to create the paper.
- Environment variables let you point to any LM Studio host/model without editing the pipeline.

## API Endpoints

### POST `/generate-paper`
Request a new practice paper generation.

**Request Body:**
```json
{
  "tutorId": "uuid",
  "subjectId": "uuid", 
  "topics": "comma-separated topics",
  "expoPushToken": "ExponentPushToken[...]" (optional)
}
```

**Response:** 202 Accepted
```json
{
  "success": true,
  "message": "Paper generation request queued successfully",
  "paperId": "uuid",
  "status": "pending"
}
```

## How It Works

1. **POST `/generate-paper`** validates the request (Primary 6 Math only), normalises topics, persists the pending row in Supabase, and enqueues the job.
2. **Background worker** processes the queue sequentially so long-running generations never block new HTTP requests.
3. **For each job** the worker:
   - Marks the row as `processing`.
   - Calls `generate_primary6_math_pdf()` which orchestrates the Tutiful_AI generator + PDF formatter.
   - Uploads the rendered PDF to Supabase Storage and stores the public download URL.
   - Notifies the tutor via Expo push once the paper is ready.
4. **On any error** `mark_paper_failed` flips the row to `failed` and (optionally) pushes an error notification to the tutor.

## Architecture

- **Queue-based processing:** Prevents blocking and allows concurrent requests
- **Background worker:** Separate thread processes papers asynchronously
- **Automatic retries:** Failed notifications don't crash the system
- **Status tracking:** Database always reflects current state
