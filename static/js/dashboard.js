/**
 * dashboard.js — Animated charts, counters, and data rendering for the results dashboard
 */

let radarChart = null;
let barChart = null;

// ── Fetch and Render All Dashboard Data ──
async function loadDashboard() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  if (!sessionId) { showError('No session ID found. Please complete the analyzer first.'); return; }

  try {
    const res = await fetch(`/api/results/${sessionId}`);
    if (!res.ok) throw new Error('Session not found');
    const data = await res.json();
    renderDashboard(data);
  } catch (e) {
    showError('Could not load results: ' + e.message);
  }
}

function renderDashboard(data) {
  // Hide loader
  document.getElementById('dashboard-loader')?.classList.add('hidden');
  document.getElementById('dashboard-content')?.classList.remove('hidden');

  const { resume_score, tech_score, comm_score, portfolio_score, final_score, role,
          readiness, percentile, resume_data, comm_data, roadmap, skills_found, missing_keywords, ats_score } = data;

  // ── Hero Score ──
  animateScoreOrb(final_score);
  setEl('final-score-num', Math.round(final_score));
  setEl('readiness-level', readiness?.level || '');
  setEl('percentile-text', percentile || '');
  setEl('role-badge', role || '');

  // Readiness color
  const levelEl = document.getElementById('readiness-level');
  if (levelEl) levelEl.style.color = readiness?.color || '#4F8CFF';

  // ── Circular Progress Bars ──
  setTimeout(() => {
    drawCircularProgress('resume-progress', resume_score, '#4F8CFF');
    drawCircularProgress('tech-progress', tech_score, '#8B7CFF');
    drawCircularProgress('comm-progress', comm_score, '#f59e0b');
    drawCircularProgress('portfolio-progress', portfolio_score, '#10b981');
  }, 300);

  setEl('resume-score-num', Math.round(resume_score));
  setEl('tech-score-num', Math.round(tech_score));
  setEl('comm-score-num', Math.round(comm_score));
  setEl('portfolio-score-num', Math.round(portfolio_score));
  setEl('ats-score-num', Math.round(ats_score || 0));

  // ── Charts ──
  setTimeout(() => {
    renderRadarChart(resume_score, tech_score, comm_score, portfolio_score, ats_score);
    renderBarChart(final_score, role);
  }, 500);

  // ── Skills ──
  renderSkillTags('skills-found-list', skills_found || [], false);
  renderSkillTags('missing-skills-list', missing_keywords || [], true);

  // ── Resume Feedback ──
  setEl('recruiter-comments', resume_data?.recruiter_comments || '');
  setEl('feedback-summary', resume_data?.feedback_summary || '');
  renderListItems('strengths-list', resume_data?.strengths || [], 'positive');
  renderListItems('weaknesses-list', resume_data?.weaknesses || [], 'warning');

  // ── Communication ──
  setEl('comm-positive-list', '');
  renderListItems('comm-positives-list', comm_data?.positives || [], 'positive');
  renderListItems('comm-improvements-list', comm_data?.improvements || [], 'warning');
  setEl('rewritten-sample', comm_data?.rewritten_sample || '');

  // ── Roadmap ──
  renderRoadmap(roadmap || {});
}

// ── Score Orb (Three.js floating sphere) ──
function animateScoreOrb(score) {
  const canvas = document.getElementById('score-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    setEl('final-score-num', Math.round(score));
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.offsetWidth || 220, canvas.offsetHeight || 220);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4;

  const geom = new THREE.SphereGeometry(1.5, 32, 32);
  const color = score >= 75 ? 0x10b981 : score >= 50 ? 0xf59e0b : 0xef4444;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, wireframe: true });
  const sphere = new THREE.Mesh(geom, mat);
  scene.add(sphere);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 32, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06 })
  );
  scene.add(glow);

  function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.y += 0.008;
    sphere.rotation.x += 0.003;
    renderer.render(scene, camera);
  }
  animate();
}

