import { useState, useRef } from "react";

const BRAND_CONFIGS = {
  no86: {
    label: "No. 86",
    accent: "#C8972A",
    bg: "#0E0B07",
    surface: "#1A1408",
    border: "#2A2010",
    tagline: "Keep the ritual. Lose the fog.",
    systemPrompt: `You write TikTok/Instagram content for No. 86, a non-alcoholic whiskey for men 30–45.

READING LEVEL: 5th–8th grade. Short sentences. Simple words. If a line sounds profound, rewrite it simpler. If it sounds like therapy or a TED Talk or a self-help tweet, delete it.

YOUR BEST-PERFORMING EXAMPLES:
"Nobody stops drinking because you made them feel bad about it."
"The goal isn't to never drink again. The goal is to never need to."
"Not one successful person got where they wanted by drinking more."
"I didn't quit drinking because I hated alcohol. I quit because I hated what it did to me."

What makes those work: simple words, complete thought, true. The reader thinks "that's true" — not "that's deep."

OPTIMIZE FOR: truth > insight. Clarity > depth. Shareability > poetry.

THE HOOK IS THE POST. It carries 70–80% of the value. The caption just supports it.

HOOK PROCESS: Generate 20 possible hooks internally. Pick the one that is most true, most simple, and most likely to be screenshotted and sent to a friend. Write everything else around that hook.

HOOK FORMAT — use one of these starters:
- "Nobody talks about…"
- "The goal isn't…"
- "I thought…"
- "One of the hardest parts…"
- "Most people don't realize…"
- "I finally realized…"
- "The truth is…"
- "Nobody tells you this part…"

HOOK LENGTH: 25–35 words.

CAPTION: 80–120 words. Supports the hook. Never repeats it. Short sentences. Real language. End with "That's why we made No. 86."

NEVER USE: "Here's the truth" / "The hard truth" / "soft ache" / "holding space" / "still hovering" / "waiting to arrive" / anything that sounds written

Hashtags: 5–8 relevant hashtags as a single space-separated string.
CTA: Soft. Max 12 words.

Return ONLY valid JSON: {"hook":"...","caption":"...","hashtags":"...","cta":"..."}`
  },
  clearmorning: {
    label: "Clear Morning",
    accent: "#4A9EBF",
    bg: "#060D12",
    surface: "#0A1520",
    border: "#102030",
    tagline: "A reality check before regret.",
    systemPrompt: `You write TikTok/Instagram content for Clear Morning, a free app for adults 30–45 (50% men, 50% women) who lose the 8–11pm window to bad habits.

READING LEVEL: 5th–8th grade. Short sentences. Simple words. If a line sounds profound, rewrite it simpler. If it sounds like therapy or a TED Talk or a self-help tweet, delete it.

YOUR BEST-PERFORMING EXAMPLES:
"Nobody folds in the morning. You fold at night, alone, when the day finally stops."
"Boredom isn't having nothing to do. It's feeling like something is missing."
"You don't even enjoy it anymore. You just don't know what to do with that hour."
"The hardest part isn't the habit. It's not knowing what you actually want instead."

What makes those work: simple words, complete thought, true. The reader thinks "that's true" — not "that's deep."

OPTIMIZE FOR: truth > insight. Clarity > depth. Shareability > poetry.

THE HOOK IS THE POST. It carries 70–80% of the value. The caption just supports it.

HOOK PROCESS: Generate 20 possible hooks internally. Pick the one that is most true, most simple, and most likely to be screenshotted and sent to a friend. Write everything else around that hook.

HOOK FORMAT — use one of these starters:
- "Nobody talks about…"
- "The goal isn't…"
- "I thought…"
- "One of the hardest parts…"
- "Most people don't realize…"
- "I finally realized…"
- "The truth is…"
- "Nobody tells you this part…"

HOOK LENGTH: 25–35 words.

CAPTION: 80–120 words. Supports the hook. Never repeats it. Short sentences. Real language. Mention the app once, softly — "free" and "60 seconds."

NEVER USE: "Here's the truth" / "The hard truth" / "soft ache" / "holding space" / "still hovering" / anything that sounds written

Hashtags: 5–8 relevant hashtags as a single space-separated string.
CTA: Drive to clear-morning-one.vercel.app. Max 12 words.

Return ONLY valid JSON: {"hook":"...","caption":"...","hashtags":"...","cta":"..."}`
  },
  personal: {
    label: "@mr.sailes",
    accent: "#8B5CF6",
    bg: "#080610",
    surface: "#100E1A",
    border: "#1E1830",
    tagline: "Father. Veteran. Builder.",
    systemPrompt: `You write TikTok/Instagram content for Sean's personal brand @mr.sailes — Navy veteran, father, husband, entrepreneur, Jiu-Jitsu practitioner, 11.5K followers, 676K likes.

READING LEVEL: 5th–8th grade. Short sentences. Simple words. If a line sounds profound, rewrite it simpler. If it sounds like therapy or a TED Talk or a self-help tweet, delete it.

YOUR BEST-PERFORMING EXAMPLES:
"I forgot who I was when I was sober."
"I want to impress myself."
"I thought sobriety would make life boring. I was wrong about a lot of things back then."
"I finally realized I wasn't tired. I was just not living the life I actually wanted."

What makes those work: first person, simple, true, earned. Sounds like someone who lived it — not someone writing about it.

OPTIMIZE FOR: truth > insight. Clarity > depth. Shareability > poetry.

THE HOOK IS THE POST. It carries 70–80% of the value. The caption just supports it.

HOOK PROCESS: Generate 20 possible hooks internally. Pick the one that is most true, most simple, and most likely to be screenshotted and sent to a friend. Write everything else around that hook.

HOOK FORMAT — use one of these starters:
- "Nobody talks about…"
- "The goal isn't…"
- "I thought…"
- "One of the hardest parts…"
- "Most people don't realize…"
- "I finally realized…"
- "The truth is…"
- "Nobody tells you this part…"

HOOK LENGTH: 25–35 words.

CAPTION: 80–120 words. Supports the hook. Never repeats it. First person. Short sentences. Real language. Close with identity. End: "If you can relate, maybe this account can help."

NEVER USE: "Here's the truth" / "The hard truth" / "Real talk" / "Most men" / "soft ache" / "holding space" / anything that sounds written

Hashtags: 5–8 relevant hashtags as a single space-separated string.
CTA: Soft. Community-building. Max 12 words.

Return ONLY valid JSON: {"hook":"...","caption":"...","hashtags":"...","cta":"..."}`
  }
};

