"""
ai_analyzer.py
All Groq API interactions for AI CareerForge.
"""

import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

MODEL = "llama-3.3-70b-versatile"


def _call_gemini(prompt: str) -> str:
    """Low-level call to Groq, returns raw text."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


def _extract_json(text: str) -> dict | list:
    """Strip markdown fences and parse JSON from Gemini response."""
    cleaned = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    return json.loads(cleaned)


# ─────────────────────────────────────────────
# Resume Analysis
# ─────────────────────────────────────────────

def analyze_resume(resume_text: str, role: str) -> dict:
    """
    Analyze resume text and return structured feedback.
    Returns dict with: ats_score, skills_found, missing_keywords,
    resume_quality_score, project_impact_score, communication_clarity_score,
    overall_resume_score, strengths, weaknesses, recruiter_comments, feedback_summary
    """
    prompt = f"""
You are a senior technical recruiter evaluating a resume for a {role} position.

Analyze the following resume and return ONLY a JSON object (no markdown fences) with exactly these keys:

{{
  "ats_score": <0-100 integer, how ATS-friendly the resume is>,
  "skills_found": [<list of technical skills detected>],
  "missing_keywords": [<list of important keywords missing for a {role}>],
  "resume_quality_score": <0-100 integer, formatting, structure, clarity>,
  "project_impact_score": <0-100 integer, quality and impact of projects described>,
  "communication_clarity_score": <0-100 integer, how clearly achievements are written>,
  "overall_resume_score": <0-100 integer, weighted average>,
  "strengths": [<2-4 specific strengths>],
  "weaknesses": [<2-4 specific weaknesses>],
  "recruiter_comments": "<2-3 sentence recruiter-style assessment>",
  "feedback_summary": "<3-4 sentence overall feedback with actionable advice>"
}}

