"""
app.py — AI CareerForge Flask Backend
"""

import os
import json
import uuid
import sqlite3
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from utils.resume_parser import parse_resume
from utils.ai_analyzer import analyze_resume, generate_questions, analyze_communication, generate_roadmap
from utils.score_calculator import calculate_final_score, get_readiness_level, get_percentile, calculate_portfolio_score

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "careerforge_secret")
CORS(app)

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
UPLOAD_FOLDER = os.path.join("static", "uploads")
ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}
DB_PATH = "careerforge.db"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB


# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            role TEXT,
            resume_score REAL,
            tech_score REAL,
            comm_score REAL,
            portfolio_score REAL,
            final_score REAL,
            readiness_level TEXT,
            resume_data TEXT,
            comm_data TEXT,
            roadmap_data TEXT,
            questions_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


init_db()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ──────────────────────────────────────────────
# Page Routes
# ──────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze")
def analyze():
    return render_template("analyze.html")


@app.route("/dashboard")
def dashboard():
    session_id = request.args.get("session_id", "")
    return render_template("dashboard.html", session_id=session_id)


# ──────────────────────────────────────────────
# API: Upload & Analyze Resume
# ──────────────────────────────────────────────

@app.route("/api/upload-resume", methods=["POST"])
def upload_resume():
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["resume"]
    role = request.form.get("role", "Web Developer")

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF and DOCX files are allowed"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    try:
        resume_text = parse_resume(filepath)
    except Exception as e:
        return jsonify({"error": f"Could not parse resume: {str(e)}"}), 500
    finally:
        # Clean up uploaded file
        try:
            os.remove(filepath)
        except Exception:
            pass

    # Analyze with Gemini
    try:
        resume_data = analyze_resume(resume_text, role)
    except Exception as e:
        return jsonify({"error": f"AI analysis failed: {str(e)}"}), 500

    portfolio_score = calculate_portfolio_score(resume_text)

    # Create a session
    session_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (id, role, resume_score, portfolio_score, resume_data) VALUES (?, ?, ?, ?, ?)",
        (session_id, role, resume_data.get("overall_resume_score", 60),
         portfolio_score, json.dumps(resume_data))
    )
    conn.commit()
    conn.close()

    return jsonify({
        "session_id": session_id,
        "resume_score": resume_data.get("overall_resume_score", 60),
        "portfolio_score": portfolio_score,
        "ats_score": resume_data.get("ats_score", 60),
        "skills_found": resume_data.get("skills_found", []),
        "missing_keywords": resume_data.get("missing_keywords", []),
        "strengths": resume_data.get("strengths", []),
        "weaknesses": resume_data.get("weaknesses", []),
        "recruiter_comments": resume_data.get("recruiter_comments", ""),
        "feedback_summary": resume_data.get("feedback_summary", ""),
    })


# ──────────────────────────────────────────────
# API: Get Quiz Questions
# ──────────────────────────────────────────────

@app.route("/api/get-questions", methods=["GET"])
def get_questions():
    role = request.args.get("role", "Web Developer")
    session_id = request.args.get("session_id", "")

    try:
        questions = generate_questions(role)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Store questions in DB
    if session_id:
        conn = get_db()
        conn.execute("UPDATE sessions SET questions_data=? WHERE id=?",
                     (json.dumps(questions), session_id))
        conn.commit()
        conn.close()

    # Don't expose correct answers to client
    safe_questions = []
    for q in questions:
        safe_questions.append({
            "question": q["question"],
            "options": q["options"],
            "explanation": q.get("explanation", "")
        })

    return jsonify({"questions": safe_questions, "answers": [q["answer"] for q in questions]})


# ──────────────────────────────────────────────
# API: Submit Quiz
# ──────────────────────────────────────────────

