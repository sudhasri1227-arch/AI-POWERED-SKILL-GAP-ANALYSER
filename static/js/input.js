const skills = new Set();

const skillInput = document.getElementById("skill-input");
const addSkillBtn = document.getElementById("add-skill-btn");
const skillsTags = document.getElementById("skills-tags");
const roleSelect = document.getElementById("role-select");
const jdField = document.getElementById("jd-field");
const jdInput = document.getElementById("jd-input");
const roleTags = document.getElementById("role-tags");
const rolePreview = document.getElementById("role-skills-preview");
const resumeFile = document.getElementById("resume-file");
const uploadText = document.getElementById("upload-text");
const startBtn = document.getElementById("start-btn");
const inputError = document.getElementById("input-error");

function showInputError(msg) {
  inputError.style.display = "block";
  inputError.textContent = msg;
}

function clearInputError() {
  inputError.style.display = "none";
  inputError.textContent = "";
}

function renderSkills() {
  skillsTags.innerHTML = "";
  [...skills].forEach(skill => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = `
      <span>${skill}</span>
      <button type="button" class="tag-x">×</button>
    `;
    tag.querySelector(".tag-x").onclick = () => {
      skills.delete(skill);
      renderSkills();
    };
    skillsTags.appendChild(tag);
  });
}

function addSkill(value) {
  const skill = value.trim();
  if (!skill) return;
  skills.add(skill);
  renderSkills();
}

addSkillBtn?.addEventListener("click", () => {
  addSkill(skillInput.value);
  skillInput.value = "";
  clearInputError();
});

skillInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addSkill(skillInput.value);
    skillInput.value = "";
    clearInputError();
  }
});

roleSelect?.addEventListener("change", async () => {
  clearInputError();

  const role = roleSelect.value;
  roleTags.innerHTML = "";

  if (role === "custom" || !role) {
    jdField.style.display = role === "custom" ? "block" : "none";
    rolePreview.style.display = "none";
    return;
  }

  jdField.style.display = "none";

  try {
    const res = await fetch(`/api/role-skills/${role}`);
    const data = await res.json();

    rolePreview.style.display = "block";
    roleTags.innerHTML = "";

    (data.skills || []).forEach(skill => {
      const tag = document.createElement("div");
      tag.className = "tag tag-soft";
      tag.textContent = skill;
      roleTags.appendChild(tag);
    });
  } catch (e) {
    showInputError("Could not load role skills.");
  }
});

resumeFile?.addEventListener("change", async (e) => {
  clearInputError();
  const file = e.target.files[0];
  if (!file) return;

  uploadText.innerHTML = `<strong>${file.name}</strong> selected`;

  try {
    const formData = new FormData();
    formData.append("resume", file);

    const res = await fetch("/api/extract-skills-file", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Resume skill extraction failed");
    }

    (data.skills || []).forEach(skill => skills.add(skill));
    renderSkills();
  } catch (e) {
    showInputError(e.message || "Resume processing failed.");
  }
});

startBtn?.addEventListener("click", async () => {
  clearInputError();

  const role = roleSelect.value;
  const customJd = jdInput.value.trim();

  if (skills.size === 0) {
    showInputError("Please add manual skills or upload a resume.");
    return;
  }

  if (!role) {
    showInputError("Please choose a target role.");
    return;
  }

  if (role === "custom" && !customJd) {
    showInputError("Please paste a custom job description.");
    return;
  }

  let roleSkills = [];

  if (role !== "custom") {
    const res = await fetch(`/api/role-skills/${role}`);
    const data = await res.json();
    roleSkills = data.skills || [];
  } else {
    roleSkills = customJd
      .split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);
  }

  const allSkills = [...skills];

  sessionStorage.setItem("candidate_skills", JSON.stringify(allSkills));
  sessionStorage.setItem("role", role);
  sessionStorage.setItem("role_skills", JSON.stringify(roleSkills));

  window.location.href = "/assessment";
});