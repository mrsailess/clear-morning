import { useState } from "react";

const BRAND_CONFIGS = {
  no86: {
    label: "No. 86",
    accent: "#C8972A",
    bg: "#0E0B07",
    surface: "#1A1408",
    border: "#2A2010",
    tagline: "Keep the ritual. Lose the fog.",
    systemPrompt: `You write for No. 86, a non-alcoholic whiskey for men 30–45.

Write like a private thought, not a post.
Sound like someone confessing something to a friend at 10pm — not a brand talking to a customer.

The goal is self-recognition. The reader should think "damn, that's me" — not "that's good advice."

Never teach. Never reframe out loud. Never use: "Here's the truth" / "The hard truth" / "That's the thing" / "What if" / "Presence matters" / "You deserve" / "Real men"

Start from one specific moment:
- Pouring a drink out of habit, not want
- The first sip that doesn't taste like relief anymore
- Standing at the cabinet at 9pm just because that's what you do
- Waking up foggy and already knowing why
- Finishing a drink and not remembering enjoying it

Leave space. Don't finish the thought for them.
90% relatability. 10% insight. Never the other way around.

Hook: One sentence. Starts with "Imagine." Drop them into the moment. Max 35 words.
Caption: 80–120 words. Stay inside the moment. No lesson. One quiet line at the end — "That's why we made No. 86." Then close with identity.
CTA: Soft. Max 12 words.

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  },
  clearmorning: {
    label: "Clear Morning",
    accent: "#4A9EBF",
    bg: "#060D12",
    surface: "#0A1520",
    border: "#102030",
    tagline: "A reality check before regret.",
    systemPrompt: `You write for Clear Morning, a free app for adults 30–45. Audience is 50% men and 50% women.

Write like a private thought someone has but never says out loud.
Sound like a confession, not content.

The goal is self-recognition. Not advice. Not education.
The reader should see themselves and feel less alone — before they ever think about an app.

Never teach. Never use: "Here's the truth" / "The hard truth" / "What if" / "That's the thing" / "You deserve better"

Always start from one of these specific moments:
- Sitting in the driveway before going inside
- Opening the fridge three times not hungry
- Scrolling in the bathroom at 10pm
- Turning the TV on without caring what's on
- Saying "I'm just tired" when you're actually overwhelmed
- Standing in the kitchen after everyone goes to bed
- Looking forward to bedtime more than tomorrow

Leave space. The reader finishes the thought.
90% relatability. 10% insight.

Hook: One sentence. Starts with "Imagine." Put them in the moment. Max 35 words.
Caption: 80–120 words. Stay in the scene. No lesson. Mention the app once, softly — "free" and "60 seconds."
CTA: Drive to clear-morning-one.vercel.app. Max 12 words.

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  },
  personal: {
    label: "@mr.sailes",
    accent: "#8B5CF6",
    bg: "#080610",
    surface: "#100E1A",
    border: "#1E1830",
    tagline: "Father. Veteran. Builder.",
    systemPrompt: `You write for Sean — Navy veteran, father, husband, entrepreneur, Jiu-Jitsu practitioner, 11.5K followers, 676K likes.

Write like a private thought, not a post.
Sound like someone who learned something the hard way and is telling one person — not performing for an audience.

The goal is self-recognition. The reader says "damn, that's me" — not "great advice."

Never teach out loud. Never use: "Here's the truth" / "The hard truth" / "What if" / "That's the thing" / "Real talk" / "Most men"

Start from one real moment:
- Getting home with nothing left to give
- Lying awake running numbers at 2am
- Watching your kid and feeling proud and guilty at the same time
- Training when you're empty because stopping feels like losing
- Sitting in the car before a hard conversation
- Nobody asking how you're doing because you always seem fine

Leave space. Don't wrap it up. Let it sit.
90% relatability. 10% insight. The silence does the work.

Hook: One sentence. Max 35 words. Name a feeling they recognize but never say out loud.
Caption: 80–120 words. Stay in the moment. One honest line — not a lesson. Close with identity. End: "If you can relate, maybe this account can help."
CTA: Soft. Community-building. Max 12 words.

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  }
};

const FEELINGS = [
  "Overwhelmed", "Lonely", "Guilty", "Burned Out",
  "Disconnected", "Restless", "Proud", "Numb"
];

const MOMENTS = [
  "Sitting in the driveway",
  "Scrolling in the bathroom",
  "Standing in the kitchen",
  "Lying awake at 2am",
  "Opening the fridge",
  "Sitting on the couch",
  "Walking into the gym",
  "Looking at your kid",
  "Pouring a drink",
  "Cleaning up after everyone goes to bed"
];

export default function ContentBrief() {
  const [brand, setBrand] = useState(null);
  const [feeling, setFeeling] = useState(null);
  const [moment, setMoment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [step, setStep] = useState(1);

  const config = brand ? BRAND_CONFIGS[brand] : BRAND_CONFIGS.no86;
  const accent = config.accent;

  const generateBrief = async () => {
    if (!brand || !feeling || !moment) return;
    setLoading(true);
    setBrief(null);
    setError(null);

    try {
      const response = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: BRAND_CONFIGS[brand].systemPrompt,
          messages: [{
            role: "user",
            content: `Feeling: ${feeling}\nMoment: ${moment}\n\nWrite one piece of content anchored to this exact combination.`
          }]
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
    setBrand(null); setFeeling(null); setMoment(null);
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
        {step > 1 && (
          <button onClick={reset} style={{ background: "transparent", border: `1px solid ${config.border}`, color: "#888", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace" }}>RESET</button>
        )}
      </div>

      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "28px 20px" }}>

        {/* 01 Brand */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>01 — Select Brand</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(BRAND_CONFIGS).map(([key, cfg]) => (
              <button key={key}
                onClick={() => { setBrand(key); setStep(Math.max(step, 2)); setBrief(null); setError(null); }}
                style={{ background: brand === key ? cfg.surface : "transparent", border: `1px solid ${brand === key ? cfg.accent : "#222"}`, borderRadius: "10px", padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: brand === key ? cfg.accent : "#CCC", marginBottom: "2px" }}>{cfg.label}</div>
                  <div style={{ fontSize: "12px", color: "#555", fontStyle: "italic" }}>{cfg.tagline}</div>
                </div>
                {brand === key && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.accent }} />}
              </button>
            ))}
          </div>
        </div>

        {/* 02 Feeling */}
        {step >= 2 && brand && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>02 — What Are You Feeling</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {FEELINGS.map((f) => (
                <button key={f}
                  onClick={() => { setFeeling(f); setStep(Math.max(step, 3)); }}
                  style={{ background: feeling === f ? config.surface : "transparent", border: `1px solid ${feeling === f ? accent : "#222"}`, borderRadius: "20px", padding: "9px 16px", cursor: "pointer", fontSize: "13px", color: feeling === f ? accent : "#888", fontWeight: feeling === f ? "600" : "400" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 03 Moment */}
        {step >= 3 && brand && feeling && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>03 — Pick the Moment</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {MOMENTS.map((m) => (
                <button key={m}
                  onClick={() => { setMoment(m); setBrief(null); setError(null); }}
                  style={{ background: moment === m ? config.surface : "transparent", border: `1px solid ${moment === m ? accent : "#222"}`, borderRadius: "8px", padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: "14px", color: moment === m ? accent : "#888", fontWeight: moment === m ? "600" : "400" }}>
                  {m}
                </button>
              ))}
            </div>

            {moment && !loading && !brief && (
              <button onClick={generateBrief} style={{ width: "100%", marginTop: "20px", background: accent, border: "none", borderRadius: "10px", padding: "16px", cursor: "pointer", fontSize: "14px", fontWeight: "700", color: "#000", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "monospace" }}>Generate Brief</button>
            )}

            {loading && (
              <div style={{ marginTop: "20px", textAlign: "center", padding: "20px", color: "#555", fontSize: "13px", fontFamily: "monospace" }}>
                <div style={{ width: "28px", height: "28px", border: `2px solid ${config.border}`, borderTop: `2px solid ${accent}`, borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
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
