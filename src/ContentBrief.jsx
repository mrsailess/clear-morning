import { useState, useRef } from "react";

const MODES = [
  { key: "social", label: "Social Post" },
  { key: "ugc", label: "Static UGC Image" },
  { key: "paid", label: "Paid Ad Image" }
];

const BRAND_CONFIGS = {
  no86: {
    label: "No. 86",
    accent: "#C8972A",
    bg: "#0E0B07",
    surface: "#1A1408",
    border: "#2A2010",
    tagline: "Keep the ritual. Lose the fog.",
    categories: {
      social: [
        "Emotional Truth",
        "Ritual & Lifestyle",
        "Founder Story",
        "Product Education",
        "Customer Story",
        "Social Proof"
      ],
      ugc: [
        "Problem Aware",
        "Ritual Replacement",
        "Morning After",
        "Taste Test",
        "Objection Handling",
        "Founder Story",
        "Use Case",
        "Partner Noticed",
        "After Work Silence",
        "Steak Night",
        "Patio Ritual",
        "Bar Cart"
      ],
      paid: [
        "Problem Aware",
        "Ritual Replacement",
        "Morning After",
        "Taste Test",
        "Objection Handling",
        "Founder Story",
        "Use Case",
        "Partner Noticed",
        "After Work Silence",
        "Steak Night",
        "Patio Ritual",
        "Bar Cart"
      ]
    },
    systemPrompt: `You write TikTok/Instagram content for No. 86, a non-alcoholic whiskey alternative for men 30–45.
READING LEVEL: 5th–8th grade. Short sentences. Simple words.
CORE MESSAGE:
Keep the ritual. Lose the fog.
NO. 86 CONTENT RULES:
Start with emotional truth.
Do not use labels like sobriety or recovery.
Make it feel like a real thought, not advice.
Agitate the moment. Call out boredom, silence, stress, routine.
Reframe with one simple insight.
Add white space.
Use this brand line one time only when it fits:
"That's why we made No. 86."
Close with identity: control, clarity, presence.
No preaching.
No "quit drinking."
No recovery identity framing.
No overexplaining.
CONTENT MIX:
Emotional Truth: feelings, habits, identity, night routine.
Ritual & Lifestyle: patio, steak night, game night, bar cart, firepit, dinner, quiet night.
Founder Story: why I made it, 172 formulas, mistakes, bad reviews, first wins, building in public.
Product Education: how to drink it, what it tastes like, why it is not exact bourbon, oak, smoke, vanilla, caramel.
Customer Story: customer moments, reviews, feedback, objections, reactions.
Social Proof: awards, reviews, Amazon, bars, wholesale, testimonials.
YOUR BEST-PERFORMING EXAMPLES:
"Nobody stops drinking because you made them feel bad about it."
"The goal isn't to never drink again. The goal is to never need to."
"Not one successful person got where they wanted by drinking more."
"I didn't quit drinking because I hated alcohol. I quit because I hated what it did to me."
HOOK PROCESS:
Generate 20 possible hooks internally.
Pick the one that is most true, simple, and shareable.
The hook is the post.
HOOK FORMAT:
Use one of these starters:
"Nobody talks about..."
"The goal isn't..."
"I thought..."
"One of the hardest parts..."
"Most people don't realize..."
"I finally realized..."
"The truth is..."
"Nobody tells you this part..."
HOOK LENGTH:
25–35 words.
CAPTION:
Around 45–90 words.
Short sentences.
Real language.
Never repeat the hook.
End naturally.
Use "That's why we made No. 86." only if it fits.
HASHTAGS:
5–8 relevant hashtags as one space-separated string.
CTA:
Soft. Max 12 words.
NEVER USE:
"Here's the truth"
"The hard truth"
"soft ache"
"holding space"
"still hovering"
"quit drinking"
"recovery"
"sober community"
Return ONLY valid JSON:
{"hook":"...","caption":"...","hashtags":"...","cta":"..."}`,
    imageSystemPrompt: `You write static image ad concepts for No. 86, a non-alcoholic whiskey alternative for men 30–45.
BRAND VOICE: Calm. Masculine. Direct. Premium.
CORE MESSAGE: Keep the ritual. Lose the fog.
IMAGE RULES:
This is a still image, not video.
The image should feel like UGC, not a studio ad.
Describe the scene clearly: lighting, setting, props, mood, subject.
The on-screen text must carry the entire ad by itself.
On-screen text: 25 to 40 words. Short lines. White space between them.
Start with emotional truth.
Make No. 86 feel like the natural next step.
Do not say sobriety, recovery, or quit drinking.
Do not overclaim health benefits.
Do not say it tastes exactly like bourbon.
Do not use em dashes.
Do not make it sound like therapy.
Do not make it sound like a motivational quote.
ON-SCREEN TEXT STYLE:
"Most people do not want the drink. They want the day to stop asking things from them.
That is the ritual No. 86 was made for."
"The drink after work was never just about alcohol.
It was the glass. The ice. The pause.
No. 86 keeps the ritual without borrowing from tomorrow."
"I did not miss drinking as much as I missed the signal.
Work is done. The day is over. Nobody needs anything from me right now."
CAPTION:
40–80 words. Supports the image. Short sentences. Never repeats the on-screen text.
CTA:
Soft for UGC. Conversion-focused for paid ads. Max 12 words.
HASHTAGS:
5–8 relevant hashtags as one space-separated string.
ANGLE: One-word or short-phrase creative direction (e.g. "quiet night ritual", "morning clarity", "after work pause").
CREATOR TYPE: Who shoots this. e.g. "home bartender", "30s professional male", "lifestyle creator".
PHOTO PROMPT RULES:
Generate a detailed photography prompt for this specific image concept.
The prompt is for a real photographer or AI image tool.
Vertical 4:5 format for Instagram and TikTok.
STEP 1 — CHOOSE THE RIGHT SETTING:
Do not default to patio every time. Pick the setting that best fits the emotional idea.
Location pool: modern patio at blue hour, backyard firepit, kitchen counter after work, steak night table, garage after a long day, quiet living room, couch during a game, bar cart at home, hotel room after travel, cabin weekend, apartment balcony, home office after work, grill night, front porch, basement lounge, empty dining table after dinner, workshop or garage bench.
Category-to-setting guide:
After Work Silence: patio, home office, kitchen counter, apartment balcony.
Steak Night: dinner table, grill, kitchen island.
Bar Cart: home bar corner, living room, cabinet, shelf.
Morning After: kitchen morning light, bedroom nightstand, bathroom mirror, coffee counter.
Founder Story: workspace, kitchen counter, formula notes, garage table.
Partner Noticed: quiet living room, dinner cleanup, shared kitchen.
Taste Test: kitchen island, rocks glass, bottle nearby.
Patio Ritual: patio, firepit, porch, backyard.
Use Case: game night, steak night, travel, grill, couch, firepit.
STEP 2 — VARY THE SHOT WITHIN THE SETTING:
Even when the location is the same, the shot should feel different. Use these levers:
TIME OF DAY: blue hour, morning light, golden hour, late night, overcast afternoon. Match to mood.
SITUATION: alone after work, cleaning up after dinner, sitting before a pour, mid-pour, holding the glass, phone face down, laptop just closed, staring at nothing, first quiet moment of the day.
FRAMING: wide shot showing full environment, medium shot at table or counter, close on hands and glass, viewed from doorway or across the room, bottle at edge of frame, bottle partially visible in background.
MOOD: relief, quiet reset, earned calm, private pride, clarity, reward without chaos. Name it and build the shot around it.
STEP 3 — APPLY NO. 86 VISUAL BONES:
Real person. Real moment. Natural lighting. Bottle visible but not the hero.
Rocks glass, ice, pour, or ritual cue when appropriate.
Slightly imperfect UGC composition. Premium but understated.
Calm, masculine, human. Emotional story first. Product as part of the ritual, not the subject.
Man in his late 30s to early 40s. Relaxed, not posing. Gaze away from camera.
Natural depth of field. Light film grain. Documentary photography style.
Shot like a real creator captured a genuine moment, not a commercial campaign.
NEGATIVE PROMPTS (always include): family focus, children, party, celebration, bar scene, smiling at camera, influencer pose, product advertisement, hero bottle shot, studio lighting, stock photography, corporate branding, luxury marketing aesthetic, CGI, text, watermark, hyper-sharp bottle, exaggerated emotions.
NEVER USE:
"Here's the truth" / "The hard truth" / "soft ache" / "holding space" / "quit drinking" / "recovery" / "sober community"
Return ONLY valid JSON:
{"angle":"...","imageConcept":"...","creatorType":"...","onScreenText":"...","caption":"...","cta":"...","hashtags":"...","photoPrompt":"..."}`
  },
  personal: {
    label: "@mr.sailes",
    accent: "#8B5CF6",
    bg: "#080610",
    surface: "#100E1A",
    border: "#1E1830",
    tagline: "Father. Veteran. Builder.",
    categories: {
      social: [
        "Personal Realization",
        "Fatherhood",
        "Business",
        "Discipline",
        "Veteran Mindset",
        "Building In Public"
      ],
      ugc: [
        "Personal Realization",
        "Fatherhood",
        "Business",
        "Discipline",
        "Veteran Mindset",
        "Building In Public"
      ],
      paid: [
        "Personal Realization",
        "Fatherhood",
        "Business",
        "Discipline",
        "Veteran Mindset",
        "Building In Public"
      ]
    },
    systemPrompt: `You write TikTok/Instagram content for Sean's personal brand @mr.sailes.
Sean is a Navy veteran, father, husband, entrepreneur, Jiu-Jitsu practitioner, and builder.
READING LEVEL:
5th–8th grade.
Short sentences.
Simple words.
VOICE:
First person.
Simple.
True.
Earned.
Sounds like someone who lived it.
Not motivational speaker.
Not self-help.
Not therapy language.
YOUR BEST-PERFORMING EXAMPLES:
"I forgot who I was when I was sober."
"I want to impress myself."
"I thought sobriety would make life boring. I was wrong about a lot of things back then."
"I finally realized I wasn't tired. I was just not living the life I actually wanted."
CONTENT CATEGORIES:
Personal Realization: self-awareness, habits, identity, life change.
Fatherhood: lessons with kids, being present, example-setting.
Business: building, money pressure, Amazon, No. 86, failure, momentum.
Discipline: gym, Jiu-Jitsu, routine, standards.
Veteran Mindset: service, pressure, leadership, resilience.
Building In Public: behind the scenes, wins, mistakes, lessons.
HOOK PROCESS:
Generate 20 possible hooks internally.
Pick the one that is most true, simple, and shareable.
HOOK FORMAT:
Use one of these starters:
"Nobody talks about..."
"The goal isn't..."
"I thought..."
"One of the hardest parts..."
"Most people don't realize..."
"I finally realized..."
"The truth is..."
"Nobody tells you this part..."
HOOK LENGTH:
25–35 words.
CAPTION:
80–120 words.
First person.
Short sentences.
Real language.
Close with identity.
End with:
"If you can relate, maybe this account can help."
HASHTAGS:
5–8 relevant hashtags as one space-separated string.
CTA:
Soft. Community-building. Max 12 words.
NEVER USE:
"Here's the truth"
"The hard truth"
"Real talk"
"Most men"
"soft ache"
"holding space"
"anything that sounds written"
Return ONLY valid JSON:
{"hook":"...","caption":"...","hashtags":"...","cta":"..."}`,
    imageSystemPrompt: `You write static image content concepts for Sean's personal brand @mr.sailes.
Sean is a Navy veteran, father, husband, entrepreneur, Jiu-Jitsu practitioner, and builder.
VOICE: First person. Simple. True. Earned. Sounds like someone who lived it.
IMAGE RULES:
This is a still image, not video.
The image should feel authentic, not staged.
Describe the scene clearly: setting, lighting, mood, subject.
The on-screen text must carry the entire post by itself.
On-screen text: 25 to 40 words. Short lines. White space between them.
First person. Direct. Earned. Not a motivational quote.
Do not use em dashes.
Do not make it sound like therapy or self-help.
CAPTION:
60–100 words. First person. Short sentences. Close with identity.
End with: "If you can relate, maybe this account can help."
CTA:
Soft. Community-building. Max 12 words.
HASHTAGS:
5–8 relevant hashtags as one space-separated string.
ANGLE: One-word or short-phrase creative direction.
CREATOR TYPE: Who shoots this. e.g. "Sean filming himself", "lifestyle moment", "candid at home".
Return ONLY valid JSON:
{"angle":"...","imageConcept":"...","creatorType":"...","onScreenText":"...","caption":"...","cta":"...","hashtags":"..."}`
  }
};