RESUME TEXT:
{resume_text[:3000]}
"""
    raw = _call_gemini(prompt)
    try:
        return _extract_json(raw)
    except Exception:
        # Fallback mock if Gemini fails
        return {
            "ats_score": 62,
            "skills_found": ["Python", "JavaScript", "SQL"],
            "missing_keywords": ["Docker", "CI/CD", "REST API"],
            "resume_quality_score": 65,
            "project_impact_score": 60,
            "communication_clarity_score": 58,
            "overall_resume_score": 62,
            "strengths": ["Clear project section", "Relevant skills listed"],
            "weaknesses": ["Missing quantified achievements", "No GitHub link"],
            "recruiter_comments": "Decent resume with room for improvement. Quantify your impact.",
            "feedback_summary": "Focus on adding metrics to your projects and including key DevOps keywords."
        }


# ─────────────────────────────────────────────
# Technical Questions
# ─────────────────────────────────────────────

FALLBACK_QUESTIONS = {
    "Web Developer": [
        {"question": "What is the difference between `let`, `var`, and `const` in JavaScript?",
         "options": ["No difference", "Scope and mutability differ", "Only `var` is modern", "All are block-scoped"],
         "answer": 1, "explanation": "`let` and `const` are block-scoped; `var` is function-scoped. `const` is immutable."},
        {"question": "What does CSS `z-index` control?",
         "options": ["Font size", "Element stacking order", "Animation speed", "Margin spacing"],
         "answer": 1, "explanation": "`z-index` sets the stacking order of positioned elements."},
        {"question": "Which HTTP method is idempotent and used to update a resource?",
         "options": ["POST", "DELETE", "PUT", "PATCH"],
         "answer": 2, "explanation": "PUT replaces a resource fully and is idempotent."},
        {"question": "What is the purpose of `useEffect` in React?",
         "options": ["Render JSX", "Handle side effects", "Manage CSS", "Define routes"],
         "answer": 1, "explanation": "`useEffect` runs side effects like data fetching after render."},
        {"question": "Which CSS property creates a flex container?",
         "options": ["display: block", "display: flex", "float: left", "position: relative"],
         "answer": 1, "explanation": "`display: flex` enables flexbox layout on the container."},
    ],
    "AI/ML": [
        {"question": "What does overfitting mean in machine learning?",
         "options": ["Model underfits training data", "Model memorizes training data and fails on new data", "Model is too simple", "Loss is zero"],
         "answer": 1, "explanation": "Overfitting is when a model learns noise, not the pattern."},
        {"question": "Which activation function is most common in hidden layers of deep networks?",
         "options": ["Sigmoid", "Tanh", "ReLU", "Softmax"],
         "answer": 2, "explanation": "ReLU is preferred for hidden layers due to its gradient properties."},
        {"question": "What is the purpose of a validation set?",
         "options": ["Final evaluation", "Hyperparameter tuning without touching the test set", "Data augmentation", "Feature selection"],
         "answer": 1, "explanation": "Validation set helps tune hyperparameters while keeping the test set unseen."},
        {"question": "What does gradient descent minimize?",
         "options": ["Accuracy", "Loss function", "Number of parameters", "Learning rate"],
         "answer": 1, "explanation": "Gradient descent iteratively reduces the loss by updating parameters."},
        {"question": "Which algorithm is a supervised classification method?",
         "options": ["K-Means", "DBSCAN", "Random Forest", "PCA"],
         "answer": 2, "explanation": "Random Forest is a supervised ensemble method for classification and regression."},
    ],
    "Data Analyst": [
        {"question": "Which SQL clause filters rows AFTER aggregation?",
         "options": ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
         "answer": 1, "explanation": "HAVING filters groups after GROUP BY; WHERE filters before aggregation."},
        {"question": "What does a box plot display?",
         "options": ["Trend over time", "Distribution, median, and outliers", "Correlation", "Frequency histogram"],
         "answer": 1, "explanation": "Box plots show quartiles, median, and potential outliers."},
        {"question": "In Pandas, what does `df.groupby('col').mean()` do?",
         "options": ["Sorts by col", "Groups rows by col and computes the mean of each group", "Drops NaN values", "Filters rows"],
         "answer": 1, "explanation": "groupby aggregates rows by the specified column."},
        {"question": "What is the Pearson correlation coefficient range?",
         "options": ["0 to 1", "-1 to 0", "-1 to 1", "0 to 100"],
         "answer": 2, "explanation": "Pearson r ranges from -1 (perfect negative) to 1 (perfect positive)."},
        {"question": "Which chart is best for showing part-to-whole relationships?",
         "options": ["Line chart", "Scatter plot", "Pie/Donut chart", "Histogram"],
         "answer": 2, "explanation": "Pie and donut charts visualize proportions within a whole."},
    ],
    "UI/UX": [
        {"question": "What is the primary goal of UX design?",
         "options": ["Make things look pretty", "Optimize user experience and usability", "Write code faster", "Increase server speed"],
         "answer": 1, "explanation": "UX focuses on user satisfaction, efficiency, and accessibility."},
        {"question": "What does 'information architecture' mean in UX?",
         "options": ["Server architecture", "Organizing and structuring content for users", "CSS layout", "Font choices"],
         "answer": 1, "explanation": "IA is the structural design of information to support usability."},
        {"question": "Which heuristic states that users should always know where they are?",
         "options": ["Error prevention", "Visibility of system status", "Aesthetic design", "Flexibility"],
         "answer": 1, "explanation": "Nielsen's 'Visibility of System Status' keeps users informed."},
        {"question": "What is a wireframe?",
         "options": ["Final design mockup", "Low-fidelity structural layout sketch", "Prototype with interactions", "Production-ready HTML"],
         "answer": 1, "explanation": "Wireframes are low-fi layouts showing structure without visual design."},
        {"question": "What does 'affordance' mean in design?",
         "options": ["Cost of design tools", "A design element that hints at its function", "Animation speed", "Color theory"],
         "answer": 1, "explanation": "Affordance is the perceived action a UI element suggests (e.g., a button looks clickable)."},
    ],
}


def generate_questions(role: str) -> list:
    """Generate 5 adaptive MCQ questions for the given role via Gemini."""
    prompt = f"""
