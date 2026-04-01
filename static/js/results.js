const resultsLoading = document.getElementById("results-loading");
const resultsContent = document.getElementById("results-content");

const scoreNum = document.getElementById("score-num");
const scoreArc = document.getElementById("score-arc");
const scoreVerdict = document.getElementById("score-verdict");
const scoreRole = document.getElementById("score-role");
const scoreStats = document.getElementById("score-stats");

const strongSkillsEl = document.getElementById("strong-skills");
const weakSkillsEl = document.getElementById("weak-skills");
const missingSkillsEl = document.getElementById("missing-skills");

const lpLoading = document.getElementById("lp-loading");
const learningPathEl = document.getElementById("learning-path");

function createTag(text, cls = "") {
  const div = document.createElement("div");
  div.className = `tag ${cls}`.trim();
  div.textContent = text;
  return div;
}

function renderStats(readiness, strong, weak, missing) {
  scoreNum.textContent = `${readiness}%`;
  const circumference = 376.9;
  const offset = circumference - (readiness / 100) * circumference;
  scoreArc.style.strokeDashoffset = offset;

  if (readiness >= 80) {
    scoreVerdict.textContent = "🚀 Excellent readiness — strong fit for the role";
  } else if (readiness >= 60) {
    scoreVerdict.textContent = "✅ Good foundation — a few key gaps to fill";
  } else if (readiness >= 40) {
    scoreVerdict.textContent = "⚠ Moderate readiness — focus on missing core skills";
  } else {
    scoreVerdict.textContent = "🛠 Early-stage readiness — major upskilling needed";
  }

  scoreStats.innerHTML = `
    <span class="stat-pill"><strong>${strong.length}</strong> strong skills</span>
    <span class="stat-pill"><strong>${weak.length}</strong> to improve</span>
    <span class="stat-pill"><strong>${missing.length}</strong> missing skills</span>
  `;
}

async function loadResults() {
  const answers = JSON.parse(sessionStorage.getItem("assessment_answers") || "[]");
  const roleSkills = JSON.parse(sessionStorage.getItem("role_skills") || "[]");
  const role = sessionStorage.getItem("role") || "custom";

  if (!answers.length) {
    resultsLoading.innerHTML = `<p>No assessment answers found. Please start again.</p>`;
    return;
  }

  try {
    const res = await fetch("/api/compute-results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        answers,
        role_skills: roleSkills
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to compute results");
    }

    resultsLoading.style.display = "none";
    resultsContent.style.display = "block";

    scoreRole.textContent = `Assessment for: ${role}`;
    renderStats(data.readiness, data.strong, data.weak, data.missing);

    strongSkillsEl.innerHTML = "";
    weakSkillsEl.innerHTML = "";
    missingSkillsEl.innerHTML = "";

    if (data.strong.length) {
      data.strong.forEach(skill => strongSkillsEl.appendChild(createTag(skill, "tag-strong")));
    } else {
      strongSkillsEl.textContent = "No strong skills yet.";
    }

    if (data.weak.length) {
      data.weak.forEach(skill => weakSkillsEl.appendChild(createTag(skill, "tag-weak")));
    } else {
      weakSkillsEl.textContent = "All claimed skills are strong!";
    }

    if (data.missing.length) {
      data.missing.forEach(skill => missingSkillsEl.appendChild(createTag(skill, "tag-missing")));
    } else {
      missingSkillsEl.textContent = "No missing skills.";
    }

    await loadLearningPath(data.weak, data.missing, role);
  } catch (e) {
    resultsLoading.innerHTML = `<div class="form-error" style="display:block">${e.message}</div>`;
  }
}

async function loadLearningPath(weak, missing, role) {
  try {
    const res = await fetch("/api/generate-learning-path", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ weak, missing, role })
    });

    const data = await res.json();

    lpLoading.style.display = "none";
    learningPathEl.style.display = "block";
    learningPathEl.innerHTML = "";

    if (!res.ok || !data.steps) {
      learningPathEl.innerHTML = `<p class="form-error" style="display:block">Could not generate learning path.</p>`;
      return;
    }

    data.steps.forEach(step => {
      const card = document.createElement("div");
      card.className = "lp-step";
      card.innerHTML = `
        <h3>${step.title}</h3>
        <p>${step.description}</p>
        <p><strong>Duration:</strong> ${step.duration}</p>
        <p><strong>Type:</strong> ${step.type}</p>
        <p><strong>Priority:</strong> ${step.priority}</p>
        <p><strong>Resource:</strong> ${step.resource}</p>
      `;
      learningPathEl.appendChild(card);
    });
  } catch (e) {
    lpLoading.style.display = "none";
    learningPathEl.style.display = "block";
    learningPathEl.innerHTML = `<p class="form-error" style="display:block">${e.message}</p>`;
  }
}

loadResults();