const CONTENT_ANGLES = [
  "contrarian truth",
  "specific observation",
  "hard-earned realization",
  "mistake",
  "lesson learned",
  "identity shift",
  "behind the scenes",
  "belief challenge"
];

const pick = (arr, exclude) => {
  const pool = exclude ? arr.filter((x) => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
};

const isImageMode = (m) => m === "ugc" || m === "paid";

export default function ContentBrief() {
  const [brand, setBrand] = useState(null);
  const [mode, setMode] = useState("social");
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const lastAngle = useRef(null);

  const config = brand ? BRAND_CONFIGS[brand] : BRAND_CONFIGS.no86;
  const accent = config.accent;
  const canGenerate = brand && category;

  const getSystemPrompt = (b, m) =>
    isImageMode(m) ? BRAND_CONFIGS[b].imageSystemPrompt : BRAND_CONFIGS[b].systemPrompt;

  const generateBrief = async (overrides = {}) => {
    const b = overrides.brand ?? brand;
    const m = overrides.mode ?? mode;
    const c = overrides.category ?? category;
    if (!b || !c) return;
    setLoading(true);
    setBrief(null);
    setError(null);

    const angle = pick(CONTENT_ANGLES, lastAngle.current);
    lastAngle.current = angle;

    const modeInstruction = m === "ugc"
      ? "Generate a still-image UGC concept with 25 to 40 words of on-screen text. Feel like a real person posted it."
      : m === "paid"
      ? "Generate a still-image paid ad concept with 25 to 40 words of on-screen text and a stronger sales angle. Same UGC feel, but sharper product benefit and clearer CTA."
      : "Generate a post. Every regeneration should explore a different tension, moment, or idea inside this category.";

    const userContent = `Content mode: ${m === "ugc" ? "Static UGC Image" : m === "paid" ? "Paid Ad Image" : "Social Post"}
Content category: ${c}
Content angle: ${angle}
${modeInstruction}`;

    try {
      const response = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: getSystemPrompt(b, m),
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
    setBrand(null);
    setMode("social");
    setCategory(null);
    setBrief(null);
    setError(null);
    lastAngle.current = null;
  };

  const getSocialCopyAll = (b) =>
    `HOOK:\n${b.hook}\n\nCAPTION:\n${b.caption}${b.hashtags ? `\n\nHASHTAGS:\n${b.hashtags}` : ""}\n\nCTA:\n${b.cta}`;

  const getImageCopyAll = (b) =>
    `ANGLE:\n${b.angle}\n\nIMAGE CONCEPT:\n${b.imageConcept}\n\nCREATOR TYPE:\n${b.creatorType}\n\nON-SCREEN TEXT:\n${b.onScreenText}\n\nCAPTION:\n${b.caption}${b.hashtags ? `\n\nHASHTAGS:\n${b.hashtags}` : ""}\n\nCTA:\n${b.cta}${b.photoPrompt ? `\n\nPHOTO PROMPT:\n${b.photoPrompt}` : ""}`;

  const socialFields = brief ? [
    { key: "hook", label: "Hook", field: brief.hook, style: { fontSize: "17px", fontWeight: "600", lineHeight: 1.5, color: "#F0E8DA" } },
    { key: "caption", label: "Caption", field: brief.caption, style: { fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
    { key: "hashtags", label: "Hashtags", field: brief.hashtags, style: { fontSize: "13px", color: accent, lineHeight: 1.8 } },
    { key: "cta", label: "CTA", field: brief.cta, style: { fontSize: "15px", fontWeight: "600", color: accent } }
  ] : [];

  const imageFields = brief ? [
    { key: "angle", label: "Angle", field: brief.angle, style: { fontSize: "13px", color: accent, fontWeight: "600", letterSpacing: "0.5px" } },
    { key: "imageConcept", label: "Image Concept", field: brief.imageConcept, style: { fontSize: "14px", lineHeight: "1.7", color: "#C8C0B4", fontStyle: "italic" } },
    { key: "creatorType", label: "Creator Type", field: brief.creatorType, style: { fontSize: "13px", color: "#A09890" } },
    { key: "onScreenText", label: "On-Screen Text", field: brief.onScreenText, style: { fontSize: "17px", fontWeight: "600", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#F0E8DA" } },
    { key: "caption", label: "Caption", field: brief.caption, style: { fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
    { key: "hashtags", label: "Hashtags", field: brief.hashtags, style: { fontSize: "13px", color: accent, lineHeight: 1.8 } },
    { key: "cta", label: "CTA", field: brief.cta, style: { fontSize: "15px", fontWeight: "600", color: accent } },
    { key: "photoPrompt", label: "Photo Prompt", field: brief.photoPrompt, style: { fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap", color: "#A09890", fontFamily: "monospace" } }
  ] : [];

  const activeFields = isImageMode(mode) ? imageFields : socialFields;

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
          <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>01 Select Brand</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(BRAND_CONFIGS).map(([key, cfg]) => (
              <button key={key}
                onClick={() => { setBrand(key); setCategory(null); setBrief(null); setError(null); }}
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

        {/* 02 Mode */}
        {brand && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>02 Mode</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {MODES.map((m) => (
                <button key={m.key}
                  onClick={() => { setMode(m.key); setCategory(null); setBrief(null); setError(null); }}
                  style={{ flex: 1, background: mode === m.key ? config.surface : "transparent", border: `1px solid ${mode === m.key ? accent : "#222"}`, borderRadius: "8px", padding: "10px 8px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", color: mode === m.key ? accent : "#666", fontWeight: mode === m.key ? "700" : "400", letterSpacing: "0.5px", textTransform: "uppercase", textAlign: "center" }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 03 Category */}
        {brand && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>03 Content Category</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {config.categories[mode].map((cat) => (
                <button key={cat}
                  onClick={() => { setCategory(cat); setBrief(null); setError(null); }}
                  style={{ background: category === cat ? config.surface : "transparent", border: `1px solid ${category === cat ? accent : "#222"}`, borderRadius: "8px", padding: "13px 16px", cursor: "pointer", textAlign: "left", fontSize: "14px", color: category === cat ? accent : "#888", fontWeight: category === cat ? "600" : "400" }}>
                  {cat}
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
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>
                {MODES.find((m) => m.key === mode)?.label} | {config.label}
              </div>
              <button
                onClick={() => copy(isImageMode(mode) ? getImageCopyAll(brief) : getSocialCopyAll(brief), "all")}
                style={{ background: copied === "all" ? accent : "transparent", border: `1px solid ${copied === "all" ? accent : config.border}`, color: copied === "all" ? "#000" : "#666", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                {copied === "all" ? "COPIED" : "COPY ALL"}
              </button>
            </div>

            {activeFields.filter(({ field }) => field).map(({ key, label, field, style }, i, arr) => (
              <div key={key} style={{ padding: "20px", borderBottom: i < arr.length - 1 ? `1px solid ${config.border}` : "none" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", marginBottom: "10px", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
                <div style={{ marginBottom: "12px", ...style }}>{field}</div>
                <button onClick={() => copy(field, key)} style={{ background: "transparent", border: `1px solid ${config.border}`, color: copied === key ? accent : "#555", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                  {copied === key ? "COPIED" : "COPY"}
                </button>
              </div>
            ))}

            <div style={{ padding: "16px 20px", borderTop: `1px solid ${config.border}`, display: "flex", gap: "10px" }}>
              <button onClick={() => generateBrief()} disabled={loading} style={{ flex: 1, background: "transparent", border: `1px solid ${config.border}`, color: "#555", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>REGENERATE</button>
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
