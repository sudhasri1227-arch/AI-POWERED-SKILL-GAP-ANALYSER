import os
import json
from io import BytesIO

from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PyPDF2 import PdfReader
from docx import Document

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "career-readiness-secret-2024")

ROLE_SKILLS = {
    "frontend": [
        "HTML", "CSS", "JavaScript", "React", "TypeScript", "Git",
        "REST APIs", "Responsive Design", "Testing", "Performance Optimization"
    ],
    "backend": [
        "Node.js", "Python", "SQL", "REST APIs", "Authentication", "Docker",
        "Git", "Database Design", "Testing", "Security"
    ],
    "fullstack": [
        "JavaScript", "React", "Node.js", "SQL", "REST APIs", "Git",
        "Docker", "TypeScript", "Testing", "CI/CD"
    ],
    "data-scientist": [
        "Python", "Statistics", "Machine Learning", "SQL", "Data Visualization",
        "Pandas", "NumPy", "Feature Engineering", "Model Evaluation", "Communication"
    ],
    "ml-engineer": [
        "Python", "Machine Learning", "Deep Learning", "MLOps", "SQL", "Docker",
        "Git", "Feature Engineering", "Model Deployment", "Cloud Platforms"
    ],
    "devops": [
        "Linux", "Docker", "Kubernetes", "CI/CD", "Cloud Platforms", "Terraform",
        "Monitoring", "Git", "Bash Scripting", "Security"
    ],
    "product-manager": [
        "Product Strategy", "User Research", "Data Analysis", "Roadmapping", "Agile",
        "Stakeholder Management", "SQL basics", "Wireframing", "A/B Testing", "Communication"
    ],
    "ux-designer": [
        "Figma", "User Research", "Wireframing", "Prototyping", "Usability Testing",
        "Information Architecture", "Visual Design", "Design Systems", "HTML/CSS basics", "Communication"
    ]
}


def get_client():
    key = (
        session.get("api_key")
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )

    if not key:
        raise ValueError("No Gemini API key configured.")

    return genai.Client(api_key=key)


def clean_json_text(text: str) -> str:
    if not text:
        return ""
    return text.replace("```json", "").replace("```", "").strip()


def gemini_generate(client, system_prompt: str, user_prompt: str, max_tokens: int = 1200) -> str:
    full_prompt = f"{system_prompt}\n\n{user_prompt}"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=full_prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=max_tokens
        )
    )

    text = getattr(response, "text", None)
    if not text:
        raise ValueError("Gemini returned an empty response.")

    return text.strip()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/assessment")
def assessment():
    return render_template("assessment.html")


@app.route("/results")
def results():
    return render_template("results.html")


@app.route("/test-gemini")
def test_gemini():
    try:
        client = get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say hello in one short sentence."
        )
        return response.text
    except Exception as e:
        return f"Gemini test failed: {str(e)}", 500


@app.route("/api/set-key", methods=["POST"])
def set_key():
    data = request.get_json() or {}
    key = data.get("api_key", "").strip()

    if not key:
        return jsonify({"error": "Gemini API key is required"}), 400

    session["api_key"] = key
    return jsonify({"success": True})


@app.route("/api/role-skills/<role>")
def get_role_skills(role):
    return jsonify({"skills": ROLE_SKILLS.get(role, [])})


@app.route("/api/extract-skills", methods=["POST"])
def extract_skills():
    data = request.get_json() or {}
    resume_text = data.get("resume_text", "")[:4000]

    if not resume_text.strip():
        return jsonify({"skills": []})

    prompt = f"""
Resume text:
{resume_text}

Extract technical and professional skills from this resume.

Return ONLY a JSON array of skill name strings.
No markdown.
No explanation.
Example:
["Python", "SQL", "React"]
"""

    try:
        client = get_client()
        text = gemini_generate(
            client,
            "You extract skills from resume text and return only valid JSON arrays.",
            prompt,
            max_tokens=800
        )

        text = clean_json_text(text)
        skills = json.loads(text)

        if not isinstance(skills, list):
            raise ValueError("Skill extraction did not return a JSON array.")

        cleaned = []
        for s in skills:
            skill = str(s).strip()
            if skill and skill not in cleaned:
                cleaned.append(skill)

        return jsonify({"skills": cleaned[:12]})

    except Exception as e:
        return jsonify({"error": str(e), "skills": []}), 500


@app.route("/api/extract-skills-file", methods=["POST"])
def extract_skills_file():
    if "resume" not in request.files:
        return jsonify({"error": "No resume file uploaded", "skills": []}), 400

    file = request.files["resume"]
    if not file or not file.filename:
        return jsonify({"error": "Empty file", "skills": []}), 400

    filename = file.filename.lower()
    resume_text = ""

    try:
        if filename.endswith(".txt"):
            resume_text = file.read().decode("utf-8", errors="ignore")

        elif filename.endswith(".pdf"):
            pdf = PdfReader(BytesIO(file.read()))
            pages = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pages.append(page_text)
            resume_text = "\n".join(pages)

        elif filename.endswith(".docx"):
            doc = Document(file)
            resume_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

        else:
            return jsonify({"error": "Only .txt, .pdf, and .docx are supported", "skills": []}), 400

        if not resume_text.strip():
            return jsonify({"error": "Could not extract text from resume", "skills": []}), 400

        client = get_client()
        text = gemini_generate(
            client,
            "You extract technical and professional skills from resume text and return only a valid JSON array.",
            f'Resume text:\n{resume_text[:4000]}\n\nReturn only JSON array. Example: ["Python", "SQL", "React"]',
            max_tokens=800
        )

        text = clean_json_text(text)
        skills = json.loads(text)

        if not isinstance(skills, list):
            raise ValueError("Skill extraction did not return a JSON array.")

        cleaned = []
        for s in skills:
            skill = str(s).strip()
            if skill and skill not in cleaned:
                cleaned.append(skill)

        return jsonify({"skills": cleaned[:12]})

    except Exception as e:
        return jsonify({"error": str(e), "skills": []}), 500


