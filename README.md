# Career Readiness System — Flask + Anthropic

An AI-powered career readiness tool that assesses your skills through adaptive questioning and generates a personalized learning roadmap.

## Project Structure

```
career_readiness/
├── app.py                  # Flask app + all API routes
├── requirements.txt
├── .env.example
├── templates/
│   ├── base.html           # Shared layout + API key modal
│   ├── index.html          # Page 1: Input
│   ├── assessment.html     # Page 2: Skill questions
│   └── results.html        # Page 3: Scores + learning path
└── static/
    ├── css/style.css       # All styles
    └── js/
        ├── main.js         # Shared helpers + API key logic
        ├── input.js        # Page 1 logic
        ├── assessment.js   # Page 2 logic
        └── results.js      # Page 3 logic
```

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

Or export directly:
```bash
export GEMINI_API_KEY=sk-ant-your-key-here
```

### 3. Run

```bash
python app.py
```

Visit: http://localhost:5000

## API Key Options

**Option A — Environment variable (recommended for production):**
Set `ANTHROPIC_API_KEY` in your `.env` file.

**Option B — In-app (per session):**
Click the ⚙ API Key button in the header and paste your key. It's stored in the Flask session for that browser tab only.

## How It Works

| Module | Route | Description |
|--------|-------|-------------|
| Input | `GET /` | Resume upload, manual skills, role selection |
| Skill Extract | `POST /api/extract-skills` | Claude parses resume text into skills |
| Role Skills | `GET /api/role-skills/<role>` | Returns required skills for preset roles |
| Question Gen | `POST /api/generate-questions` | Claude creates basic + advanced MCQs |
| Assessment | `GET /assessment` | Presents questions one by one |
| Score Compute | `POST /api/compute-results` | Calculates readiness score + gap analysis |
| Learning Path | `POST /api/generate-learning-path` | Claude generates prioritized roadmap |
| Results | `GET /results` | Displays report + learning path |

## Customization

- Add more roles in `ROLE_SKILLS` dict in `app.py`
- Adjust `max_tokens` in each Claude call for longer/shorter responses
- Add a database (SQLite/PostgreSQL) to persist user sessions and results