@app.route("/api/submit-quiz", methods=["POST"])
def submit_quiz():
    data = request.get_json()
    session_id = data.get("session_id", "")
    user_answers = data.get("answers", [])
    correct_answers = data.get("correct_answers", [])

    if len(user_answers) != len(correct_answers):
        return jsonify({"error": "Answer count mismatch"}), 400

    correct = sum(1 for u, c in zip(user_answers, correct_answers) if u == c)
    tech_score = round((correct / len(correct_answers)) * 100, 1)

    if session_id:
        conn = get_db()
        conn.execute("UPDATE sessions SET tech_score=? WHERE id=?",
                     (tech_score, session_id))
        conn.commit()
        conn.close()

    return jsonify({
        "tech_score": tech_score,
        "correct": correct,
        "total": len(correct_answers),
        "percentage": tech_score
    })


# ──────────────────────────────────────────────
# API: Submit Communication
# ──────────────────────────────────────────────

@app.route("/api/submit-intro", methods=["POST"])
def submit_intro():
    data = request.get_json()
    session_id = data.get("session_id", "")
    intro_text = data.get("intro_text", "")
    role = data.get("role", "Web Developer")

    if len(intro_text.strip()) < 20:
        return jsonify({"error": "Introduction too short"}), 400

    try:
        comm_data = analyze_communication(intro_text, role)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    comm_score = comm_data.get("overall_comm_score", 60)

    if session_id:
        conn = get_db()
        conn.execute("UPDATE sessions SET comm_score=?, comm_data=? WHERE id=?",
                     (comm_score, json.dumps(comm_data), session_id))
        conn.commit()
        conn.close()

    return jsonify({
        "comm_score": comm_score,
        "confidence_score": comm_data.get("confidence_score", 60),
        "clarity_score": comm_data.get("clarity_score", 60),
        "positives": comm_data.get("positives", []),
        "improvements": comm_data.get("improvements", []),
        "rewritten_sample": comm_data.get("rewritten_sample", ""),
    })


# ──────────────────────────────────────────────
# API: Finalize & Generate Results
# ──────────────────────────────────────────────

@app.route("/api/finalize", methods=["POST"])
def finalize():
    data = request.get_json()
    session_id = data.get("session_id", "")

    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    resume_score = row["resume_score"] or 60
    tech_score = row["tech_score"] or 60
    comm_score = row["comm_score"] or 60
    role = row["role"] or "Web Developer"

    final_score = calculate_final_score(resume_score, tech_score, comm_score)
    readiness = get_readiness_level(final_score)
    percentile = get_percentile(final_score, role)

    scores = {
        "resume_score": resume_score,
        "tech_score": tech_score,
        "comm_score": comm_score,
        "final_score": final_score,
    }

    try:
        roadmap = generate_roadmap(scores, role)
    except Exception:
        roadmap = {}

    conn.execute("""
        UPDATE sessions SET final_score=?, readiness_level=?, roadmap_data=? WHERE id=?
    """, (final_score, readiness["level"], json.dumps(roadmap), session_id))
    conn.commit()
    conn.close()

    return jsonify({
        "session_id": session_id,
        "final_score": final_score,
        "readiness": readiness,
        "percentile": percentile,
        "roadmap": roadmap,
    })


# ──────────────────────────────────────────────
# API: Get Full Results
# ──────────────────────────────────────────────

@app.route("/api/results/<session_id>", methods=["GET"])
def get_results(session_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Session not found"}), 404

    resume_data = json.loads(row["resume_data"] or "{}")
    comm_data = json.loads(row["comm_data"] or "{}")
    roadmap_data = json.loads(row["roadmap_data"] or "{}")

    final_score = row["final_score"] or 0
    role = row["role"] or "Web Developer"

    return jsonify({
        "session_id": session_id,
        "role": role,
        "resume_score": row["resume_score"] or 0,
        "tech_score": row["tech_score"] or 0,
        "comm_score": row["comm_score"] or 0,
        "portfolio_score": row["portfolio_score"] or 0,
        "final_score": final_score,
        "readiness": get_readiness_level(final_score),
        "percentile": get_percentile(final_score, role),
        "resume_data": resume_data,
        "comm_data": comm_data,
        "roadmap": roadmap_data,
        "skills_found": resume_data.get("skills_found", []),
        "missing_keywords": resume_data.get("missing_keywords", []),
        "ats_score": resume_data.get("ats_score", 0),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