@app.route("/api/generate-questions", methods=["POST"])
def generate_questions():
    data = request.get_json() or {}
    skills = data.get("skills", [])[:6]
    role = data.get("role", "software developer")

    if not skills:
        return jsonify({"error": "No skills provided"}), 400

    role_label = role.replace("-", " ") if role != "custom" else "custom role"

    prompt = f"""
Skills to assess: {', '.join(skills)}
Target role: {role_label}

For each skill generate exactly 2 multiple-choice questions:
- one Basic level
- one Advanced level

Rules:
- exactly 4 options per question
- exactly one correct answer
- practical and clear wording
- suitable for students / beginners to intermediate learners

Return ONLY valid JSON in this format:
{{
  "questions": [
    {{
      "skill": "Python",
      "level": "Basic",
      "question": "What is Python mainly used for?",
      "options": ["A", "B", "C", "D"],
      "correct": 0
    }}
  ]
}}
"""

    try:
        client = get_client()
        text = gemini_generate(
            client,
            "You are a technical interviewer. Return only valid JSON. No markdown. No explanation.",
            prompt,
            max_tokens=2500
        )

        text = clean_json_text(text)
        parsed = json.loads(text)

        if "questions" not in parsed or not isinstance(parsed["questions"], list):
            raise ValueError("Question generation returned invalid JSON structure.")

        return jsonify(parsed)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/generate-learning-path", methods=["POST"])
def generate_learning_path():
    data = request.get_json() or {}
    weak = data.get("weak", [])
    missing = data.get("missing", [])
    role = data.get("role", "software developer")

    to_improve = list(dict.fromkeys(weak + missing))[:8]
    if not to_improve:
        return jsonify({"steps": []})

    role_label = role.replace("-", " ") if role != "custom" else "custom role"

    prompt = f"""
Target role: {role_label}
Skills to improve or learn: {', '.join(to_improve)}

Create a prioritized learning path with 5 to 7 concrete, actionable steps.

Return ONLY valid JSON in this format:
{{
  "steps": [
    {{
      "title": "Step title",
      "description": "What to do and why it matters",
      "duration": "1-2 weeks",
      "type": "Course/Practice/Project/Reading",
      "priority": "High/Medium/Low",
      "resource": "Specific course or resource recommendation"
    }}
  ]
}}
"""

    try:
        client = get_client()
        text = gemini_generate(
            client,
            "You create clear, practical career-learning roadmaps. Return only valid JSON.",
            prompt,
            max_tokens=1800
        )

        text = clean_json_text(text)
        parsed = json.loads(text)

        if "steps" not in parsed or not isinstance(parsed["steps"], list):
            raise ValueError("Learning path generation returned invalid JSON structure.")

        return jsonify(parsed)

    except Exception as e:
        return jsonify({"error": str(e), "steps": []}), 500


@app.route("/api/compute-results", methods=["POST"])
def compute_results():
    data = request.get_json() or {}
    answers = data.get("answers", [])
    role_skills = data.get("role_skills", [])

    skill_scores = {}
    for a in answers:
        skill = a["skill"]
        if skill not in skill_scores:
            skill_scores[skill] = {"basic": None, "advanced": None}
        skill_scores[skill][a["level"].lower()] = a["correct"]

    skill_levels = {}
    for skill, score_data in skill_scores.items():
        if score_data["basic"] is True and score_data["advanced"] is True:
            skill_levels[skill] = {"score": 100, "label": "Expert"}
        elif score_data["basic"] is True:
            skill_levels[skill] = {"score": 65, "label": "Intermediate"}
        elif score_data["advanced"] is True:
            skill_levels[skill] = {"score": 72, "label": "Intermediate"}
        else:
            skill_levels[skill] = {"score": 28, "label": "Beginner"}

    strong = []
    weak = []
    missing = []

    for skill, result in skill_levels.items():
        if result["score"] >= 70:
            strong.append(skill)
        else:
            weak.append(skill)

    for required_skill in role_skills:
        covered = any(
            skill.lower() in required_skill.lower() or required_skill.lower() in skill.lower()
            for skill in skill_levels
        )
        if not covered:
            missing.append(required_skill)

    covered_required = sum(
        1 for required_skill in role_skills
        if any(
            skill.lower() in required_skill.lower() or required_skill.lower() in skill.lower()
            for skill in skill_levels
        )
    )

    coverage_score = (covered_required / len(role_skills) * 50) if role_skills else 50
    prof_scores = [v["score"] for v in skill_levels.values()]
    prof_score = (sum(prof_scores) / len(prof_scores) * 0.5) if prof_scores else 0
    readiness = min(round(coverage_score + prof_score), 97)

    return jsonify({
        "readiness": readiness,
        "skill_levels": skill_levels,
        "strong": strong,
        "weak": weak,
        "missing": missing
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)