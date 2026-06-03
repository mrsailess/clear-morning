import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { moodLabel, topic, systemPrompt } = body;

  if (!moodLabel || !topic || !systemPrompt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (
    typeof moodLabel !== "string" ||
    typeof topic !== "string" ||
    typeof systemPrompt !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid input types" },
      { status: 400 }
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate a content brief for the topic "${topic}" with a ${moodLabel} energy. Return ONLY valid JSON in this exact format:
{"hook":"...","caption":"...","cta":"..."}`
        }
      ]
    });

    const text = message.content.map((i) => i.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("No JSON found");
      parsed = JSON.parse(clean.slice(start, end + 1));
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: clean },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Anthropic error:", error?.response?.data || error);
    return NextResponse.json(
      { error: "Failed to generate brief" },
      { status: 500 }
    );
  }
}
