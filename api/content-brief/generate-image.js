import { readFileSync, existsSync } from "fs";
import { join } from "path";

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

  const noTextInstruction = "\n\nImportant: Do not include any text, captions, logos, or watermarks in the image. The on-screen text will be added separately outside the image.";

  try {
    let imageBase64;

    const bottlePath = join(process.cwd(), "public", "no86-bottle.png");
    const hasBottleRef = brand === "no86" && existsSync(bottlePath);

    if (hasBottleRef) {
      // Use /images/edits — sends bottle as reference image
      const bottleBuffer = readFileSync(bottlePath);
      const bottleBlob = new Blob([bottleBuffer], { type: "image/png" });

      const bottleInstruction = "Use the provided No. 86 bottle image as the exact product reference. Preserve the bottle shape, label design, black matte label, gold typography, and premium bottle look. Place it naturally in the scene. Do not create a different bottle.";

      const formData = new FormData();
      formData.append("model", "gpt-image-1");
      formData.append("image[]", bottleBlob, "no86-bottle.png");
      formData.append("prompt", `${bottleInstruction}\n\n${photoPrompt}${noTextInstruction}`);
      formData.append("size", "1024x1536");

      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data?.error?.message || "OpenAI error" });
      }
      imageBase64 = data.data?.[0]?.b64_json;
    } else {
      // Text-only generation (non-no86 brands, or bottle file not yet added)
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: `${photoPrompt}${noTextInstruction}`,
          size: "1024x1536",
          output_format: "png",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data?.error?.message || "OpenAI error" });
      }
      imageBase64 = data.data?.[0]?.b64_json;
    }

    if (!imageBase64) {
      return res.status(500).json({ error: "No image returned from OpenAI" });
    }

    return res.status(200).json({ imageBase64, mimeType: "image/png", brand, mode, usedBottleRef: hasBottleRef });
  } catch (err) {
    return res.status(500).json({ error: "Image generation failed", detail: err.message });
  }
}
