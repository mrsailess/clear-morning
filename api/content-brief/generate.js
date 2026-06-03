// api/content-brief/generate.js
// Vercel serverless function — same pattern as ask-claude.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { moodLabel, topic, systemPrompt } = body;

  if (!moodLabel || !topic || !systemPrompt) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (
    typeof moodLabel !== "string" ||
    typeof topic !== "string" ||
    typeof systemPrompt !== "string"
  ) {
    return res.status(400).json({ error: "Invalid input types" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Generate a content brief for the topic "${topic}" with a ${moodLabel} energy. Return ONLY valid JSON in this exact format:
{"hook":"...","caption":"...","cta":"..."}`
          }
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const text = data.content?.map((i) => i.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("No JSON found");
      parsed = JSON.parse(clean.slice(start, end + 1));
    } catch {
      return res.status(502).json({ error: "AI returned invalid JSON", raw: clean });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Request failed", detail: err.message });
  }
}