Generate exactly 5 multiple-choice interview questions for a {role} candidate.
Return ONLY a JSON array (no markdown) with this exact structure for each item:
[
  {{
    "question": "<question text>",
    "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
    "answer": <0-3 index of correct answer>,
    "explanation": "<1-sentence explanation of correct answer>"
  }}
]
Mix difficulty: 2 easy, 2 medium, 1 hard. Make questions practical and role-relevant.
"""
    try:
        raw = _call_gemini(prompt)
        questions = _extract_json(raw)
        if isinstance(questions, list) and len(questions) >= 5:
            return questions[:5]
    except Exception:
        pass
    return FALLBACK_QUESTIONS.get(role, FALLBACK_QUESTIONS["Web Developer"])


# ─────────────────────────────────────────────
# Communication Analysis
# ─────────────────────────────────────────────

def analyze_communication(intro_text: str, role: str) -> dict:
    """
    Evaluate self-introduction for confidence, clarity, structure, and role relevance.
    Returns dict with scores and feedback.
    """
    prompt = f"""
You are an expert communication coach evaluating a candidate's self-introduction for a {role} position.

Analyze the following self-introduction and return ONLY a JSON object:
{{
  "confidence_score": <0-100>,
  "clarity_score": <0-100>,
  "structure_score": <0-100>,
  "relevance_score": <0-100>,
  "overall_comm_score": <0-100, weighted average>,
  "positives": [<2-3 strong points>],
  "improvements": [<2-3 specific suggestions>],
  "rewritten_sample": "<A 2-sentence improved version of the intro>"
}}

SELF-INTRODUCTION:
{intro_text[:1500]}
"""
    raw = _call_gemini(prompt)
    try:
        return _extract_json(raw)
    except Exception:
        return {
            "confidence_score": 65,
            "clarity_score": 60,
            "structure_score": 62,
            "relevance_score": 58,
            "overall_comm_score": 62,
            "positives": ["Clear mention of background", "Shows enthusiasm"],
            "improvements": ["Be more specific about achievements", "Mention role alignment"],
            "rewritten_sample": "I'm a passionate developer with hands-on experience in Python and React, having built 3 deployed projects. I'm seeking a role where I can contribute to scalable systems and grow into a senior engineer."
        }


# ─────────────────────────────────────────────
# Roadmap Generation
# ─────────────────────────────────────────────

def generate_roadmap(scores: dict, role: str) -> dict:
    """
    Generate a personalized improvement roadmap based on scores.
    """
    prompt = f"""
You are an AI career coach. Based on these interview readiness scores for a {role} candidate:
- Resume Score: {scores.get('resume_score', 60)}/100
- Technical Score: {scores.get('tech_score', 60)}/100
- Communication Score: {scores.get('comm_score', 60)}/100
- Overall Score: {scores.get('final_score', 60)}/100

Generate a personalized 4-week roadmap as ONLY a JSON object:
{{
  "skill_gaps": [<3-5 specific skills to develop>],
  "week1": {{"focus": "<topic>", "tasks": [<2-3 action items>]}},
  "week2": {{"focus": "<topic>", "tasks": [<2-3 action items>]}},
  "week3": {{"focus": "<topic>", "tasks": [<2-3 action items>]}},
  "week4": {{"focus": "<topic>", "tasks": [<2-3 action items>]}},
  "top_resources": [
    {{"name": "<resource name>", "url": "<URL>", "type": "<Free/Paid>"}}
  ],
  "quick_wins": [<3 things to do this week for immediate improvement>]
}}
"""
    raw = _call_gemini(prompt)
    try:
        return _extract_json(raw)
    except Exception:
        return {
            "skill_gaps": ["System design", "Data structures", "Behavioral interviews", "Portfolio projects"],
            "week1": {"focus": "Resume & Portfolio", "tasks": ["Add 2 GitHub projects", "Quantify achievements", "Add LinkedIn"]},
            "week2": {"focus": "Technical Skills", "tasks": ["Complete DSA on LeetCode", "Build a REST API", "Learn Docker basics"]},
            "week3": {"focus": "Mock Interviews", "tasks": ["Pramp mock interview", "Record and review self-intro", "Practice STAR method"]},
            "week4": {"focus": "Apply & Iterate", "tasks": ["Apply to 10 jobs", "Follow up on applications", "Update resume with feedback"]},
            "top_resources": [
                {"name": "LeetCode", "url": "https://leetcode.com", "type": "Free/Paid"},
                {"name": "Pramp", "url": "https://pramp.com", "type": "Free"},
                {"name": "roadmap.sh", "url": "https://roadmap.sh", "type": "Free"},
            ],
            "quick_wins": ["Add metrics to 2 resume bullets", "Push a project to GitHub today", "Record a 60-second self-intro video"]
        }
