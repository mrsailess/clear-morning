import { useState, useRef, useCallback } from "react";

const NO86_MASTER_TEMPLATE = `Use the attached No. 86 bottle as the exact product reference. Vertical 4:5 lifestyle photograph for Instagram and TikTok. Candid UGC style photograph captured during a genuine everyday moment. The No. 86 bottle should appear naturally within the environment and never feel like the subject of the image. It should feel like part of an existing ritual rather than a product placement. The image should feel observed rather than directed. No posing. No eye contact with the camera. No staged feeling. SETTING: [A real lived-in environment that fits the emotional moment — kitchen, patio, living room, home office, balcony, hotel room, dining area, or backyard. The space should feel believable and used, not styled or designer perfect.] SUBJECT: [Choose based on use case and scene: men 30–45 for after-work and ritual content, men 45–55 for firepit and mature ritual, women 30–45 for partner-noticed and night routine, adults 25–34 for identity-shift and sober-curious. Race rotates naturally: Black man, Black woman, white man, white woman, Latino man, Latina woman, mixed race man, mixed race woman, ambiguous man, ambiguous woman. Do not call attention to race. No children. The person should feel like someone the viewer wants to be, not someone they feel sorry for.] SUBJECT ACTION: [Something natural and quiet — holding a glass, leaning back in a chair, sitting at a counter, pausing after work, standing near a sink, sitting outside, resting. Nothing theatrical. Nothing performative.] MOMENT / NATURAL ACTION: [Write one subtle action that makes the image feel caught mid-ritual, not frozen. The photo should look like it was captured one second before the person fully settled. Good examples: mid-pour over one large ice cube, hand setting the glass down, hand reaching for the glass, phone just placed face down, laptop just closed, sleeve being rolled up, chair shifting back slightly, work bag just set down, hand resting near the glass, glass being turned slowly in one hand, bottle being placed back on the counter, subject just sat down and exhaled. Match the action to the content: After Work Silence → phone just placed face down or laptop closed. Ritual Replacement → mid-pour or glass being set down. Morning After → glass resting nearby, subject calm and upright. Steak Night → hand near glass, relaxed after dinner. Bar Cart → hand pulling bottle from shelf. Home Office → laptop half closed, hand on glass. Patio → subject settling into chair. Do not use dramatic motion blur, theatrical gestures, action-scene energy, fake candid poses, exaggerated pouring, stiff hand placement, or influencer posing.] VISUAL STORY: [Write fresh based on the content angle. Focus on the emotional truth of the moment. The day is over. The noise dropped. Nobody needs anything right now. The ritual stayed, but the fog did not. Calm, grounded, familiar. 4–8 short lines.] BOTTLE PLACEMENT: [Sits naturally in the scene — on the counter, table, desk, patio surface, or nearby ledge. Slightly out of focus or secondary in emphasis. Never a hero bottle shot. Never centered like a product ad.] LIGHTING: Use realistic natural-looking ambient light from believable home or lifestyle sources. Prioritize soft window light, warm kitchen light, lamp light, patio light, soft daylight, or early evening ambient light. Keep the scene warm, clear, and readable. The subject's face, hands, glass, and bottle should all be visible on a phone screen. Allow shadows, but do not let the image become too dark. Avoid muddy blacks. Avoid crushed shadows. Preserve detail in the face, bottle, and environment. Aim for bright enough to feel clean and real, but still calm and premium. Natural light realism is more important than moodiness. PROPS: [Believable props that support the scene — phone face down, closed laptop, notebook, dish towel, mail, keys, book, work bag, plate, glass with ice, or a second everyday object that makes the room feel lived in. Minimal and realistic.] SUBJECT DIRECTION: The person should make the viewer think: I want to be that person right now. POSTURE: Settled. Weight back. Earned rest. Comfortable. Not slumped. Not defeated. FACE: Neutral to quietly satisfied. Just exhaled. Calm. Present. Eyes forward or looking at the middle distance — not down at the counter, not down at the glass, not at the floor. No exaggerated emotion. The expression of someone who just realized they have nowhere to be. ENERGY: Still. Grounded. Not restless. Not checking the phone. Not busy. ASPIRATION: Arrival, not escape. EMOTIONAL DIRECTION: Nobody needs anything from me right now. Relief. Presence. Clarity. Calm. Self-control. Quiet confidence. UGC REALISM GUARDRAIL: The image should look like a real person or small brand captured it, not like an agency campaign. Prefer slightly imperfect framing over perfect composition. Prefer believable homes over designer interiors. Prefer real facial neutrality over model expressions. Prefer a lived-in environment over a styled set. Keep it premium but understated. PHOTOGRAPHY STYLE: Authentic UGC. Documentary photography. Natural depth of field. Light film grain. Real-world lighting. Slightly imperfect composition. The image should feel realistic, not staged. NEGATIVE PROMPTS: Sadness. Depression. Loneliness. Slumped posture. Head down in defeat. Party scene. Celebration. Bar scene. Influencer pose. Hero bottle shot. Studio lighting. Commercial lighting. Overproduced lighting. Stock photography. Corporate branding. Luxury campaign aesthetic. CGI. Text. Watermark. Perfectly staged composition. Exaggerated emotions. Hyper-sharp bottle. Crushed blacks. Muddy shadows. Underexposed face. Unreadable bottle label. Dark moody image that loses detail. Dramatic motion blur. Theatrical gestures. Frozen mannequin posture. Subject looking at camera.`;

const NO86_PHOTO_PROMPT_SYSTEM = `You generate photo prompts for No. 86, a non-alcoholic whiskey alternative. Given a hook and content category, write a single assembled photo prompt using the master template below. Return ONLY valid JSON. Start with { and end with }. No markdown. No explanation.
{"photoPrompt":"..."}
MASTER TEMPLATE — write SETTING, SUBJECT, SUBJECT ACTION, VISUAL STORY, BOTTLE PLACEMENT, and PROPS fresh based on the hook. Keep all other sections exactly as written.
${NO86_MASTER_TEMPLATE}`;

