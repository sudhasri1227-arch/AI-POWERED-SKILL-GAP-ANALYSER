function openKeyModal() {
  document.getElementById("key-modal").style.display = "flex";
}

function closeKeyModal() {
  document.getElementById("key-modal").style.display = "none";
  const err = document.getElementById("key-error");
  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }
}

async function saveKey() {
  const input = document.getElementById("api-key-input");
  const key = input.value.trim();
  const err = document.getElementById("key-error");
  const status = document.getElementById("key-status");

  if (!key) {
    err.style.display = "block";
    err.textContent = "Please enter a Gemini API key.";
    return;
  }

  try {
    const res = await fetch("/api/set-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ api_key: key })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to save key");
    }

    status.textContent = "API key configured";
    input.value = "";
    closeKeyModal();
  } catch (e) {
    err.style.display = "block";
    err.textContent = e.message;
  }
}