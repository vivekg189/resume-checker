# AI CareerForge 🚀

> **AI-powered Interview Readiness Analyzer** that evaluates a student’s interview preparation in under **2 minutes** using Resume Intelligence, Technical Assessment, Communication Analysis, and Personalized Career Guidance.


## 🌟 Overview

AI CareerForge helps students and fresh graduates understand how prepared they are for technical interviews. The platform analyzes resumes, tests technical knowledge, evaluates communication skills, and generates a personalized improvement roadmap — all powered by AI.

Whether you're preparing for placements, internships, or your first developer role, CareerForge provides recruiter-style insights instantly.


# ✨ Features

### 📄 Resume Analysis
- ATS compatibility scoring
- Skill & keyword extraction
- Recruiter-grade AI feedback
- Strengths and improvement suggestions

### 🧠 Technical Quiz
- Adaptive MCQ-based assessments
- Role-specific question sets:
  - Web Development
  - AI/ML
  - Data Analytics
  - UI/UX
- Instant performance evaluation

### 🎤 Communication Scoring
- AI evaluates:
  - Clarity
  - Confidence
  - Professional tone
  - Role alignment

### 💼 Portfolio Detection
- Detects:
  - GitHub links
  - Portfolio websites
  - Project presence
- Measures profile completeness

### 🗺️ Personalized Roadmap
- Generates a 4-week improvement plan
- Suggests:
  - Learning resources
  - Practice goals
  - Quick wins
  - Career milestones

### 📊 Analytics Dashboard
- Interactive radar charts
- Animated progress indicators
- Performance breakdown
- Readiness visualization


# 🧪 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Tailwind CSS, Three.js, Chart.js |
| Backend | Flask (Python) |
| AI Engine | Google Gemini 1.5 Flash |
| Database | SQLite |
| Resume Parsing | PyMuPDF, python-docx |



# ⚙️ Installation & Setup

## 1️⃣ Clone the Repository

```bash
git clone <your-repository-url>
cd AIcareer
```


## 2️⃣ Create Virtual Environment

### Windows
```bash
python -m venv venv
venv\Scripts\activate
```

### macOS/Linux
```bash
python3 -m venv venv
source venv/bin/activate
```


## 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```


## 4️⃣ Configure Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_actual_key_here
FLASK_SECRET_KEY=your_secret_key_here
```

Get your Gemini API key from:
https://aistudio.google.com/app/apikey


## 5️⃣ Run the Application

```bash
python app.py
```

Open your browser and visit:

```bash
http://localhost:5000
```



# 🎯 Scoring System

```text
Final Score = 40% Resume
            + 40% Technical Assessment
            + 20% Communication
```

| Score Range | Level |
|---|---|
| 0 – 49 | Beginner |
| 50 – 74 | Intermediate |
| 75 – 100 | Interview Ready |



# 🔒 Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `FLASK_SECRET_KEY` | Flask session security key |



# 📸 Dashboard Highlights

- Resume ATS Score
- Technical Skill Radar Chart
- Communication Performance Meter
- Career Readiness Percentage
- Personalized Improvement Plan



# 🚀 Future Enhancements

- 🎥 AI Mock Interview Simulator
- 🧾 Resume Builder
- 🌐 LinkedIn Profile Analyzer
- 🤖 Voice-based Interview Practice
- ☁️ Cloud Deployment Support
- 📱 Mobile Responsive Optimization


# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

> “Your career growth starts with preparation — AI CareerForge helps you measure it.” 🚀