const NO86_MODES = [
  { key: "emotional", label: "Emotional Truth" },
  { key: "ritual",   label: "Ritual / Lifestyle" },
  { key: "product",  label: "Product Belief" }
];

const PERSONAL_MODES = [
  { key: "social", label: "Social Post" },
  { key: "ugc",   label: "UGC Image" },
  { key: "paid",  label: "Conversion Image" }
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
      emotional: [
        "After Work Silence",
        "The Tradeoff Tomorrow",
        "The Ritual, Not the Alcohol",
        "Identity Shift",
        "Showing Up Fully",
        "Bored, Stressed, or Just Empty",
        "What You Actually Miss",
        "Control and Clarity"
      ],
      ritual: [
        "Patio Ritual",
        "Steak Night",
        "Kitchen Wind Down",
        "Bar Cart",
        "Firepit",
        "Hotel Room",
        "Home Office Reset",
        "Weekend Porch",
        "Dinner Table",
        "Late Night Exhale"
      ],
      product: [
        "What No. 86 Is",
        "Taste Profile",
        "How To Drink It",
        "Why People Buy It",
        "Objection Handling",
        "Founder Story",
        "Customer Reaction",
        "First Pour Experience",
        "When To Reach For It",
        "Why It Works For The Ritual"
      ]
    },
    systemPrompt: `You write TikTok/Instagram content for No. 86, a non-alcoholic whiskey alternative for men 30–45.
READING LEVEL: 5th–8th grade. Short sentences. Simple words. No em dashes.
CORE MESSAGE: Keep the ritual. Lose the fog.
EMOTIONAL TRUTH FIRST: Every post starts with a human truth regardless of category. Product, taste, and proof always come second — in the caption, not the hook.
Never open with: taste notes, product features, "No. 86 is…", ingredients, or sales claims.
TOP-OF-FUNNEL: Hook and on-screen text should usually NOT mention No. 86. Image shows the bottle. Caption bridges to No. 86. CTA is soft.
SHAREABILITY TEST: Would someone send this with "this is me"? Would they share it if the bottle weren't there? If no — rethink the hook.
TONE: "I noticed this too." Not "you need to fix this." Observe the tradeoff. Never scold.
Prefer: quiet truth, simple contrast, private recognition, ritual language, morning-after clarity.
Avoid: moralizing, self-improvement slogans, hustle culture, therapy language, overexplaining.
BANNED: "the real you" / "full version of yourself" / "show up better" / "better version" / "level up" / "your highest self" / "nervous system" / "Here's the truth" / "The hard truth" / "soft ache" / "holding space" / "quit drinking" / "recovery" / "sober community"
INTERNAL CHECK: Before finalizing, reject anything that sounds like a coach or lecture. If it sounds like a private thought — it is right.
HOOK PROCESS: Generate 20 hooks internally. At least 12 emotional-truth, 5 specific-moment, max 3 product-led. Pick the most shareable. Output 8 best as hookOptions, each a different hook family. Set bestHook and hook to the winner.
HOOK: 25–35 words. Varied structure. No fixed starters. Follow the required hook family from the user message.
CAPTION: 45–90 words. Short sentences. Never repeats hook. Tradeoff → ritual → No. 86 bridge → clarity. Use "That's why we made No. 86." only if it fits naturally.
CTA: Soft, reflective, max 12 words. Good: "What tells your day it is over?" / "Which morning do you want?" / "Keep the ritual?"
HASHTAGS: 5–8 as one string. Prefer: #mindfuldrinking #morningclarity #afterworkritual #menswellness #whiskeyritual #no86. Avoid: #alcoholfree #recovery #sobercommunity #quitdrinking
SHAREABILITY SCORE: Rate high/medium/low and give one sentence reason.
BEST EXAMPLES (voice reference only):
"Nobody stops drinking because you made them feel bad about it."
"The goal isn't to never drink again. The goal is to never need to."
"Most people do not realize the drink after work is not about the drink. It is about the 20 minutes of silence nobody gave you all day."
Return ONLY valid JSON. No explanation before or after. No markdown. No code blocks. Start your response with { and end with }.
{"hook":"...","bestHook":"...","hookOptions":["hook1","hook2","hook3","hook4","hook5","hook6","hook7","hook8"],"shareabilityScore":"high","whyThisMightGetShared":"one sentence reason","caption":"...","hashtags":"#tag1 #tag2 #tag3 #tag4 #tag5","cta":"..."}`,
    imageSystemPrompt: `You write static image ad concepts for No. 86, a non-alcoholic whiskey alternative for men 30–45.
BRAND VOICE: Calm. Masculine. Direct. Premium.
CORE MESSAGE: Keep the ritual. Lose the fog.
MODE DEFINITIONS:
UGC Image: Turns a human truth into a natural still-image post. Feels like a real person posted it, not a brand ad. Do not hard sell. Start with the human truth.
Conversion Image: Same emotional truth as UGC, but make the product bridge slightly clearer in the caption. Still social-first. Still not salesy. Create purchase intent without sounding desperate.
EMOTIONAL TRUTH IS THE DEFAULT ENGINE FOR EVERY MODE:
Every No. 86 image starts with a human truth. Then adapts to the category.
Product Education: human truth first, product explanation in caption.
Taste Test: human truth first, taste notes in caption.
Objection Handling: human truth first, objection handled in caption.
Use Case: human truth first, scene second.
Social Proof: human truth first, proof in caption.
Never let on-screen text start with: taste notes, product features, "No. 86 is…", ingredient language, or direct sales claims.
SHAREABILITY TEST: Would someone share this if the bottle were not there? If yes, it is strong. If no, rethink the on-screen text.
BOTTLE TEST: Would someone send this to a friend with "this is me"? That is the bar.
THE ONLY RULE THAT MATTERS:
Say the true thing cleanly. Let it land. Do not explain it.
Your best lines do not try to be deep. They just are true.
TONE FILTER — FOR EMOTIONAL TRUTH, MORNING AFTER, PROBLEM AWARE, RITUAL REPLACEMENT, IDENTITY TRADEOFF:
The winning No. 86 tone is: "I noticed this too." Not: "You need to fix this."
Observe the tradeoff. Do not scold the reader.
Prefer: quiet truth, simple contrast, private recognition, morning-after clarity, ritual language.
Avoid: moralizing, shame, self-improvement slogans, hustle culture, therapy language, dramatic consequences, overexplaining.
BANNED PHRASES — rewrite any on-screen text or caption that contains these:
"the real you" / "full version of yourself" / "show up better" / "show up as" / "better version" / "you already know" / "not the version you want" / "be better" / "level up" / "your highest self" / "nervous system" / "the people who needed the real you"
INTERNAL SCORING RULE: Before finalizing, reject any output that sounds like a motivational coach, therapist, or moral lecture. If it sounds like a lesson, it is wrong. If it sounds like something a person would think privately, it is right.
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
Use the No. 86 master template below. Write SETTING, SUBJECT, SUBJECT ACTION, VISUAL STORY, BOTTLE PLACEMENT, and PROPS fresh each time. Keep all other sections exactly as written. Vary the setting, activity, and lighting across generations — do not repeat the same patio scene, same man sitting alone, or same blue hour lighting.
NO. 86 MASTER TEMPLATE:
${NO86_MASTER_TEMPLATE}
NEVER USE:
sobriety / recovery / quit drinking / nervous system / fixed that part / they were right / anything defensive or shame-based.
Return ONLY valid JSON:
{"angle":"...","imageConcept":"...","creatorType":"...","onScreenText":"...","caption":"...","cta":"...","hashtags":"...","photoPrompt":"..."}`,
    emotionalPrompt: `You write Emotional Truth content for No. 86, a non-alcoholic whiskey alternative for men 30–45.
JOB: Reach, shares, followers, community. This is the daily non-negotiable.
READING LEVEL: 5th–8th grade. Short sentences. Simple words. No em dashes.
CORE RULE: Lead with a human truth. The post should feel like a private thought, not advice.
ON-SCREEN TEXT: Usually should NOT mention No. 86. Optimize for someone sending it with "this is me."
BOTTLE: May appear naturally in image. Never the hero.
CAPTION: Bridges softly to No. 86. Use "That's why we made No. 86." only if it fits naturally.
CTA: Invite reflection or comments. Soft. Max 12 words.
TONE: "I noticed this too." Never "you need to fix this." Observe the tradeoff. Never scold.
Prefer: quiet truth, simple contrast, private recognition, ritual language, morning-after clarity.
BANNED: "the real you" / "full version of yourself" / "show up better" / "better version" / "level up" / "your highest self" / "nervous system" / "Here's the truth" / "The hard truth" / "soft ache" / "holding space" / "quit drinking" / "recovery" / "sober community"
INTERNAL CHECK: Reject anything that sounds like a coach or lecture. If it sounds like a private thought — it is right.
SHAREABILITY TEST: Would someone send this with "this is me"? Would they share it if the bottle were not there? If no — rethink.
HOOK PROCESS: Generate 20 hooks internally. At least 12 emotional-truth, 5 specific-moment, max 3 product-led. Output 8 best as hookOptions each using a different hook family. Set bestHook and hook to the winner. Follow the required hook family from the user message.
HOOK: 25–35 words. Varied structure. No fixed starters.
CAPTION: 45–90 words. Short sentences. Never repeats hook. Tradeoff → ritual → No. 86 bridge → clarity.
HASHTAGS: 5–8 as one string. Prefer: #mindfuldrinking #morningclarity #afterworkritual #menswellness #whiskeyritual #no86. Avoid: #alcoholfree #recovery #sobercommunity #quitdrinking
GOOD EXAMPLES:
"The drink after work was never about the drink. It was about the 20 minutes of silence nobody gave you all day."
"Some nights you do not need another drink. You need the day to stop needing you."
"The night feels easier. The morning asks for it back."
SHAREABILITY CHECK: Before finalizing, confirm this post passes the "this is me" test. Set shareable to true or false.
Return ONLY valid JSON. Start with { end with }. No markdown. No code blocks.
{"postType":"Emotional Truth","subcategory":"...","angle":"...","hook":"...","bestHook":"...","hookOptions":["...","...","...","...","...","...","...","..."],"onScreenText":"...","imageConcept":"...","caption":"...","shareable":true,"cta":"...","hashtags":"..."}`,
    ritualPrompt: `You write Ritual / Lifestyle content for No. 86, a non-alcoholic whiskey alternative for men 30–45.
JOB: Make No. 86 feel desirable and real in everyday life. Create desire through the ritual.
READING LEVEL: 5th–8th grade. Short sentences. Simple words. No em dashes.
CORE RULE: Start with the ritual, not the product. Show the moment where No. 86 belongs.
ON-SCREEN TEXT: 25–40 words. Supports the image. Short lines. White space between them.
PRODUCT VISIBILITY: More visible than Emotional Truth posts, but still feels natural. Never the hero.
IMAGE: Real lived-in settings. Natural or realistic home lighting. No staged ad energy. No influencer posing.
CAPTION: 45–80 words. The image carries the feeling. Text supports, does not overpower.
CTA: Invite community. Max 12 words. Good: "What does your version of this look like?" / "What tells your day it is over?"
TONE: Premium but understated. Calm. Real. Not a luxury ad. Not a bar ad.
AVOID: Looking like an ad. Overly staged scenes. Product-first copy. Generic luxury lifestyle. Party energy. Bar energy.
GOOD EXAMPLES:
"Laptop closed. Phone face down. Glass on the table. That small pause matters more than people think."
"Steak night does not need to turn into a slow morning."
"The best part of the night is not always the drink. Sometimes it is the room finally getting quiet."
HASHTAGS: 5–8 as one string. Prefer: #afterworkritual #steaknight #patiolife #ritualdrinks #no86 #mindfuldrinking
SHAREABILITY CHECK: Before finalizing, confirm this post passes the "this is me" test. Set shareable to true or false.
Return ONLY valid JSON. Start with { end with }. No markdown. No code blocks.
{"postType":"Ritual / Lifestyle","subcategory":"...","angle":"...","onScreenText":"...","imageConcept":"...","caption":"...","shareable":true,"cta":"...","hashtags":"..."}`,
    productPrompt: `You write Product Belief content for No. 86, a non-alcoholic whiskey alternative for men 30–45.
JOB: Remove doubt and create purchase intent.
READING LEVEL: 5th–8th grade. Short sentences. Simple words. No em dashes.
CORE RULE: Product mention is allowed. Still start with a human truth when possible.
ROTATE between: taste profile, how to drink it, 50/50 serve, less than 0.5% ABV, reviews, objection handling, founder story, Amazon social proof, comparison to whiskey experience (not flavor).
KEEP IT: Simple and believable. Show belief not hype. Do not overclaim. Do not say it tastes exactly like bourbon. Do not use recovery or sobriety framing by default.
ON-SCREEN TEXT: 25–40 words. Can mention No. 86 directly.
CAPTION: 45–80 words. Explains, educates, or builds trust simply.
CTA: Soft product bridge. Max 12 words. Good: "Try No. 86 tonight." / "Link in bio." / "Would this fit your ritual?"
AVOID: Hard sell. Fake urgency. Medical claims. Wellness promises. Overexplaining. Cheesy product claims. Spam tone.
GOOD EXAMPLES:
"No. 86 is not trying to be bourbon. It is trying to keep the glass, the ice, and the pause without borrowing from tomorrow."
"3 ways to pour No. 86: neat, over ice, or 50/50."
"The flavor matters because the ritual matters."
HASHTAGS: 5–8 as one string. Prefer: #no86 #nonalcoholicwhiskey #mindfuldrinking #whiskeyritual #sobercurious #drinkno86
SHAREABILITY CHECK: Before finalizing, confirm this post passes the "this is me" test. Set shareable to true or false.
Return ONLY valid JSON. Start with { end with }. No markdown. No code blocks.
{"postType":"Product Belief","subcategory":"...","angle":"...","onScreenText":"...","imageConcept":"...","caption":"...","shareable":true,"cta":"...","hashtags":"..."}`
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
YOUR WINNING CONTENT FORMATS (use as inspiration, not templates):
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
Do not default to these. The required hook family for this generation is provided in the user message. Follow it and write something that fits that family but sounds like Sean — earned, specific, real. Do not rely on fixed openers. Every regeneration should go a different direction.
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

