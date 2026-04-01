let questions = [];
let currentIndex = 0;
let answers = [];

const loadingCard = document.getElementById("loading-card");
const questionCard = document.getElementById("question-card");
const qCounterBadge = document.getElementById("q-counter-badge");
const progressBar = document.getElementById("progress-bar");
const qSkillBadge = document.getElementById("q-skill-badge");
const qLevelTag = document.getElementById("q-level-tag");
const qText = document.getElementById("q-text");
const qOptions = document.getElementById("q-options");
const nextBtn = document.getElementById("next-btn");
const assessSubtitle = document.getElementById("assess-subtitle");

async function loadQuestions() {
  const skills = JSON.parse(sessionStorage.getItem("candidate_skills") || "[]");
  const role = sessionStorage.getItem("role") || "custom";

  if (!skills.length) {
    loadingCard.innerHTML = `<p>No skills found. Go back and add skills first.</p>`;
    return;
  }

  try {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ skills, role })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to generate questions");
    }

    questions = data.questions || [];
    if (!questions.length) {
      throw new Error("No questions were generated.");
    }

    assessSubtitle.textContent = `Assessment for ${skills.length} skill(s)`;
    loadingCard.style.display = "none";
    questionCard.style.display = "block";
    renderQuestion();
  } catch (e) {
    loadingCard.innerHTML = `
      <div class="form-error" style="display:block">${e.message}</div>
      <div class="btn-row" style="margin-top:1rem">
        <a href="/" class="btn btn-ghost">← Go Back</a>
      </div>
    `;
  }
}

function renderQuestion() {
  const q = questions[currentIndex];
  if (!q) return;

  qCounterBadge.textContent = `${currentIndex + 1} / ${questions.length}`;
  progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  qSkillBadge.textContent = `🧠 ${q.skill}`;
  qLevelTag.textContent = q.level;
  qText.textContent = q.question;
  qOptions.innerHTML = "";
  nextBtn.style.display = "none";

  q.options.forEach((option, idx) => {
    const item = document.createElement("button");
    item.className = "option-card";
    item.type = "button";
    item.textContent = option;

    item.onclick = () => {
      document.querySelectorAll(".option-card").forEach(btn => btn.classList.remove("selected"));
      item.classList.add("selected");

      answers[currentIndex] = {
        skill: q.skill,
        level: q.level,
        selected: idx,
        correct: idx === q.correct
      };

      nextBtn.style.display = "inline-flex";
    };

    qOptions.appendChild(item);
  });
}

function nextQuestion() {
  if (!answers[currentIndex]) return;

  if (currentIndex < questions.length - 1) {
    currentIndex += 1;
    renderQuestion();
    return;
  }

  sessionStorage.setItem("assessment_answers", JSON.stringify(answers));
  window.location.href = "/results";
}

window.nextQuestion = nextQuestion;
loadQuestions();