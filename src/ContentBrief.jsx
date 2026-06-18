import { useState, useRef } from "react";

const MODES = [
  { key: "social", label: "Social Post" },
  { key: "ugc", label: "UGC Image" },
  { key: "paid", label: "Conversion Image" }
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
TOP-OF-FUNNEL RULE — THE MOST IMPORTANT RULE:
The strongest No. 86 post did not mention No. 86 in the on-screen text.
It worked because the text expressed a human truth about the after-work ritual.
For top-of-funnel content, the hook and on-screen text should usually NOT mention No. 86.
Focus on: the private feeling, the ritual, the silence, the reason behind the drink, the morning-after tradeoff, the identity shift, the moment the day finally stops asking something of you.
The image shows the bottle naturally.
The caption bridges to No. 86.
The CTA softly invites trial or conversation.
SHAREABILITY TEST: Prefer text that someone could share even if they have never heard of No. 86.
REJECT on-screen text that sounds like: a product ad, a tasting note, a brand slogan, a sales pitch, an explanation of what No. 86 is.
GOOD EXAMPLE: "Most people do not realize the drink after work is not about the drink. It is about the 20 minutes of silence nobody gave you all day."
BAD EXAMPLE: "No. 86 is a smoky, vanilla, caramel whiskey alternative for your after-work ritual."
STRUCTURE: On-screen text = human truth. Image = ritual with bottle present. Caption = bridge to No. 86. CTA = soft conversation or trial.
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
PHOTO PROMPT:
Also generate a photoPrompt for this post using the No. 86 master template.
Do not write a new prompt from scratch. Only write the STORY SECTION for this specific post, then assemble the full prompt.
STORY SECTION RULES:
4 to 8 short lines. Write what is happening emotionally, not physically. No full sentences required.
Example: The first quiet moment he has had all day. Nobody needs anything from him. No meetings. No notifications. Just twenty uninterrupted minutes. The workday is over. The ritual has begun.
NO. 86 MASTER TEMPLATE — assemble photoPrompt using this structure exactly:
Use the attached No. 86 bottle as the exact product reference. Vertical 4:5 lifestyle photograph for Instagram and TikTok. A candid UGC-style photograph captured during a genuine everyday moment. The No. 86 bottle should appear naturally within the environment and never feel like the subject of the image. It should feel like part of an existing ritual rather than a product placement. The image should feel observed rather than directed. The subject is not posing. No eye contact with the camera. No smiling for the camera. No staged feeling. VISUAL STORY: [YOUR STORY SECTION] SUBJECT RACE: Do not default to white. For this specific image, use one of the following — chosen randomly, not repeated consecutively: Black man, Latino man, mixed race man, South Asian man, Middle Eastern man, ambiguous ethnicity. Pick one now and apply it consistently throughout the image. Do not call attention to it. Just let it be the person in the photo. SUBJECT DIRECTION: The man in this image should make the viewer think: I want to be that guy right now. Not: I feel bad for that guy. POSTURE: Settled. Weight back or elbows resting. The posture of a man who has earned the right to stop moving. Comfortable, not collapsed. Not hunched. Not stiff. FACE: Neutral to quietly satisfied. Not smiling for the camera. Not frowning. The expression of a man who just exhaled. Slight jaw release. Eyes relaxed, not heavy. Looking at the glass, the middle distance, or the yard. Not down at the floor. ENERGY: Still. Not restless. He is not checking his phone. He is not thinking about the next thing. He is the only person in the world who is not currently being asked for something. ASPIRATION: He does not look like he is escaping something. He looks like he has arrived somewhere. Escape is desperate. Arrival is earned. The viewer should feel relief by proxy. They look at the image and their own shoulders drop slightly. EMOTIONAL DIRECTION: This image communicates arrival, not escape. The difficult part of the day is already over. The feeling is: nobody needs anything from me right now. If the expression reads as sad, tired, or troubled, it is wrong. The correct expression is a man who just sat down and realized he has nowhere to be. PHOTOGRAPHY STYLE: Authentic UGC. Documentary photography. Lifestyle editorial. Natural depth of field. Light film grain. Slightly imperfect composition. Real-world lighting. Emotional storytelling. Premium but understated. The environment should feel lived in rather than styled. BRAND MOOD: Relief. Presence. Clarity. Calm. Self-control. Mental reset. Ownership of time. Quiet confidence. The mood should feel masculine, grounded, and emotionally mature. NEGATIVE PROMPTS: Sadness. Depression. Loneliness. Heartbreak. Grief. Emotional distress. Burnout. Defeat. Frustration. Exhaustion. Slumped posture. Head down in defeat. Crying. Party scene. Family focus. Children. Celebration. Bar scene. Influencer pose. Hero bottle shot. Studio lighting. Stock photography. Corporate branding. Luxury marketing aesthetic. Executive portrait. CGI. Text. Watermark. Exaggerated emotions. Perfectly staged composition. Hyper-sharp bottle. Commercial product photography.
Return ONLY valid JSON:
{"hook":"...","caption":"...","hashtags":"...","cta":"...","photoPrompt":"..."}`,
    imageSystemPrompt: `You write static image ad concepts for No. 86, a non-alcoholic whiskey alternative for men 30–45.
BRAND VOICE: Calm. Masculine. Direct. Premium.
CORE MESSAGE: Keep the ritual. Lose the fog.
MODE DEFINITIONS:
UGC Image: Turns a human truth into a natural still-image post. Feels like a real person posted it, not a brand ad. Do not hard sell. Start with the human truth.
Conversion Image: Same emotional truth as UGC, but make the product bridge slightly clearer in the caption. Still social-first. Still not salesy. Create purchase intent without sounding desperate.
THE ONLY RULE THAT MATTERS:
Say the true thing cleanly. Let it land. Do not explain it.
Your best lines do not try to be deep. They just are true.
TOP-OF-FUNNEL RULE:
For UGC Image mode, do NOT mention No. 86 in the on-screen text unless the category is Taste Test, Objection Handling, Founder Story, or Social Proof.
For Conversion Image mode, No. 86 can appear in the on-screen text, but only if the emotional truth is stronger with it. If not, keep the product name in the caption instead.
ALL MODES REJECT: Buy now / product advertisement / tasting note first / brand slogan / hard sell / wellness promise / sobriety pitch.
STRUCTURE: On-screen text = human truth. Image = bottle present but natural. Caption = bridge to No. 86. CTA = soft conversation or trial.
WHAT NO. 86 SOUNDS LIKE:
"The drink after work was never just the drink.
It was the pause. The glass. The moment nobody needed anything from me.
That is the part I did not want to lose."
"Most people do not miss alcohol as much as they miss the signal around it.
Work is over. The phone can wait. Nobody needs anything right now."
"Most people do not want the drink.
They want the moment after it.
The pause. The exhale. The sign that the day is finally done.
No. 86 was made for that."
WHAT NO. 86 DOES NOT SOUND LIKE:
Shame framing. Do not write "Everyone told me I drank too much."
Defensive framing. Do not write "They were half right."
Salesy claims. Do not write "No. 86 fixed that part."
Therapy language. Do not use nervous system, cortisol, dopamine, healing, holding space.
Explained insight. Do not over-explain the truth. Say it and stop.
Punchline product. The product is the natural answer, not the reveal.
IMAGE RULES:
This is a still image, not video.
The image should feel like UGC, not a studio ad.
Describe the scene clearly: lighting, setting, props, mood, subject.
The on-screen text must carry the entire ad by itself.
On-screen text: 25 to 40 words. Short lines. White space between them.
Do not use em dashes.
CAPTION:
40–80 words. Supports the image. Short sentences. Never repeats the on-screen text.
End with "That's why we made No. 86." only if it fits naturally.
CTA FOR UGC (Social Post or Static UGC Image):
Invite conversation. Build community. Max 12 words.
Good examples: "What tells your day it is over?" / "What does your version of this look like?"
CTA FOR PAID ADS:
Slightly stronger product bridge. Still calm. Max 12 words.
Good examples: "Try No. 86 tonight." / "Keep the ritual. Link in bio."
HASHTAGS:
5–8 relevant hashtags as one space-separated string.
ANGLE: Short phrase creative direction. e.g. "the ritual was the real thing", "after work silence", "morning clarity".
CREATOR TYPE: Who shoots this. e.g. "30s professional male at home", "lifestyle creator", "founder POV".
NEVER USE:
"Here's the truth" / "The hard truth" / "soft ache" / "holding space" / "quit drinking" / "recovery" / "sober community" / "nervous system" / "fixed that part" / "they were right" / anything defensive or shame-based.
PHOTO PROMPT RULES:
Do not write a new prompt from scratch. Use the No. 86 master template below.
Only write the STORY SECTION — 4 to 8 short lines that describe the specific emotional moment for this post.
Then assemble the full prompt by inserting the story into the template.
STORY SECTION RULES:
Write what is happening emotionally, not physically.
Short lines. No full sentences required.
Example for after work silence: The first quiet moment he has had all day. Nobody needs anything from him. No meetings. No notifications. No demands. Just twenty uninterrupted minutes. The workday is over. The ritual has begun.
Example for steak night: The grill is off. The plates are clear. The evening belongs to him now. No agenda. No rush. Just the next hour.
NO. 86 MASTER TEMPLATE — assemble the full photoPrompt using this structure exactly:
Use the attached No. 86 bottle as the exact product reference. Vertical 4:5 lifestyle photograph for Instagram and TikTok. A candid UGC-style photograph captured during a genuine everyday moment. The No. 86 bottle should appear naturally within the environment and never feel like the subject of the image. It should feel like part of an existing ritual rather than a product placement. The image should feel observed rather than directed. The subject is not posing. No eye contact with the camera. No smiling for the camera. No staged feeling. VISUAL STORY: [YOUR STORY SECTION] SUBJECT RACE: Do not default to white. For this specific image, use one of the following — chosen randomly, not repeated consecutively: Black man, Latino man, mixed race man, South Asian man, Middle Eastern man, ambiguous ethnicity. Pick one now and apply it consistently throughout the image. Do not call attention to it. Just let it be the person in the photo. SUBJECT DIRECTION: The man in this image should make the viewer think: I want to be that guy right now. Not: I feel bad for that guy. POSTURE: Settled. Weight back or elbows resting. The posture of a man who has earned the right to stop moving. Comfortable, not collapsed. Not hunched. Not stiff. FACE: Neutral to quietly satisfied. Not smiling for the camera. Not frowning. The expression of a man who just exhaled. Slight jaw release. Eyes relaxed, not heavy. Looking at the glass, the middle distance, or the yard. Not down at the floor. ENERGY: Still. Not restless. He is not checking his phone. He is not thinking about the next thing. He is the only person in the world who is not currently being asked for something. ASPIRATION: He does not look like he is escaping something. He looks like he has arrived somewhere. Escape is desperate. Arrival is earned. The viewer should feel relief by proxy. They look at the image and their own shoulders drop slightly. EMOTIONAL DIRECTION: This image communicates arrival, not escape. The difficult part of the day is already over. The feeling is: nobody needs anything from me right now. If the expression reads as sad, tired, or troubled, it is wrong. The correct expression is a man who just sat down and realized he has nowhere to be. PHOTOGRAPHY STYLE: Authentic UGC. Documentary photography. Lifestyle editorial. Natural depth of field. Light film grain. Slightly imperfect composition. Real-world lighting. Emotional storytelling. Premium but understated. The environment should feel lived in rather than styled. BRAND MOOD: Relief. Presence. Clarity. Calm. Self-control. Mental reset. Ownership of time. Quiet confidence. The mood should feel masculine, grounded, and emotionally mature. NEGATIVE PROMPTS: Sadness. Depression. Loneliness. Heartbreak. Grief. Emotional distress. Burnout. Defeat. Frustration. Exhaustion. Slumped posture. Head down in defeat. Crying. Party scene. Family focus. Children. Celebration. Bar scene. Influencer pose. Hero bottle shot. Studio lighting. Stock photography. Corporate branding. Luxury marketing aesthetic. Executive portrait. CGI. Text. Watermark. Exaggerated emotions. Perfectly staged composition. Hyper-sharp bottle. Commercial product photography.
NEVER USE:
sobriety / recovery / quit drinking / nervous system / fixed that part / they were right / anything defensive or shame-based.
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
        "Sober Realization",
        "Fatherhood",
        "Business Pressure",
        "Discipline",
        "Veteran Mindset",
        "Things I Wish I Knew",
        "Building In Public"
      ],
      ugc: [
        "Sober Realization",
        "Day Count Reflection",
        "Old Me vs New Me",
        "Fatherhood Wake-Up",
        "Hard Lesson",
        "Things I Wish I Knew",
        "Discipline Reminder",
        "Marriage / Family Lesson",
        "Business Pressure",
        "Veteran Perspective"
      ],
      paid: [
        "Sober Realization",
        "Day Count Reflection",
        "Old Me vs New Me",
        "Fatherhood Wake-Up",
        "Hard Lesson",
        "Things I Wish I Knew",
        "Discipline Reminder",
        "Marriage / Family Lesson",
        "Business Pressure",
        "Veteran Perspective"
      ]
    },
    systemPrompt: `You write TikTok/Instagram content for Sean's personal brand @mr.sailes.
Sean is a Black Navy veteran, father of two mixed-race kids, husband, entrepreneur (No. 86, Amazon), Jiu-Jitsu practitioner, and builder. He is in his late 30s. He has been through it. He figured some things out the hard way. He shares what actually helped.
READING LEVEL: 5th–8th grade. Short sentences. Simple words.
VOICE: First person. Simple. True. Earned. Sounds lived, not written. Not a motivational speaker. Not a therapist. Not a brand.
YOUR WINNING CONTENT FORMATS:
Use one of these structures as the foundation:
"I didn't quit drinking because..."
"I thought sobriety would..."
"Nobody talks about..."
"The goal isn't..."
"One of the hardest parts..."
"Things I wish I knew..."
"Day [number] sober..."
"I finally realized..."
"I used to think..."
"Nobody stops drinking because..."
"I want to impress myself..."
"I forgot who I was when..."
YOUR BEST-PERFORMING EXAMPLES:
"I forgot who I was when I was sober."
"I want to impress myself."
"I thought sobriety would make life boring. I was wrong about a lot of things back then."
"I finally realized I wasn't tired. I was just not living the life I actually wanted."
HOOK PROCESS: Generate 20 possible hooks internally. Pick the one that is most true, simple, and shareable.
HOOK LENGTH: 25–35 words.
CAPTION: 80–120 words. First person. Short sentences. Real language. Close with identity. End with "If you can relate, maybe this account can help." only when it fits naturally. Otherwise end with a simple identity-based close.
HASHTAGS: 5–8 relevant hashtags as one space-separated string.
CTA: Soft. Community-building. Max 12 words.
NEVER USE: "Here's the truth" / "The hard truth" / "Real talk" / "soft ache" / "holding space" / anything that sounds written or coached.
AVOID generic "most men" advice. If you speak to men, make it specific, earned, and real.
DO NOT overuse God or faith unless the selected category specifically calls for it.
Return ONLY valid JSON:
{"hook":"...","caption":"...","hashtags":"...","cta":"..."}`,
    imageSystemPrompt: `You write TikTok-style static image content for Sean's personal brand @mr.sailes.
Sean is a Black Navy veteran, father, husband, entrepreneur, and Jiu-Jitsu practitioner in his late 30s.
VOICE: First person. Simple. True. Earned. Sounds lived, not written.
THIS IS NOT A POLISHED LIFESTYLE AD.
This should look like a paused TikTok frame, casual selfie post, or phone-shot image. The photo should feel like Sean captured a real moment, not a creator campaign.
COMMON VISUAL STYLES FOR SEAN:
Sean sitting in a car. Sean walking outside. Sean at home. Sean on a porch. Sean in a gym parking lot. Sean at a kitchen counter. Sean in a quiet office or workspace. Normal daylight or indoor ambient light. Slightly imperfect crop. Face visible when appropriate. Sunglasses or hat allowed. Real background. No studio lighting. No polished influencer pose.
The on-screen text carries the post. The image supports the words.
ON-SCREEN TEXT RULES:
25 to 55 words. Short lines. White space allowed. First person. Blunt. Earned. Can mention sober or drinking. Cannot sound like a therapist, motivational speaker, or brand. No em dashes. No generic advice. No fake certainty. No shame-first copy.
CAPTION: 60–100 words. First person. Short sentences. Close with identity. End with "If you can relate, maybe this account can help." only when it fits. Otherwise end naturally.
CTA: Soft. Community-building. Max 12 words.
HASHTAGS: 5–8 relevant hashtags as one space-separated string.
ANGLE: Short-phrase creative direction for this post.
CREATOR TYPE: Who shoots this. e.g. "Sean selfie in car", "candid at home", "walking shot outdoors".
PHOTO PROMPT RULES:
Generate a photoPrompt describing a casual TikTok-style still image.
Describe: setting, phone-shot style, subject posture, facial expression, lighting, framing, background, where on-screen text could sit.
The subject is a Black man in his late 30s. Authentic look. Not model-perfect. Real person energy.
Do NOT generate text inside the photo. The onScreenText field is separate.
NEGATIVE PROMPTS (always include): studio lighting, commercial photography, influencer pose, fake smile, motivational poster, corporate branding, luxury ad, overly polished, stock photo, exaggerated emotion, text in image, watermark.
Return ONLY valid JSON:
{"angle":"...","imageConcept":"...","creatorType":"...","onScreenText":"...","photoPrompt":"...","caption":"...","cta":"...","hashtags":"..."}`
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
          messages: [{ role: "user", content: userContent }],
          max_tokens: isImageMode(m) ? 1500 : b === "no86" ? 1200 : 500
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Server ${response.status}: ${errData.error || errData.detail || JSON.stringify(errData)}`);
      }
      const parsed = await response.json();
      if (parsed.error) throw new Error(`API error: ${parsed.error} ${parsed.detail || parsed.raw || ""}`);
      if (!parsed.imageConcept && !parsed.hook) throw new Error(`Unexpected response: ${JSON.stringify(parsed)}`);
      setBrief(parsed);
    } catch (err) {
      setError(err.message || "Failed to generate.");
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
    `HOOK:\n${b.hook}\n\nCAPTION:\n${b.caption}${b.hashtags ? `\n\nHASHTAGS:\n${b.hashtags}` : ""}\n\nCTA:\n${b.cta}${b.photoPrompt ? `\n\nPHOTO PROMPT:\n${b.photoPrompt}` : ""}`;

  const getImageCopyAll = (b) =>
    `ANGLE:\n${b.angle}\n\nIMAGE CONCEPT:\n${b.imageConcept}\n\nCREATOR TYPE:\n${b.creatorType}\n\nON-SCREEN TEXT:\n${b.onScreenText}\n\nCAPTION:\n${b.caption}${b.hashtags ? `\n\nHASHTAGS:\n${b.hashtags}` : ""}\n\nCTA:\n${b.cta}${b.photoPrompt ? `\n\nPHOTO PROMPT:\n${b.photoPrompt}` : ""}`;

  const socialFields = brief ? [
    { key: "hook", label: "Hook", field: brief.hook, style: { fontSize: "17px", fontWeight: "600", lineHeight: 1.5, color: "#F0E8DA" } },
    { key: "caption", label: "Caption", field: brief.caption, style: { fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
    { key: "hashtags", label: "Hashtags", field: brief.hashtags, style: { fontSize: "13px", color: accent, lineHeight: 1.8 } },
    { key: "cta", label: "CTA", field: brief.cta, style: { fontSize: "15px", fontWeight: "600", color: accent } },
    { key: "photoPrompt", label: "Photo Prompt", field: brief.photoPrompt, style: { fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap", color: "#A09890", fontFamily: "monospace" } }
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