const HOOK_FAMILIES = [
  "private confession",
  "specific moment",
  "false belief",
  "tradeoff",
  "quiet anger",
  "identity shift",
  "object truth",
  "social observation",
  "hard contrast",
  "unexpected admission"
];

const HOOK_FAMILY_DEFINITIONS = `Hook family definitions:
private confession: A first-person line that admits something true without sounding dramatic.
specific moment: Starts inside a concrete scene — laptop closed, phone face down, glass on counter, late night kitchen.
false belief: Starts with what the person thought was true, then reveals the deeper truth.
tradeoff: Frames the choice as what tonight costs tomorrow, or what something costs versus what it gives.
quiet anger: Names a frustration without yelling or sounding bitter.
identity shift: Contrasts the old version of the person with the current version.
object truth: Uses an object as the emotional doorway — glass, ice, bottle, phone, laptop, porch, bar cart.
social observation: Names something many people do but rarely say out loud.
hard contrast: Uses a clean before/after or this/not-that contrast.
unexpected admission: Starts with a surprising, honest admission.`;

const pick = (arr, exclude) => {
  const pool = exclude ? arr.filter((x) => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
};

const isImageMode = (m) => m === "ugc" || m === "paid";
const isNo86Mode = (m) => m === "emotional" || m === "ritual" || m === "product";

export default function ContentBrief() {
  const [brand, setBrand] = useState(null);
  const [mode, setMode] = useState("emotional");
  const [daily3, setDaily3] = useState(null);
  const [daily3Loading, setDaily3Loading] = useState(false);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [recentHooks, setRecentHooks] = useState([]);
  const [selectedHook, setSelectedHook] = useState(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const lastAngle = useRef(null);
  const lastHookFamily = useRef(null);

  const config = brand ? BRAND_CONFIGS[brand] : BRAND_CONFIGS.no86;
  const accent = config.accent;
  const canGenerate = brand && category;

  const getSystemPrompt = (b, m) => {
    if (b === "no86") {
      if (m === "emotional") return BRAND_CONFIGS.no86.emotionalPrompt;
      if (m === "ritual")    return BRAND_CONFIGS.no86.ritualPrompt;
      if (m === "product")   return BRAND_CONFIGS.no86.productPrompt;
    }
    return isImageMode(m) ? BRAND_CONFIGS[b].imageSystemPrompt : BRAND_CONFIGS[b].systemPrompt;
  };

  const generateBrief = async (overrides = {}) => {
    const b = overrides.brand ?? brand;
    const m = overrides.mode ?? mode;
    const c = overrides.category ?? category;
    if (!b || !c) return;
    setLoading(true);
    setBrief(null);
    setError(null);
    setGeneratedImage(null);
    setImageError(null);

    const angle = pick(CONTENT_ANGLES, lastAngle.current);
    lastAngle.current = angle;

    const hookFamily = pick(HOOK_FAMILIES, lastHookFamily.current);
    lastHookFamily.current = hookFamily;

    const recentHooksBlock = recentHooks.length
      ? `\nRecent hooks to avoid:\n${recentHooks.map((h, i) => `${i + 1}. ${h}`).join("\n")}\nDo not reuse the same opening, sentence structure, emotional claim, metaphor, or hook family as any of these. If the new idea feels like a rewrite of one of those, reject it and try another direction.\n`
      : "";

    const modeInstruction = m === "ugc"
      ? "Generate a still-image UGC concept with 25 to 40 words of on-screen text. Feel like a real person posted it."
      : m === "paid"
      ? "Generate a still-image paid ad concept with 25 to 40 words of on-screen text and a stronger sales angle. Same UGC feel, but sharper product benefit and clearer CTA."
      : m === "emotional"
      ? "Generate an Emotional Truth post. Lead with a human truth. Do not mention No. 86 in the on-screen text. Optimize for shares and comments. Every regeneration should explore a different tension, moment, or idea."
      : m === "ritual"
      ? "Generate a Ritual / Lifestyle post. Start with the ritual moment. Show where No. 86 belongs naturally. Use a real lived-in setting."
      : m === "product"
      ? "Generate a Product Belief post. Start with a human truth if possible. Product mention is allowed. Rotate the product angle — taste, how to drink, objection, founder, proof."
      : "Generate a post. Every regeneration should explore a different tension, moment, or idea inside this category.";

    const userContent = `Content mode: ${m === "ugc" ? "Static UGC Image" : m === "paid" ? "Paid Ad Image" : m === "emotional" ? "Emotional Truth" : m === "ritual" ? "Ritual / Lifestyle" : m === "product" ? "Product Belief" : "Social Post"}
Content category: ${c}
Content angle: ${angle}
Required hook family: ${hookFamily}
${HOOK_FAMILY_DEFINITIONS}
${recentHooksBlock}${modeInstruction}`;

    try {
      const response = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: getSystemPrompt(b, m),
          messages: [{ role: "user", content: userContent }],
          max_tokens: b === "no86" ? (m === "emotional" ? 2000 : 1500) : isImageMode(m) ? 1500 : 500
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Server ${response.status}: ${errData.error || errData.detail || JSON.stringify(errData)}`);
      }
      const parsed = await response.json();
      if (parsed.error) throw new Error(`API error: ${parsed.error} ${parsed.detail || parsed.raw || ""}`);
      if (!parsed.imageConcept && !parsed.hook && !parsed.onScreenText) throw new Error(`Unexpected response: ${JSON.stringify(parsed)}`);
      setBrief({ ...parsed, hookFamily });
      setSelectedHook(parsed.bestHook || parsed.hook || null);
      const newHook = parsed.bestHook || parsed.hook || parsed.onScreenText || "";
      if (newHook) setRecentHooks((prev) => [...prev.slice(-7), newHook]);
    } catch (err) {
      setError(err.message || "Failed to generate.");
    } finally {
      setLoading(false);
    }
  };

  const generateDaily3 = async () => {
    if (brand !== "no86") return;
    setDaily3Loading(true);
    setDaily3(null);
    setError(null);
    const angle = pick(CONTENT_ANGLES, lastAngle.current);
    const hookFamily = pick(HOOK_FAMILIES, lastHookFamily.current);
    const makeCall = (tabKey) => {
      const cats = BRAND_CONFIGS.no86.categories[tabKey];
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const modeInstr = tabKey === "emotional"
        ? "Generate an Emotional Truth post. Lead with a human truth. Do not mention No. 86 in the on-screen text."
        : tabKey === "ritual"
        ? "Generate a Ritual / Lifestyle post. Start with the ritual moment. Use a real lived-in setting."
        : "Generate a Product Belief post. Start with a human truth if possible. Product mention is allowed.";
      return fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: getSystemPrompt("no86", tabKey),
          messages: [{ role: "user", content: `Content mode: ${tabKey === "emotional" ? "Emotional Truth" : tabKey === "ritual" ? "Ritual / Lifestyle" : "Product Belief"}\nContent category: ${cat}\nContent angle: ${angle}\nRequired hook family: ${hookFamily}\n${HOOK_FAMILY_DEFINITIONS}\n${modeInstr}` }],
          max_tokens: tabKey === "emotional" ? 2000 : 1500
        })
      }).then((r) => r.json()).then((d) => ({ ...d, _tab: tabKey, _category: cat }));
    };
    try {
      const [emotional, ritual, product] = await Promise.all([
        makeCall("emotional"),
        makeCall("ritual"),
        makeCall("product")
      ]);
      setDaily3({ emotional, ritual, product });
    } catch (err) {
      setError(err.message || "Failed to generate Daily 3.");
    } finally {
      setDaily3Loading(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateImage = async () => {
    setImageLoading(true);
    setImageError(null);
    setGeneratedImage(null);
    try {
      let photoPrompt = brief?.photoPrompt;

      // No. 86 tabs: photo prompt is always on-demand — generate it now if missing
      if (!photoPrompt && brand === "no86") {
        const promptRes = await fetch("/api/content-brief/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: NO86_PHOTO_PROMPT_SYSTEM,
            messages: [{ role: "user", content: `Hook: ${selectedHook || brief.hook || brief.onScreenText || ""}\nContent category: ${category}\nGenerate the photo prompt now.` }],
            max_tokens: 1200
          })
        });
        const promptData = await promptRes.json();
        if (!promptRes.ok || promptData.error) throw new Error(promptData.error || "Failed to generate photo prompt");
        photoPrompt = promptData.photoPrompt;
        if (!photoPrompt) throw new Error("No photo prompt returned");
        setBrief((prev) => ({ ...prev, photoPrompt }));
      }

      if (!photoPrompt) throw new Error("No photo prompt available");

      const response = await fetch("/api/content-brief/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoPrompt, brand, mode })
      });
      const parsed = await response.json();
      if (!response.ok || parsed.error) throw new Error(parsed.error || "Image generation failed");
      setGeneratedImage(`data:${parsed.mimeType};base64,${parsed.imageBase64}`);
    } catch (err) {
      setImageError(err.message || "Image generation failed. Check OPENAI_API_KEY in Vercel env vars.");
    } finally {
      setImageLoading(false);
    }
  };

  const generatePhotoPrompt = async (hook) => {
    if (!hook) return;
    setPromptLoading(true);
    setBrief((prev) => ({ ...prev, photoPrompt: null }));
    try {
      const res = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: NO86_PHOTO_PROMPT_SYSTEM,
          messages: [{ role: "user", content: `Hook: ${hook}\nContent category: ${category}\nGenerate the photo prompt now.` }],
          max_tokens: 1200
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to generate photo prompt");
      if (!data.photoPrompt) throw new Error("No photo prompt returned");
      setBrief((prev) => ({ ...prev, photoPrompt: data.photoPrompt }));
    } catch (err) {
      setError(err.message);
    } finally {
      setPromptLoading(false);
    }
  };

  const resetMemory = useCallback(() => {
    setRecentHooks([]);
    setSelectedHook(null);
    lastAngle.current = null;
    lastHookFamily.current = null;
  }, []);

  const reset = () => {
    setBrand(null);
    setMode("emotional");
    setCategory(null);
    setBrief(null);
    setError(null);
    setGeneratedImage(null);
    setImageError(null);
    setDaily3(null);
    resetMemory();
  };

  const getSocialCopyAll = (b) =>
    `HOOK:\n${b.hook}${b.hookOptions?.length ? `\n\nHOOK OPTIONS:\n${b.hookOptions.map((h, i) => `${i + 1}. ${h}`).join("\n")}` : ""}${b.shareabilityScore ? `\n\nSHAREABILITY: ${b.shareabilityScore.toUpperCase()} — ${b.whyThisMightGetShared || ""}` : ""}\n\nCAPTION:\n${b.caption}${b.hashtags ? `\n\nHASHTAGS:\n${b.hashtags}` : ""}\n\nCTA:\n${b.cta}${b.photoPrompt ? `\n\nPHOTO PROMPT:\n${b.photoPrompt}` : ""}`;

  const getImageCopyAll = (b) =>
    `ANGLE:\n${b.angle}\n\nIMAGE CONCEPT:\n${b.imageConcept}\n\nCREATOR TYPE:\n${b.creatorType}\n\nON-SCREEN TEXT:\n${b.onScreenText}\n\nCAPTION:\n${b.caption}${b.hashtags ? `\n\nHASHTAGS:\n${b.hashtags}` : ""}\n\nCTA:\n${b.cta}${b.photoPrompt ? `\n\nPHOTO PROMPT:\n${b.photoPrompt}` : ""}`;

  const getNo86CopyAll = (b) =>
    [
      b.postType   ? `POST TYPE:\n${b.postType}` : "",
      b.subcategory ? `SUBCATEGORY:\n${b.subcategory}` : "",
      b.angle       ? `ANGLE:\n${b.angle}` : "",
      b.onScreenText ? `ON-SCREEN TEXT:\n${b.onScreenText}` : "",
      b.imageConcept ? `IMAGE CONCEPT:\n${b.imageConcept}` : "",
      b.caption      ? `CAPTION:\n${b.caption}` : "",
      b.hashtags ? `HASHTAGS:\n${b.hashtags}` : "",
      b.cta      ? `CTA:\n${b.cta}` : "",
      b.photoPrompt ? `PHOTO PROMPT:\n${b.photoPrompt}` : ""
    ].filter(Boolean).join("\n\n");

  const socialFields = brief ? [
    { key: "hook", label: "Selected Hook", field: selectedHook || brief.hook, style: { fontSize: "17px", fontWeight: "600", lineHeight: 1.5, color: "#F0E8DA" } },
    ...(brief.shareabilityScore ? [{ key: "shareability", label: "Shareability", field: `${brief.shareabilityScore.toUpperCase()} — ${brief.whyThisMightGetShared || ""}`, style: { fontSize: "12px", color: brief.shareabilityScore === "high" ? "#5A9A5A" : brief.shareabilityScore === "medium" ? "#9A8A3A" : "#9A4A4A", fontFamily: "monospace", lineHeight: 1.6 } }] : []),
    { key: "caption", label: "Caption", field: brief.caption, style: { fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
    { key: "hashtags", label: "Hashtags", field: brief.hashtags, style: { fontSize: "13px", color: accent, lineHeight: 1.8 } },
    { key: "cta", label: "CTA", field: brief.cta, style: { fontSize: "15px", fontWeight: "600", color: accent } },
    ...(brief.photoPrompt ? [{ key: "photoPrompt", label: "Photo Prompt", field: brief.photoPrompt, style: { fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap", color: "#A09890", fontFamily: "monospace" } }] : [])
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

  const no86Fields = brief ? [
    { key: "postType",    label: "Post Type",    field: brief.postType,    style: { fontSize: "11px", color: accent, fontFamily: "monospace", letterSpacing: "0.5px", fontWeight: "700" } },
    { key: "subcategory", label: "Subcategory",  field: brief.subcategory, style: { fontSize: "13px", color: "#A09890" } },
    { key: "angle",       label: "Angle",        field: brief.angle,       style: { fontSize: "13px", color: accent, fontWeight: "600", letterSpacing: "0.5px" } },
    { key: "onScreenText",label: "On-Screen Text",field: brief.onScreenText,style: { fontSize: "17px", fontWeight: "600", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#F0E8DA" } },
    { key: "imageConcept",label: "Image Concept", field: brief.imageConcept,style: { fontSize: "14px", lineHeight: "1.7", color: "#C8C0B4", fontStyle: "italic" } },
    { key: "caption",     label: "Caption",      field: brief.caption,     style: { fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
    ...(brief.shareable !== undefined ? [{ key: "shareable", label: "Shareable", field: brief.shareable ? "✓ Passes the "this is me" test" : "✗ May not be shareable — consider regenerating", style: { fontSize: "12px", color: brief.shareable ? "#5A9A5A" : "#9A4A4A", fontFamily: "monospace" } }] : []),
    { key: "hashtags",    label: "Hashtags",     field: brief.hashtags,    style: { fontSize: "13px", color: accent, lineHeight: 1.8 } },
    { key: "cta",         label: "CTA",          field: brief.cta,         style: { fontSize: "15px", fontWeight: "600", color: accent } },
    ...(brief.photoPrompt ? [{ key: "photoPrompt", label: "Photo Prompt", field: brief.photoPrompt, style: { fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap", color: "#A09890", fontFamily: "monospace" } }] : [])
  ] : [];

  const activeFields = brand === "no86" && isNo86Mode(mode) ? no86Fields : isImageMode(mode) ? imageFields : socialFields;

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
                onClick={() => { setBrand(key); setMode(key === "no86" ? "emotional" : "social"); setCategory(null); setBrief(null); setError(null); setDaily3(null); resetMemory(); }}
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
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>02 Content Job</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(brand === "no86" ? NO86_MODES : PERSONAL_MODES).map((m) => (
                <button key={m.key}
                  onClick={() => { setMode(m.key); setCategory(null); setBrief(null); setError(null); setDaily3(null); resetMemory(); }}
                  style={{ flex: 1, minWidth: "80px", background: mode === m.key ? config.surface : "transparent", border: `1px solid ${mode === m.key ? accent : "#222"}`, borderRadius: "8px", padding: "10px 8px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", color: mode === m.key ? accent : "#666", fontWeight: mode === m.key ? "700" : "400", letterSpacing: "0.5px", textTransform: "uppercase", textAlign: "center" }}>
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
                  onClick={() => { setCategory(cat); setBrief(null); setError(null); resetMemory(); }}
                  style={{ background: category === cat ? config.surface : "transparent", border: `1px solid ${category === cat ? accent : "#222"}`, borderRadius: "8px", padding: "13px 16px", cursor: "pointer", textAlign: "left", fontSize: "14px", color: category === cat ? accent : "#888", fontWeight: category === cat ? "600" : "400" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate */}
        {canGenerate && !loading && !brief && (
          <button onClick={() => generateBrief()} style={{ width: "100%", background: accent, border: "none", borderRadius: "10px", padding: "16px", cursor: "pointer", fontSize: "14px", fontWeight: "700", color: "#000", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "10px" }}>
            Generate
          </button>
        )}

        {/* Generate Daily 3 */}
        {brand === "no86" && !loading && !brief && !daily3 && !daily3Loading && (
          <button onClick={generateDaily3} style={{ width: "100%", background: "transparent", border: `1px solid ${accent}`, borderRadius: "10px", padding: "14px", cursor: "pointer", fontSize: "13px", fontWeight: "700", color: accent, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "monospace" }}>
            Generate Daily 3
          </button>
        )}

        {daily3Loading && (
          <div style={{ textAlign: "center", padding: "28px 20px", color: "#555", fontSize: "13px", fontFamily: "monospace" }}>
            <div style={{ width: "28px", height: "28px", border: `2px solid ${config.border}`, borderTop: `2px solid ${accent}`, borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
            GENERATING DAILY 3...
          </div>
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

        {/* Daily 3 Results */}
        {daily3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {["emotional", "ritual", "product"].map((tab) => {
              const d = daily3[tab];
              if (!d) return null;
              const tabLabel = tab === "emotional" ? "Emotional Truth" : tab === "ritual" ? "Ritual / Lifestyle" : "Product Belief";
              const fields = [
                { key: `${tab}-subcategory`, label: "Subcategory",  field: d.subcategory, style: { fontSize: "13px", color: "#A09890" } },
                { key: `${tab}-angle`,       label: "Angle",        field: d.angle,       style: { fontSize: "13px", color: accent, fontWeight: "600" } },
                { key: `${tab}-onscreen`,    label: "On-Screen Text",field: d.onScreenText,style: { fontSize: "16px", fontWeight: "600", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#F0E8DA" } },
                { key: `${tab}-concept`,     label: "Image Concept", field: d.imageConcept,style: { fontSize: "13px", lineHeight: "1.7", color: "#C8C0B4", fontStyle: "italic" } },
                { key: `${tab}-caption`,     label: "Caption",      field: d.caption,     style: { fontSize: "13px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "#C8C0B4" } },
                ...(d.shareable !== undefined ? [{ key: `${tab}-shareable`, label: "Shareable", field: d.shareable ? "✓ Passes the "this is me" test" : "✗ May not be shareable", style: { fontSize: "12px", color: d.shareable ? "#5A9A5A" : "#9A4A4A", fontFamily: "monospace" } }] : []),
                { key: `${tab}-hashtags`,    label: "Hashtags",     field: d.hashtags,    style: { fontSize: "12px", color: accent } },
                { key: `${tab}-cta`,         label: "CTA",          field: d.cta,         style: { fontSize: "13px", fontWeight: "600", color: accent } },
              ].filter((f) => f.field);
              return (
                <div key={tab} style={{ background: config.surface, border: `1px solid ${config.border}`, borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${config.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "11px", letterSpacing: "2px", color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>{tabLabel}</div>
                    <button onClick={() => copy(getNo86CopyAll(d), `daily3-${tab}`)} style={{ background: copied === `daily3-${tab}` ? accent : "transparent", border: `1px solid ${copied === `daily3-${tab}` ? accent : config.border}`, color: copied === `daily3-${tab}` ? "#000" : "#666", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                      {copied === `daily3-${tab}` ? "COPIED" : "COPY ALL"}
                    </button>
                  </div>
                  {fields.map(({ key, label, field, style }, i, arr) => (
                    <div key={key} style={{ padding: "16px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${config.border}` : "none" }}>
                      <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", marginBottom: "8px", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
                      <div style={{ marginBottom: "10px", ...style }}>{field}</div>
                      <button onClick={() => copy(field, key)} style={{ background: "transparent", border: `1px solid ${config.border}`, color: copied === key ? accent : "#555", padding: "4px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                        {copied === key ? "COPIED" : "COPY"}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
            <button onClick={() => { setDaily3(null); resetMemory(); }} style={{ width: "100%", background: "transparent", border: `1px solid ${config.border}`, color: "#555", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>NEW DAILY 3</button>
          </div>
        )}

        {/* Result */}
        {brief && (
          <div style={{ background: config.surface, border: `1px solid ${config.border}`, borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${config.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "2px", color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>
                  {(brand === "no86" ? NO86_MODES : PERSONAL_MODES).find((m) => m.key === mode)?.label} | {config.label}
                </div>
                {brief.hookFamily && (
                  <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace", marginTop: "3px", letterSpacing: "0.5px" }}>
                    Hook Family: {brief.hookFamily}
                  </div>
                )}
              </div>
              <button
                onClick={() => copy(brand === "no86" && isNo86Mode(mode) ? getNo86CopyAll(brief) : isImageMode(mode) ? getImageCopyAll(brief) : getSocialCopyAll(brief), "all")}
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

            {/* Hook Options picker — Social Post only */}
            {!isImageMode(mode) && brief?.hookOptions?.length > 0 && (
              <div style={{ padding: "20px", borderTop: `1px solid ${config.border}` }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", marginBottom: "12px", textTransform: "uppercase", fontFamily: "monospace" }}>Hook Options — tap to select</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {brief.hookOptions.map((h, i) => (
                    <button key={i} onClick={() => { setSelectedHook(h); setBrief((prev) => ({ ...prev, photoPrompt: null })); }}
                      style={{ background: selectedHook === h ? config.surface : "transparent", border: `1px solid ${selectedHook === h ? accent : config.border}`, borderRadius: "8px", padding: "12px 14px", cursor: "pointer", textAlign: "left", fontSize: "13px", lineHeight: 1.6, color: selectedHook === h ? accent : "#888", fontFamily: "'Georgia', serif" }}>
                      {h}
                    </button>
                  ))}
                </div>
                {selectedHook && (
                  <button
                    onClick={() => generatePhotoPrompt(selectedHook)}
                    disabled={promptLoading}
                    style={{ marginTop: "14px", width: "100%", background: "transparent", border: `1px solid ${promptLoading ? config.border : accent}`, borderRadius: "8px", padding: "11px", cursor: promptLoading ? "default" : "pointer", fontSize: "11px", fontWeight: "700", color: promptLoading ? "#555" : accent, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "monospace" }}>
                    {promptLoading ? "BUILDING PHOTO PROMPT..." : brief.photoPrompt ? "REGENERATE PHOTO PROMPT" : "GENERATE PHOTO PROMPT"}
                  </button>
                )}
              </div>
            )}

            {/* Generate Photo Prompt — for ritual/product tabs (no hookOptions) */}
            {brand === "no86" && (mode === "ritual" || mode === "product") && (
              <div style={{ padding: "20px", borderTop: `1px solid ${config.border}` }}>
                <button
                  onClick={() => generatePhotoPrompt(selectedHook || brief.onScreenText || "")}
                  disabled={promptLoading}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${promptLoading ? config.border : accent}`, borderRadius: "8px", padding: "11px", cursor: promptLoading ? "default" : "pointer", fontSize: "11px", fontWeight: "700", color: promptLoading ? "#555" : accent, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "monospace" }}>
                  {promptLoading ? "BUILDING PHOTO PROMPT..." : brief.photoPrompt ? "REGENERATE PHOTO PROMPT" : "GENERATE PHOTO PROMPT"}
                </button>
              </div>
            )}

            {/* Generate Image — shown for all no86 tabs */}
            {brand === "no86" && (brief.photoPrompt || mode === "emotional") && (
              <div style={{ padding: "20px", borderTop: `1px solid ${config.border}` }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", marginBottom: "12px", textTransform: "uppercase", fontFamily: "monospace" }}>Generated Image</div>
                <button
                  onClick={generateImage}
                  disabled={imageLoading}
                  style={{ width: "100%", background: imageLoading ? "transparent" : accent, border: `1px solid ${imageLoading ? config.border : accent}`, borderRadius: "8px", padding: "12px", cursor: imageLoading ? "default" : "pointer", fontSize: "12px", fontWeight: "700", color: imageLoading ? "#555" : "#000", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "12px" }}>
                  {imageLoading ? "GENERATING IMAGE..." : generatedImage ? "REGENERATE IMAGE" : "GENERATE IMAGE"}
                </button>
                {imageLoading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                    <div style={{ width: "24px", height: "24px", border: `2px solid ${config.border}`, borderTop: `2px solid ${accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
                {imageError && (
                  <div style={{ padding: "10px", background: "#1A0A0A", border: "1px solid #3A1A1A", borderRadius: "6px", color: "#CC4444", fontSize: "12px", fontFamily: "monospace" }}>{imageError}</div>
                )}
                {generatedImage && (
                  <div>
                    <img src={generatedImage} alt="Generated content" style={{ width: "100%", borderRadius: "10px", display: "block", marginBottom: "10px" }} />
                    <a href={generatedImage} download="no86-content-image.png"
                      style={{ display: "block", textAlign: "center", background: "transparent", border: `1px solid ${config.border}`, color: "#555", padding: "8px", borderRadius: "6px", fontSize: "11px", fontFamily: "monospace", textDecoration: "none" }}>
                      DOWNLOAD IMAGE
                    </a>
                  </div>
                )}
              </div>
            )}

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
