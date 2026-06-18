export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { photoPrompt, brand, mode } = body;

  if (!photoPrompt) {
    return res.status(400).json({ error: "Missing photoPrompt" });
  }

  const finalPrompt = `${photoPrompt}

Important: Do not include any text, captions, logos, or watermarks in the image. The on-screen text will be added separately outside the image.`;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: finalPrompt,
        size: "1024x1536",
        output_format: "png",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "OpenAI error" });
    }

    const imageBase64 = data.data?.[0]?.b64_json;

    if (!imageBase64) {
      return res.status(500).json({ error: "No image returned from OpenAI" });
    }

    return res.status(200).json({ imageBase64, mimeType: "image/png", brand, mode });
  } catch (err) {
    return res.status(500).json({ error: "Image generation failed", detail: err.message });
  }
}
