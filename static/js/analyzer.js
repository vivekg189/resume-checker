/**
 * analyzer.js — Multi-step wizard logic for analyze.html
 */

const STATE = {
  step: 1,
  role: '',
  sessionId: '',
  resumeScore: 0,
  portfolioScore: 0,
  techScore: 0,
  commScore: 0,
  questions: [],
  correctAnswers: [],
  userAnswers: [],
  quizIndex: 0,
  aiData: {},
};

// ── Step Navigation ──
function goToStep(n) {
  const current = document.querySelector('.wizard-step:not(.hidden)');
  const next = document.getElementById(`step-${n}`);
  if (!next) return;
  STATE.step = n;
  updateStepIndicator(n);

  if (typeof gsap !== 'undefined' && current && current !== next) {
    gsap.to(current, { opacity: 0, x: -40, duration: 0.3, ease: 'power2.in', onComplete: () => {
      current.classList.add('hidden');
      current.style = '';
      next.classList.remove('hidden');
      next.style.opacity = 0;
      gsap.fromTo(next, { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' });
    }});
  } else {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
    next.classList.remove('hidden');
    next.style.opacity = 1;
  }
}

function updateStepIndicator(current) {
  for (let i = 1; i <= 6; i++) {
    const dot = document.getElementById(`dot-${i}`);
    const line = document.getElementById(`line-${i}`);
    if (!dot) continue;
    dot.className = 'step-dot';
    if (i < current) dot.classList.add('done');
    else if (i === current) dot.classList.add('active');
    if (line) {
      line.classList.toggle('done', i < current);
    }
  }
}

// ── Step 1: Role Selection (handled below with button enable) ──

document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    STATE.role = card.dataset.role;
    const btn = document.getElementById('role-next-btn');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  });
});

document.getElementById('role-next-btn')?.addEventListener('click', () => {
  if (!STATE.role) return;
  goToStep(2);
});

// ── Step 2: Resume Upload ──
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('resume-file');

dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});
dropZone?.addEventListener('click', () => fileInput?.click());
fileInput?.addEventListener('change', (e) => handleFile(e.target.files[0]));

function handleFile(file) {
  if (!file) return;
  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
  if (!allowed.includes(file.type)) {
    showToast('Please upload a PDF or DOCX file.', 'error'); return;
  }
  const label = document.getElementById('file-label');
  if (label) label.textContent = `File selected: ${file.name}`;
  dropZone.classList.add('drag-over');

  // Show scanner effect
  const scanner = document.createElement('div');
  scanner.className = 'scanner-line';
  dropZone.appendChild(scanner);
  setTimeout(() => scanner.remove(), 3000);

  const upBtn = document.getElementById('upload-btn');
  if (upBtn) { upBtn.disabled = false; upBtn.style.opacity = '1'; upBtn.style.pointerEvents = 'auto'; upBtn._file = file; }
}

document.getElementById('upload-btn')?.addEventListener('click', async () => {
  const file = document.getElementById('upload-btn')._file;
  if (!file) return;

  goToStep(3); // AI Processing step
  startProcessing('Parsing your resume...');

  const formData = new FormData();
  formData.append('resume', file);
  formData.append('role', STATE.role);

  try {
    updateProcessingStatus('Sending to AI...');
    const res = await fetch('/api/upload-resume', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    STATE.sessionId = data.session_id;
    STATE.resumeScore = data.resume_score;
    STATE.portfolioScore = data.portfolio_score;
    STATE.aiData = data;

    updateProcessingStatus('Resume analyzed! Fetching quiz questions...');
    await loadQuestions();

    setTimeout(() => {
      showResumePreview(data);
      goToStep(4); // Quiz
    }, 800);
  } catch (err) {
    showToast('Analysis failed: ' + err.message, 'error');
    goToStep(2);
  }
});

function startProcessing(msg) {
  const status = document.getElementById('processing-status');
  if (status) status.textContent = msg;
  const typewriter = document.getElementById('ai-typewriter');
  if (typewriter) {
    const messages = [
      'Scanning resume structure...',
      'Evaluating ATS compatibility...',
      'Detecting technical keywords...',
      'Analyzing project impact...',
      'Benchmarking against industry standards...',
      'Generating personalized insights...',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      typewriter.textContent = messages[idx % messages.length];
      idx++;
    }, 1200);
    document.getElementById('step-3')._interval = interval;
  }
}

function updateProcessingStatus(msg) {
  const status = document.getElementById('processing-status');
  if (status) status.textContent = msg;
}

