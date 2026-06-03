"use client";
import { useState } from "react";

const BRAND_CONFIGS = {
  no86: {
    label: "No. 86",
    accent: "#C8972A",
    bg: "#0E0B07",
    surface: "#1A1408",
    border: "#2A2010",
    tagline: "Keep the ritual. Lose the fog.",
    systemPrompt: `You are a content strategist for No. 86, a non-alcoholic whiskey brand targeting sober-curious men aged 30–45.

BRAND VOICE: Calm, moody, masculine. Never preachy. Never uses "quit drinking" framing. Feels like a trusted friend, not a wellness brand.
CORE MESSAGE: "Keep the ritual. Lose the fog." Control, clarity, presence.
CONTENT STRUCTURE: Emotional truth → agitate the moment → reframe with one insight → white space → soft brand line "That's why we made No. 86." → close with identity.
TIKTOK HOOK RULE: Start with "Imagine" to drive curiosity. 35 words max for hook.

Generate a content brief with:
1. HOOK (TikTok opening line, starts with "Imagine", max 35 words)
2. CAPTION (80–120 words, emotional truth → agitate → reframe → "That's why we made No. 86." → identity close)
3. CTA (soft, never salesy, max 12 words)

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  },
  clearmorning: {
    label: "Clear Morning",
    accent: "#4A9EBF",
    bg: "#060D12",
    surface: "#0A1520",
    border: "#102030",
    tagline: "A reality check before regret.",
    systemPrompt: `You are a content strategist for Clear Morning, a free mobile web app helping men 30–45 make better decisions during the 8–11pm window.

BRAND VOICE: Direct. Honest. Non-judgmental. Like a mentor who's been there.
TARGET USER: Emotionally overwhelmed men who lose the night to bad habits.
CONTENT STRUCTURE: Hook → specific moment that makes it worse → reframe → app as the bridge.
TIKTOK HOOK: Start with "Imagine". 35 words max.
CTA GOAL: Drive to clear-morning-one.vercel.app — always frame as "free" and "60 seconds."

Generate a content brief with:
1. HOOK (starts with "Imagine", max 35 words)
2. CAPTION (80–120 words, emotional truth → agitate → reframe → soft app mention)
3. CTA (mention it's free, max 12 words)

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  },
  personal: {
    label: "@mr.sailes",
    accent: "#8B5CF6",
    bg: "#080610",
    surface: "#100E1A",
    border: "#1E1830",
    tagline: "Father. Veteran. Builder.",
    systemPrompt: `You are a content strategist for Sean's personal brand @mr.sailes on TikTok (11.5K followers, 676K likes). Sean is a Navy veteran, medic, husband, father, Jiu-Jitsu practitioner, entrepreneur building No. 86 and Clear Morning.

BRAND VOICE: Authority-style tone (mentor/coach). Relatable struggle. Bold and honest. Never fake humble.
CONTENT PILLARS: Personal development, loneliness, relationships, faith, fatherhood, entrepreneurship.
STRUCTURE: 2–3 lines of emotional truth → white space → identity close.
TIKTOK HOOK: Start with "Imagine" or a feeling they recognize but never say out loud. 35 words max.
CLOSE: End with "If you can relate, maybe this account can help."

Generate a content brief with:
1. HOOK (max 35 words, raw and real)
2. CAPTION (80–120 words, emotional truth → white space → identity close → "If you can relate, maybe this account can help.")
3. CTA (soft, community-building, max 12 words)

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  }
};

const MOODS = [
  { id: "high", label: "High Energy", icon: "⚡", desc: "Fired up, clear, ready" },
  { id: "mid", label: "Steady", icon: "🎯", desc: "Focused, grounded, present" },
  { id: "low", label: "Low Energy", icon: "🌑", desc: "Tired, reflective, real" }
];

const TOPICS = {
  no86: ["The ritual", "Sober curious", "The night cap", "Social pressure", "Morning clarity", "The pour moment"],
  clearmorning: ["The 9pm spiral", "Decision fatigue", "Family presence", "Habit loop", "The phone trap", "Night routine"],
  personal: ["Fatherhood", "Faith", "Marriage", "Jiu-Jitsu", "Veteran life", "Building something"]
};

export default function ContentBrief() {
  const [brand, setBrand] = useState(null);
  const [mood, setMood] = useState(null);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [step, setStep] = useState(1);

  const config = brand ? BRAND_CONFIGS[brand] : BRAND_CONFIGS.no86;
  const accent = config.accent;

  const generateBrief = async () => {
    if (!brand || !mood || !topic) return;
    setLoading(true);
    setBrief(null);
    setError(null);

    const moodLabel = MOODS.find((m) => m.id === mood)?.label;

    try {
      const response = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodLabel,
          topic,
          systemPrompt: BRAND_CONFIGS[brand].systemPrompt
        })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const parsed = await response.json();
      if (parsed.error) throw new Error(parsed.error);
      setBrief(parsed);
      setStep(4);
    } catch (err) {
      setError("Failed to generate. Check ANTHROPIC_API_KEY in Vercel env vars.");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const reset = () => {
    setBrand(null); setMood(null); setTopic(null);
    setBrief(null); setError(null); setStep(1);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: brand ? config.bg : "#080808",
      fontFamily: "'Georgia', serif",
      color: "#E8E0D4",
      transition: "background 0.5s ease"
    }}>
      <div style={{
        borderBottom: `1px solid ${brand ? config.border : "#1A1A1A"}`,
        padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: brand ? config.surface : "#0D0D0D"
      }}>
        <div>
          <div style={{ fontSize: "11px", letterSpacing: "3px", color: brand ? accent : "#666", textTransform: "uppercase", marginBottom: "4px", fontFamily: "monospace" }}>Daily Brief</div>
          <div style={{ fontSize: "20px", fontWeight: "700" }}>Content Generator</div>
        </div>
        {(brief || step > 1) && (
          <button onClick={reset} style={{ background: "transparent", border: `1px solid ${config.border}`, color: "#888", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace" }}>RESET</button>
        )}
      </div>

      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "28px 20px" }}>

        {/* Step 1: Brand */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>01 — Select Brand</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(BRAND_CONFIGS).map(([key, cfg]) => (
              <button key={key}
                onClick={() => { setBrand(key); setStep(Math.max(step, 2)); setTopic(null); setBrief(null); setError(null); }}
                style={{
                  background: brand === key ? cfg.surface : "transparent",
                  border: `1px solid ${brand === key ? cfg.accent : "#222"}`,
                  borderRadius: "10px", padding: "14px 18px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left"
                }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: brand === key ? cfg.accent : "#CCC", marginBottom: "2px" }}>{cfg.label}</div>
                  <div style={{ fontSize: "12px", color: "#555", fontStyle: "italic" }}>{cfg.tagline}</div>
                </div>
                {brand === key && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.accent }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Mood */}
        {step >= 2 && brand && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>02 — Your Energy Right Now</div>
            <div style={{ display: "flex", gap: "10px" }}>
              {MOODS.map((m) => (
                <button key={m.id}
                  onClick={() => { setMood(m.id); setStep(Math.max(step, 3)); }}
                  style={{
                    flex: 1, background: mood === m.id ? config.surface : "transparent",
                    border: `1px solid ${mood === m.id ? accent : "#222"}`,
                    borderRadius: "10px", padding: "14px 10px", cursor: "pointer", textAlign: "center"
                  }}>
                  <div style={{ fontSize: "22px", marginBottom: "6px" }}>{m.icon}</div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: mood === m.id ? accent : "#888", marginBottom: "3px" }}>{m.label}</div>
                  <div style={{ fontSize: "10px", color: "#444", fontStyle: "italic" }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Topic + Generate */}
        {step >= 3 && brand && mood && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>03 — What's the Angle</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {TOPICS[brand].map((t) => (
                <button key={t}
                  onClick={() => { setTopic(t); setBrief(null); setError(null); }}
                  style={{
                    background: topic === t ? config.surface : "transparent",
                    border: `1px solid ${topic === t ? accent : "#222"}`,
                    borderRadius: "8px", padding: "12px 14px", cursor: "pointer",
                    textAlign: "left", fontSize: "13px",
                    color: topic === t ? accent : "#888",
                    fontWeight: topic === t ? "600" : "400"
                  }}>{t}</button>
              ))}
            </div>

            {topic && !loading && !brief && (
              <button onClick={generateBrief} style={{
                width: "100%", marginTop: "20px", background: accent,
                border: "none", borderRadius: "10px", padding: "16px",
                cursor: "pointer", fontSize: "14px", fontWeight: "700",
                color: "#000", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "monospace"
              }}>Generate Brief</button>
            )}

            {loading && (
              <div style={{ marginTop: "20px", textAlign: "center", padding: "20px", color: "#555", fontSize: "13px", fontFamily: "monospace" }}>
                <div style={{
                  width: "28px", height: "28px",
                  border: `2px solid ${config.border}`, borderTop: `2px solid ${accent}`,
                  borderRadius: "50%", margin: "0 auto 12px",
                  animation: "spin 0.8s linear infinite"
                }} />
                WRITING YOUR BRIEF...
              </div>
            )}

            {error && (
              <div style={{ marginTop: "16px", padding: "14px", background: "#1A0A0A", border: "1px solid #3A1A1A", borderRadius: "8px", color: "#CC4444", fontSize: "13px", fontFamily: "monospace" }}>{error}</div>
            )}
          </div>
        )}

        {/* Result */}
        {brief && (
          <div style={{ background: config.surface, border: `1px solid ${config.border}`, borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${config.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>Today's Brief — {config.label}</div>
              <button onClick={() => copy(`HOOK:\n${brief.hook}\n\nCAPTION:\n${brief.caption}\n\nCTA:\n${brief.cta}`, "all")}
                style={{ background: copied === "all" ? accent : "transparent", border: `1px solid ${copied === "all" ? accent : config.border}`, color: copied === "all" ? "#000" : "#666", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                {copied === "all" ? "COPIED" : "COPY ALL"}
              </button>
            </div>

            {[
              { key: "hook", label: "🎬 Hook", field: brief.hook, style: { fontSize: "16px", fontStyle: "italic" } },
              { key: "caption", label: "📝 Caption", field: brief.caption, style: { fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
              { key: "cta", label: "👉 CTA", field: brief.cta, style: { fontSize: "15px", fontWeight: "600", color: accent } }
            ].map(({ key, label, field, style }, i, arr) => (
              <div key={key} style={{ padding: "20px", borderBottom: i < arr.length - 1 ? `1px solid ${config.border}` : "none" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", marginBottom: "10px", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
                <div style={{ marginBottom: "12px", ...style }}>{field}</div>
                <button onClick={() => copy(field, key)} style={{ background: "transparent", border: `1px solid ${config.border}`, color: copied === key ? accent : "#555", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                  {copied === key ? "✓ COPIED" : "COPY"}
                </button>
              </div>
            ))}

            <div style={{ padding: "16px 20px", borderTop: `1px solid ${config.border}`, display: "flex", gap: "10px" }}>
              <button onClick={generateBrief} style={{ flex: 1, background: "transparent", border: `1px solid ${config.border}`, color: "#555", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>↻ REGENERATE</button>
              <button onClick={reset} style={{ flex: 1, background: "transparent", border: `1px solid ${config.border}`, color: "#555", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>NEW BRIEF</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.85; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
