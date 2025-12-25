const $ = (id) => document.getElementById(id);

$("year").textContent = new Date().getFullYear();

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

function setBusy(btn, busy) {
  btn.disabled = busy;
  btn.textContent = busy ? "Working..." : btn.dataset.label;
}

$("solveBtn").dataset.label = "Explain";
$("practiceBtn").dataset.label = "Generate";
$("trapBtn").dataset.label = "Generate traps";

$("solveBtn").addEventListener("click", async () => {
  const btn = $("solveBtn");
  setBusy(btn, true);
  $("solveOut").textContent = "";

  try {
    const problem = $("problem").value.trim();
    const context = $("context").value.trim();

    const { text } = await postJSON("/api/solve", { problem, context });
    $("solveOut").textContent = text;
  } catch (e) {
    $("solveOut").textContent = "Error: " + e.message;
  } finally {
    setBusy(btn, false);
  }
});

$("practiceBtn").addEventListener("click", async () => {
  const btn = $("practiceBtn");
  setBusy(btn, true);
  $("practiceOut").innerHTML = "";

  try {
    const topic = $("topic").value.trim();
    const difficulty = Number($("difficulty").value);
    const count = Number($("count").value);

    const data = await postJSON("/api/practice", { topic, difficulty, count });

    for (const item of data.items || []) {
      const div = document.createElement("div");
      div.className = "qcard";
      div.innerHTML = `
        <div class="badge">Answer: ${item.answer}</div>
        <h3 style="margin:8px 0 6px">${escapeHTML(item.question)}</h3>
        <div class="choices">
          ${Object.entries(item.choices || {}).map(([k,v]) => `<div><b>${k}.</b> ${escapeHTML(v)}</div>`).join("")}
        </div>
        <details style="margin-top:10px">
          <summary>Explanation</summary>
          <pre class="out" style="margin-top:10px">${escapeHTML(item.explanation || "")}</pre>
        </details>
      `;
      $("practiceOut").appendChild(div);
    }
  } catch (e) {
    $("practiceOut").innerHTML = `<pre class="out">Error: ${escapeHTML(e.message)}</pre>`;
  } finally {
    setBusy(btn, false);
  }
});

$("trapBtn").addEventListener("click", async () => {
  const btn = $("trapBtn");
  setBusy(btn, true);
  $("trapOut").innerHTML = "";

  try {
    const topic = $("trapTopic").value.trim();
    const skill = $("trapSkill").value.trim();

    const data = await postJSON("/api/wrong-answers", { topic, skill });

    for (const t of data.traps || []) {
      const div = document.createElement("div");
      div.className = "trap";
      div.innerHTML = `
        <div class="badge">Wrong Answer</div>
        <h3 style="margin:8px 0 6px">${escapeHTML(t.wrongAnswer)}</h3>
        <div><b>Why students pick it:</b> ${escapeHTML(t.whyStudentsPickIt)}</div>
        <div><b>What they ignored:</b> ${escapeHTML(t.whatTheyIgnored)}</div>
        <div><b>Triggers:</b> ${(t.triggerWordsOrPatterns || []).map(x => `<span class="badge" style="margin-right:6px">${escapeHTML(x)}</span>`).join("")}</div>
        <div style="margin-top:8px"><b>Fix:</b> ${escapeHTML(t.fix)}</div>
        <div style="margin-top:8px"><b>Mini example:</b> ${escapeHTML(t.miniExample)}</div>
      `;
      $("trapOut").appendChild(div);
    }
  } catch (e) {
    $("trapOut").innerHTML = `<pre class="out">Error: ${escapeHTML(e.message)}</pre>`;
  } finally {
    setBusy(btn, false);
  }
});

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
