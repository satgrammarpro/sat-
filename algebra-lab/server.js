import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || "gpt-5-mini";

// Small safety + quality rules for math tutoring (avoid cheating vibe)
function buildTutorInput({ mode, payload }) {
  const system = `
You are an Algebra tutor.
You must:
- Solve accurately.
- Explain steps clearly.
- Use correct math notation.
- Point out common traps.
- Keep it focused on Algebra (pre-algebra through Algebra II basics).
- If a user asks for an answer only, still include reasoning.

Output format:
1) Final Answer
2) Steps
3) Why this works
4) Common wrong answers (2-3)
5) Quick check

Keep it concise but complete.
`.trim();

  if (mode === "solve") {
    return [
      { role: "system", content: system },
      {
        role: "user",
        content:
`Problem:
${payload.problem}

Student context (optional):
${payload.context || "N/A"}

Return the 5-part format.`
      }
    ];
  }

  if (mode === "practice") {
    return [
      { role: "system", content: system + "\nYou also create practice problems." },
      {
        role: "user",
        content:
`Create ${payload.count} practice problems for:
Topic: ${payload.topic}
Difficulty: ${payload.difficulty} (1 easy - 5 hard)

For each problem, include:
- Question
- 4 multiple-choice answers (A-D)
- Correct letter
- Full explanation in the 5-part format

Return JSON ONLY with this schema:
{
  "items":[
    {
      "question":"...",
      "choices":{"A":"...","B":"...","C":"...","D":"..."},
      "answer":"A",
      "explanation":"(5-part format text)"
    }
  ]
}`
      }
    ];
  }

  if (mode === "wrongAnswers") {
    return [
      { role: "system", content: system + "\nFocus on trap thinking and error taxonomy." },
      {
        role: "user",
        content:
`Create a "Wrong Answer Library" entry for:
Topic: ${payload.topic}
Skill: ${payload.skill}

Return JSON ONLY:
{
  "topic":"...",
  "skill":"...",
  "traps":[
    {
      "wrongAnswer":"...",
      "whyStudentsPickIt":"...",
      "whatTheyIgnored":"...",
      "triggerWordsOrPatterns":["...","..."],
      "fix":"...",
      "miniExample":"..."
    }
  ]
}

Make 6 traps.`
      }
    ];
  }

  throw new Error("Unknown mode");
}

async function callOpenAI(input) {
  // Responses API (recommended in docs) :contentReference[oaicite:1]{index=1}
  const resp = await client.responses.create({
    model: MODEL,
    input
  });

  return resp.output_text;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/solve", async (req, res) => {
  try {
    const { problem, context } = req.body || {};
    if (!problem || typeof problem !== "string") {
      return res.status(400).json({ error: "Missing problem string." });
    }

    const input = buildTutorInput({ mode: "solve", payload: { problem, context } });
    const text = await callOpenAI(input);

    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: String(e.message || e) });
  }
});

app.post("/api/practice", async (req, res) => {
  try {
    const { topic, difficulty, count } = req.body || {};
    const safeCount = Math.max(1, Math.min(Number(count || 5), 10));
    const safeDifficulty = Math.max(1, Math.min(Number(difficulty || 2), 5));

    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Missing topic string." });
    }

    const input = buildTutorInput({
      mode: "practice",
      payload: { topic, difficulty: safeDifficulty, count: safeCount }
    });

    const text = await callOpenAI(input);

    // The model returns JSON-only per instructions; parse defensively.
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "AI returned invalid JSON.", raw: text });
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: String(e.message || e) });
  }
});

app.post("/api/wrong-answers", async (req, res) => {
  try {
    const { topic, skill } = req.body || {};
    if (!topic || typeof topic !== "string" || !skill || typeof skill !== "string") {
      return res.status(400).json({ error: "Missing topic/skill strings." });
    }

    const input = buildTutorInput({ mode: "wrongAnswers", payload: { topic, skill } });
    const text = await callOpenAI(input);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "AI returned invalid JSON.", raw: text });
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: String(e.message || e) });
  }
});

// Serve SPA-ish routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Algebra Lab running on http://localhost:${PORT}`);
});
