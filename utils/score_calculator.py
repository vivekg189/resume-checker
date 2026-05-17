"""
score_calculator.py
Weighted scoring logic and readiness level classification.
"""

def calculate_final_score(resume_score: float, tech_score: float, comm_score: float) -> float:
    """
    Weighted final score:
      40% Resume + 40% Technical + 20% Communication
    Returns a value 0-100.
    """
    score = (resume_score * 0.40) + (tech_score * 0.40) + (comm_score * 0.20)
    return round(min(max(score, 0), 100), 1)


def get_readiness_level(score: float) -> dict:
    """Return readiness tier, label color, and emoji."""
    if score >= 75:
        return {
            "level": "Interview Ready",
            "color": "#00ff9d",
            "gradient": "from-emerald-400 to-cyan-400",
            "emoji": "🚀",
            "description": "You're well-prepared and competitive for interviews."
        }
    elif score >= 50:
        return {
            "level": "Intermediate",
            "color": "#f59e0b",
            "gradient": "from-yellow-400 to-orange-400",
            "emoji": "⚡",
            "description": "Good foundation — a few targeted improvements will make you interview-ready."
        }
    else:
        return {
            "level": "Beginner",
            "color": "#ef4444",
            "gradient": "from-red-400 to-pink-500",
            "emoji": "🌱",
            "description": "Early stage — follow your personalized roadmap to level up fast."
        }


def get_percentile(score: float, role: str) -> str:
    """Generate a benchmark comparison string."""
    # Simulated distribution — in production this would query the DB average
    benchmarks = {
        "Web Developer": 55,
        "AI/ML": 52,
        "Data Analyst": 57,
        "UI/UX": 54,
    }
    avg = benchmarks.get(role, 55)
    if score > avg:
        pct = int(((score - avg) / (100 - avg)) * 50 + 50)
        return f"You score higher than {pct}% of {role} candidates on our platform."
    else:
        pct = int((score / avg) * 50)
        return f"You're in the top {100 - pct}% — keep going to reach the interview-ready tier."


def calculate_portfolio_score(resume_text: str) -> float:
    """
    Derive a portfolio presence score from resume text.
    Looks for GitHub, LinkedIn, portfolio links, and project sections.
    """
    score = 30.0  # base
    text_lower = resume_text.lower()

    if "github.com" in text_lower or "github" in text_lower:
        score += 25
    if "linkedin.com" in text_lower or "linkedin" in text_lower:
        score += 15
    if any(kw in text_lower for kw in ["portfolio", "website", "deployed", "live demo"]):
        score += 15
    project_count = text_lower.count("project")
    score += min(project_count * 3, 15)

    return round(min(score, 100), 1)