// ── Circular Progress SVG ──
function drawCircularProgress(containerId, score, color) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const size = 110;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(79,140,255,0.12)" stroke-width="${stroke}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}"
        stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
        id="${containerId}-fill"
        style="filter:drop-shadow(0 0 6px ${color});transition:stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)"/>
    </svg>
  `;

  setTimeout(() => {
    const fill = document.getElementById(`${containerId}-fill`);
    if (fill) fill.style.strokeDashoffset = offset;
  }, 100);
}

// ── Radar Chart ──
function renderRadarChart(resume, tech, comm, portfolio, ats) {
  const ctx = document.getElementById('radar-chart')?.getContext('2d');
  if (!ctx) return;
  if (radarChart) radarChart.destroy();

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Resume', 'Technical', 'Communication', 'Portfolio', 'ATS'],
      datasets: [{
        label: 'Your Scores',
        data: [resume, tech, comm, portfolio, ats],
        borderColor: '#4F8CFF',
        backgroundColor: 'rgba(79,140,255,0.12)',
        pointBackgroundColor: '#4F8CFF',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0, max: 100,
          grid: { color: 'rgba(79,140,255,0.12)' },
          angleLines: { color: 'rgba(79,140,255,0.12)' },
          pointLabels: { color: '#1E2A3A', font: { size: 12, family: 'Outfit' } },
          ticks: { backdropColor: 'transparent', color: '#5A6A82', stepSize: 25 },
        }
      },
      plugins: {
        legend: { labels: { color: '#1E2A3A', font: { family: 'Outfit' } } },
      },
    }
  });
}

// ── Bar Chart ──
function renderBarChart(score, role) {
  const ctx = document.getElementById('bar-chart')?.getContext('2d');
  if (!ctx) return;
  if (barChart) barChart.destroy();

  const benchmarks = { 'Web Developer': 55, 'AI/ML': 52, 'Data Analyst': 57, 'UI/UX': 54 };
  const avg = benchmarks[role] || 55;
  const topPct = 75;

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['You', 'Avg Candidate', 'Top 25%'],
      datasets: [{
        label: 'Readiness Score',
        data: [Math.round(score), avg, topPct],
        backgroundColor: [
          'rgba(79,140,255,0.75)',
          'rgba(139,124,255,0.55)',
          'rgba(16,185,129,0.55)',
        ],
        borderColor: ['#4F8CFF', '#8B7CFF', '#10b981'],
        borderWidth: 2,
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0, max: 100,
          grid: { color: 'rgba(79,140,255,0.08)' },
          ticks: { color: '#5A6A82', font: { family: 'Outfit' } },
        },
        x: { grid: { display: false }, ticks: { color: '#5A6A82', font: { family: 'Outfit' } } }
      },
      plugins: { legend: { display: false } },
    }
  });
}

// ── Skill Tags ──
function renderSkillTags(containerId, skills, isMissing) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = skills.map(s =>
    `<span class="skill-tag ${isMissing ? 'missing' : ''}">${s}</span>`
  ).join('');
}

// ── List Items ──
function renderListItems(containerId, items, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const iconSVG = type === 'positive'
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  el.innerHTML = items.map(item =>
    `<li class="flex items-start gap-2 text-sm mb-2" style="color:#1E2A3A;">
       <span class="mt-0.5 flex-shrink-0">${iconSVG}</span><span>${item}</span>
     </li>`
  ).join('');
}

// ── Roadmap ──
function renderRoadmap(roadmap) {
  // Skill gaps
  const gapEl = document.getElementById('skill-gaps-list');
  if (gapEl) {
    gapEl.innerHTML = (roadmap.skill_gaps || []).map(g =>
      `<span class="skill-tag missing">${g}</span>`
    ).join('');
  }

  // Weekly plan
  const weeks = ['week1', 'week2', 'week3', 'week4'];
  weeks.forEach((w, i) => {
    const weekData = roadmap[w];
    const el = document.getElementById(`week-${i + 1}`);
    if (!el || !weekData) return;
    el.innerHTML = `
      <p class="font-semibold text-sm mb-1" style="color:#1E2A3A;">Week ${i + 1}: ${weekData.focus}</p>
      <ul class="space-y-1">
        ${(weekData.tasks || []).map(t => `<li class="text-xs" style="color:#5A6A82;">→ ${t}</li>`).join('')}
      </ul>
    `;
  });

  // Quick wins
  const qwEl = document.getElementById('quick-wins-list');
  if (qwEl) {
    const boltSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    qwEl.innerHTML = (roadmap.quick_wins || []).map(q =>
      `<li class="flex items-start gap-2 text-sm mb-2" style="color:#1E2A3A;">
         <span class="mt-0.5 flex-shrink-0">${boltSVG}</span><span>${q}</span>
       </li>`
    ).join('');
  }

  // Resources
  const resEl = document.getElementById('resources-list');
  if (resEl) {
    resEl.innerHTML = (roadmap.top_resources || []).map(r =>
      `<a href="${r.url}" target="_blank" rel="noopener" class="resource-link">
        <span class="text-sm font-medium" style="color:#1E2A3A;">${r.name}</span>
        <span class="text-xs px-2 py-1 rounded-full" style="background:rgba(79,140,255,.10);color:#4F8CFF;border:1px solid rgba(79,140,255,.20);">${r.type}</span>
       </a>`
    ).join('');
  }
}

// ── Helpers ──
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showError(msg) {
  const el = document.getElementById('dashboard-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  document.getElementById('dashboard-loader')?.classList.add('hidden');
}

// ── Init ──
document.addEventListener('DOMContentLoaded', loadDashboard);