const POST_TYPES = [
  "Contrarian Truth",
  "Hard-Earned Realization",
  "Perspective Shift",
  "Identity",
  "Observation"
];

const CONTENT_ANGLES = [
  "contrarian truth",
  "perspective shift",
  "hard-earned realization",
  "identity statement",
  "specific observation",
  "belief challenge",
  "lesson learned",
  "mistake"
];

const pick = (arr, exclude) => {
  const pool = exclude ? arr.filter((x) => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
};
const BRAND_KEYS = Object.keys(BRAND_CONFIGS);

export default function ContentBrief() {
  const [brand, setBrand] = useState(null);
  const [postType, setPostType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const lastAngle = useRef(null);

  const config = brand ? BRAND_CONFIGS[brand] : BRAND_CONFIGS.no86;
  const accent = config.accent;
  const canGenerate = brand && postType;

  const generateBrief = async (overrides = {}) => {
    const b = overrides.brand ?? brand;
    const pt = overrides.postType ?? postType;
    if (!b || !pt) return;
    setLoading(true);
    setBrief(null);
    setError(null);

    const angle = pick(CONTENT_ANGLES, lastAngle.current);
    lastAngle.current = angle;

    const userContent = `Post type: ${pt}\nContent angle: ${angle}\n\nGenerate a post. Every regeneration should explore a different tension or idea within this post type.`;

    try {
      const response = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: BRAND_CONFIGS[b].systemPrompt,
          messages: [{ role: "user", content: userContent }]
        })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const parsed = await response.json();
      if (parsed.error) throw new Error(parsed.error);
      setBrief(parsed);
    } catch {
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
    setBrand(null); setPostType(null); setBrief(null); setError(null);
    lastAngle.current = null;
  };

  return (
    <div style={{ minHeight: "100vh", background: brand ? config.bg : "#080808", fontFamily: "'Georgia', serif", color: "#E8E0D4", transition: "background 0.5s ease" }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${brand ? config.border : "#1A1A1A"}`, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: brand ? config.surface : "#0D0D0D" }}>
        <div>
          <div style={{ fontSize: "11px", letterSpacing: "3px", color: brand ? accent : "#666", textTransform: "uppercase", marginBottom: "4px", fontFamily: "monospace" }}>Daily Brief</div>
          <div style={{ fontSize: "20px", fontWeight: "700" }}>Content Generator</div>
        </div>
        {(brand || brief) && (
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
                onClick={() => { setBrand(key); setBrief(null); setError(null); }}
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

        {/* 02 Post Type */}
        {brand && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>02 — Post Type</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {POST_TYPES.map((pt) => (
                <button key={pt}
                  onClick={() => { setPostType(pt); setBrief(null); setError(null); }}
                  style={{ background: postType === pt ? config.surface : "transparent", border: `1px solid ${postType === pt ? accent : "#222"}`, borderRadius: "8px", padding: "13px 16px", cursor: "pointer", textAlign: "left", fontSize: "14px", color: postType === pt ? accent : "#888", fontWeight: postType === pt ? "600" : "400" }}>
                  {pt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate */}
        {canGenerate && !loading && !brief && (
          <button onClick={() => generateBrief()} style={{ width: "100%", background: accent, border: "none", borderRadius: "10px", padding: "16px", cursor: "pointer", fontSize: "14px", fontWeight: "700", color: "#000", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "monospace" }}>
            Generate
          </button>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "28px 20px", color: "#555", fontSize: "13px", fontFamily: "monospace" }}>
            <div style={{ width: "28px", height: "28px", border: `2px solid ${config.border}`, borderTop: `2px solid ${accent}`, borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
            WRITING YOUR BRIEF...
          </div>
        )}

        {error && (
          <div style={{ marginTop: "16px", padding: "14px", background: "#1A0A0A", border: "1px solid #3A1A1A", borderRadius: "8px", color: "#CC4444", fontSize: "13px", fontFamily: "monospace" }}>{error}</div>
        )}

        {/* Result */}
        {brief && (
          <div style={{ background: config.surface, border: `1px solid ${config.border}`, borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${config.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>Today's Brief — {config.label}</div>
              <button onClick={() => copy(`HOOK:\n${brief.hook}\n\nCAPTION:\n${brief.caption}${brief.hashtags ? `\n\nHASHTAGS:\n${brief.hashtags}` : ""}\n\nCTA:\n${brief.cta}`, "all")}
                style={{ background: copied === "all" ? accent : "transparent", border: `1px solid ${copied === "all" ? accent : config.border}`, color: copied === "all" ? "#000" : "#666", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                {copied === "all" ? "COPIED" : "COPY ALL"}
              </button>
            </div>

            {[
              { key: "hook", label: "🎬 Hook", field: brief.hook, style: { fontSize: "17px", fontWeight: "600", lineHeight: 1.5, color: "#F0E8DA" } },
              { key: "caption", label: "📝 Caption", field: brief.caption, style: { fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
              { key: "hashtags", label: "#  Hashtags", field: brief.hashtags, style: { fontSize: "13px", color: accent, lineHeight: 1.8 } },
              { key: "cta", label: "👉 CTA", field: brief.cta, style: { fontSize: "15px", fontWeight: "600", color: accent } }
            ].filter(({ field }) => field).map(({ key, label, field, style }, i, arr) => (
              <div key={key} style={{ padding: "20px", borderBottom: i < arr.length - 1 ? `1px solid ${config.border}` : "none" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", marginBottom: "10px", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
                <div style={{ marginBottom: "12px", ...style }}>{field}</div>
                <button onClick={() => copy(field, key)} style={{ background: "transparent", border: `1px solid ${config.border}`, color: copied === key ? accent : "#555", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                  {copied === key ? "✓ COPIED" : "COPY"}
                </button>
              </div>
            ))}

            <div style={{ padding: "16px 20px", borderTop: `1px solid ${config.border}`, display: "flex", gap: "10px" }}>
              <button onClick={() => generateBrief()} disabled={loading} style={{ flex: 1, background: "transparent", border: `1px solid ${config.border}`, color: "#555", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>↻ REGENERATE</button>
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