function showResumePreview(data) {
  const el = document.getElementById('resume-feedback-preview');
  if (!el) return;
  el.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      ${(data.skills_found || []).slice(0, 8).map(s =>
        `<span class="skill-tag">${s}</span>`).join('')}
    </div>
    <p class="text-sm italic" style="color:#5A6A82;">"${data.recruiter_comments || ''}"</p>
  `;
}

// ── Step 4: Quiz ──
async function loadQuestions() {
  const res = await fetch(`/api/get-questions?role=${encodeURIComponent(STATE.role)}&session_id=${STATE.sessionId}`);
  const data = await res.json();
  STATE.questions = data.questions || [];
  STATE.correctAnswers = data.answers || [];
  STATE.userAnswers = new Array(STATE.questions.length).fill(-1);
}

function renderQuestion(index) {
  const q = STATE.questions[index];
  if (!q) return;

  document.getElementById('quiz-q-num').textContent = `Question ${index + 1} of ${STATE.questions.length}`;
  document.getElementById('quiz-question').textContent = q.question;
  document.getElementById('quiz-progress').style.width = `${((index + 1) / STATE.questions.length) * 100}%`;

  const container = document.getElementById('quiz-options');
  const letters = ['A', 'B', 'C', 'D'];
  container.innerHTML = q.options.map((opt, i) => `
    <div class="quiz-option" data-idx="${i}" onclick="selectOption(${i})">
      <span class="option-letter">${letters[i]}</span>
      <span>${opt}</span>
    </div>
  `).join('');

  const nxtBtn = document.getElementById('quiz-next-btn');
  if (nxtBtn) { nxtBtn.disabled = true; nxtBtn.style.opacity = '0.35'; nxtBtn.style.pointerEvents = 'none'; }
}

window.selectOption = function (idx) {
  STATE.userAnswers[STATE.quizIndex] = idx;
  document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('.quiz-option')[idx]?.classList.add('selected');
  const qnBtn = document.getElementById('quiz-next-btn');
  if (qnBtn) { qnBtn.disabled = false; qnBtn.style.opacity = '1'; qnBtn.style.pointerEvents = 'auto'; }
};

document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
  // Show correct/wrong
  const correct = STATE.correctAnswers[STATE.quizIndex];
  const chosen = STATE.userAnswers[STATE.quizIndex];
  document.querySelectorAll('.quiz-option').forEach((o, i) => {
    if (i === correct) o.classList.add('correct');
    else if (i === chosen && chosen !== correct) o.classList.add('wrong');
  });

  setTimeout(() => {
    STATE.quizIndex++;
    if (STATE.quizIndex < STATE.questions.length) {
      renderQuestion(STATE.quizIndex);
    } else {
      submitQuiz();
    }
  }, 900);
});

async function submitQuiz() {
  try {
    const res = await fetch('/api/submit-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: STATE.sessionId,
        answers: STATE.userAnswers,
        correct_answers: STATE.correctAnswers,
      }),
    });
    const data = await res.json();
    STATE.techScore = data.tech_score;
    document.getElementById('quiz-result').textContent =
      `${data.correct}/${data.total} correct — ${data.tech_score}%`;
    goToStep(5); // Communication
  } catch (e) {
    showToast('Quiz submission error', 'error');
  }
}

// ── Step 5: Communication ──
const introArea = document.getElementById('intro-textarea');
const charCount = document.getElementById('char-count');
introArea?.addEventListener('input', () => {
  const len = introArea.value.length;
  charCount.textContent = len;
  charCount.style.color = len > 50 ? '#10b981' : '#9AAABB';
});

document.getElementById('comm-submit-btn')?.addEventListener('click', async () => {
  const text = introArea?.value?.trim();
  if (!text || text.length < 20) { showToast('Please write at least a 20-character introduction.', 'error'); return; }

  goToStep(6); // Final processing
  startFinalProcessing();

  try {
    const commRes = await fetch('/api/submit-intro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: STATE.sessionId, intro_text: text, role: STATE.role }),
    });
    const commData = await commRes.json();
    STATE.commScore = commData.comm_score;

    const finalRes = await fetch('/api/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: STATE.sessionId }),
    });
    const finalData = await finalRes.json();

    setTimeout(() => {
      window.location.href = `/dashboard?session_id=${STATE.sessionId}`;
    }, 1500);
  } catch (e) {
    showToast('Finalization failed: ' + e.message, 'error');
    goToStep(5);
  }
});

function startFinalProcessing() {
  const msgs = document.getElementById('final-msgs');
  if (!msgs) return;
  const steps = [
    'Analyzing communication patterns...',
    'Computing weighted readiness score...',
    'Generating personalized roadmap...',
    'Benchmarking against industry data...',
    'Finalizing your CareerForge report...',
  ];
  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) { msgs.textContent = steps[i++]; }
    else clearInterval(interval);
  }, 1000);
}

// ── Toast Notification ──
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const color = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#4F8CFF';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:14px 24px;border-radius:12px;
    background:rgba(255,255,255,0.95);border:1px solid ${color};
    color:${color};font-weight:600;font-size:.9rem;
    box-shadow:0 8px 32px rgba(79,140,255,0.15);
    backdrop-filter:blur(20px);
    animation:toastIn .3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  goToStep(1);
});
