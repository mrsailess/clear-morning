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

  const cameraSpec = "PHOTOGRAPHIC REALISM — CRITICAL: Every image must be indistinguishable from a real photograph captured by a professional photographer on location. Shot on a full-frame mirrorless camera (Sony A7 IV, Canon R6 Mark II, or Nikon Z6 III) with a 50mm prime lens. Settings: f/2.0, ISO 400–800, 1/125 sec. Natural optical depth of field only. Real lens rendering. Natural sensor grain. Slight optical vignette. Physically accurate exposure and white balance. Real glass characteristics and lens falloff. Focus should never be clinically perfect — allow subtle edge softness, slight chromatic aberration, realistic highlight rolloff. Preserve fine texture in skin, fabric, leather, wood, and glass. No CGI rendering. No artificial sharpening. No HDR processing. No exaggerated bokeh. No hyper-clean edges. No plastic skin. No synthetic textures. No perfect symmetry. If any element appears artificial or overly perfect, reduce its perfection until it matches the imperfections of real photography. Authenticity takes priority over beauty.\n\n";

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
      formData.append("prompt", `${cameraSpec}${bottleInstruction}\n\n${photoPrompt}${noTextInstruction}`);
      formData.append("size", "1024x1792");

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
          prompt: `${cameraSpec}${photoPrompt}${noTextInstruction}`,
          size: "1024x1792",
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
