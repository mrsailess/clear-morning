import React, { useState, useEffect, useRef } from "react";

/* ───────────────────────────────────────────────
   CLEAR MORNING
   A decision assistant + a friend that remembers you.
   Personality: calm friend / sharp older brother. No fake positivity. No therapy voice.
   Flow: I'm about to fold → behavior → trigger → what happened right before →
         reality check (memory-driven) → 10-sec move → 10-min timer → did the urge drop → lock tomorrow.
   Daily loop: morning proof · afternoon day check-in · night fold · weekly read.
   Reality checks use personal context when available.
   ─────────────────────────────────────────────── */

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Jost:wght@300;400;500;600&display=swap');`;

const BEHAVIORS = ["Drink", "Smoke", "Scroll", "Eat", "Text someone", "Other"];
const TRIGGERS = ["Stress relief", "Reward", "Loneliness", "Boredom", "Escape", "Celebration"];
const CONTEXTS = ["Work", "Argument", "Kids/family", "Scrolling", "Bored at home", "After dinner", "Late night alone", "Celebrating", "Other"];
const FEELINGS = ["Foggy", "Okay", "Clear", "Amazing"];
const TOMORROW = ["Clear", "Proud", "Present", "Focused", "Energized"];
const DROP = ["It passed", "It's weaker now", "It's still there", "It got stronger"];
const DAYKIND = ["Draining", "Stressful", "Fine", "Good", "Great"];
const CARRYING = ["Work", "An argument", "Loneliness", "Restlessness", "Nothing heavy"];
const BASE_REPLACEMENTS = ["5-min walk", "Shower", "Journal", "Call someone", "Read"];
const FAMILIAR = ["Sparkling water", "Tea", "Coffee", "Kombucha"];
const CORE_REASONS = ["Marriage", "Parenting", "Fitness", "Business", "Faith", "Mental health", "Sleep", "Confidence", "Finances"];
const BUILDS = ["Better health", "Better marriage", "Better finances", "Better mental health", "Better relationship with my kids", "A business", "A career", "A skill", "Something else"];
const SKILLS = ["Jiu-jitsu", "Fitness", "Sales", "Business", "Writing", "Parenting", "Communication", "Investing", "Faith"];
const defaultSettings = {
  name: "",
  faithMode: false,
  custom: [],
  tone: "Calm friend",
  reminder: "",
  onboarded: false,
  primaryBehavior: "",
  seeking: "",
  usualWhen: "",
  coreReasons: [],
  build: "",
  project: "",
  futureSelf: "",
  skills: []
};

const K = { urges: "cm:urges", mornings: "cm:mornings", days: "cm:days", settings: "cm:settings", insight: "cm:insight", voice: "cm:voice", feedback: "cm:feedback" };

/* ── STORAGE ADAPTER ──
   Uses the Claude preview's window.storage when present; falls back to localStorage
   when this file is exported to a real app. Swap the localStorage branch for
   Supabase/Firebase when you want cross-device sync. */
const hasWS = typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";
const store = {
  async get(key) {
    if (hasWS) { try { return await window.storage.get(key); } catch (_) { return null; } }
    try { const v = window.localStorage.getItem(key); return v == null ? null : { key, value: v }; } catch (_) { return null; }
  },
  async set(key, value) {
    if (hasWS) { try { return await window.storage.set(key, value); } catch (_) { return null; } }
    try { window.localStorage.setItem(key, value); return { key, value }; } catch (_) { return null; }
  },
  async del(key) {
    if (hasWS) { try { return await window.storage.delete(key); } catch (_) { return null; } }
    try { window.localStorage.removeItem(key); return { key, deleted: true }; } catch (_) { return null; }
  },
};

/* ── AI SEAM ──
   AI runs through your backend so the key never touches the client. Deploy a serverless
   function at /api/ask-claude that holds your key and proxies to Anthropic, returning the
   response unchanged. In the artifact preview there is no backend, so askClaude returns ""
   and the deterministic fallback line is shown — that's expected. Real AI requires the route. */
let LAST_AI_ERROR = "";
const DEBUG_AI = false; // confirmed AI working; flip true only to debug again
const AI_ENDPOINT = "/api/ask-claude";
async function askClaude(userContent, maxTokens = 1000, temperature = 1) {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: userContent }]
      }),
    });
    if (!res.ok) {
      LAST_AI_ERROR = "http " + res.status;
      return "";
    }
    const data = await res.json();
    return (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
  } catch (e) {
    LAST_AI_ERROR = "fetch: " + (e?.message || e);
    return "";
  }
}
const todayKey = () => new Date().toISOString().slice(0, 10);
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
const hourNow = () => new Date().getHours();
const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

/* ── ANALYTICS ──
   Lightweight, privacy-light usage tracking so you can see whether people open the app
   AT NIGHT (the one behavior that matters) and whether they come back. No personal text
   is ever sent — only event names + the hour of day. To turn on:
   1. Make a free account at posthog.com, create a project, copy your Project API key.
   2. Paste it into POSTHOG_KEY below (replace the empty string).
   If the key is empty, tracking is silently off and the app works exactly the same. */
const POSTHOG_KEY = "phc_mX8bazByE7BxvcjKXn4pwgTgGtTnb2qKJUFHz2gEaZvg"; // PostHog project key (write-only, safe in frontend)
function initAnalytics() {
  if (!POSTHOG_KEY || typeof window === "undefined" || window.__phLoaded) return;
  window.__phLoaded = true;
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  try { window.posthog.init(POSTHOG_KEY, { api_host: "https://us.i.posthog.com", capture_pageview: false }); } catch (_) {}
}
function track(event, props) {
  try {
    const hour = new Date().getHours();
    const partOfDay = hour < 6 ? "overnight" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "late_night";
    if (window.posthog && window.posthog.capture) window.posthog.capture(event, { hour, partOfDay, ...props });
  } catch (_) {}
}

export default function App() {
  const [view, setView] = useState("home");
  const [urges, setUrges] = useState([]);
  const [mornings, setMornings] = useState([]);
  const [days, setDays] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [voice, setVoice] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    initAnalytics();
    track("app_open");
    (async () => {
      for (const [key, set] of [[K.urges, setUrges], [K.mornings, setMornings], [K.days, setDays], [K.settings, setSettings], [K.feedback, setFeedback]]) {
        try {
          const r = await store.get(key);
          if (r?.value) {
            const parsed = JSON.parse(r.value);
            set(key === K.settings ? { ...defaultSettings, ...parsed } : parsed);
          }
        } catch (_) {}
      }
      try { const v = await store.get(K.voice); if (v?.value) setVoice(v.value); } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  const save = async (key, val, setter) => { setter(val); try { await store.set(key, JSON.stringify(val)); } catch (_) {} };
  const saveVoice = async (d) => { setVoice(d); try { if (d) await store.set(K.voice, d); else await store.del(K.voice); } catch (_) {} };

  const memory = computeMemory(urges, mornings, days, settings);
  const dynamicBuild = buildReplacement(settings);
  const replacements = [
    ...(dynamicBuild ? [dynamicBuild] : []),
    ...BASE_REPLACEMENTS,
    ...(settings.custom || []),
    ...(settings.faithMode ? ["Prayer"] : []),
    "Pour something familiar"
  ];

  const todayMorning = mornings.find((m) => m.date === todayKey());
  const todayDay = days.find((d) => d.date === todayKey());
  const h = hourNow();
  const needMorning = h >= 4 && h < 12 && !todayMorning;
  const needDay = h >= 12 && h <= 23 && !todayDay;
  // Last night isn't logged yet if there was an urge yesterday but no morning entry for today
  // capturing it. Surface a catch-up prompt any time of day so fold/clear data is never lost.
  const yKey = yesterdayKey();
  const hadUrgeYesterday = urges.some((u) => u.date === yKey);
  const loggedLastNight = !!todayMorning || mornings.some((m) => m.date === yKey && typeof m.folded === "boolean");
  const needLastNight = !needMorning && hadUrgeYesterday && !loggedLastNight;

  if (!loaded) return <div style={{ ...wrap, alignItems: "center", justifyContent: "center" }}><style>{FONT}</style><span style={{ color: "#9a7b4f" }}>·</span></div>;

  if (!settings.onboarded) {
    return (
      <div style={wrap}>
        <style>{FONT}{css}</style>
        <div style={grain} />
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative", zIndex: 2 }}>
          <Onboarding onDone={(o) => { track("onboarding_complete"); save(K.settings, { ...settings, ...o, onboarded: true }, setSettings); }} />
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <style>{FONT}{css}</style>
      <div style={grain} />
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative", zIndex: 2, paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        {view === "home" && <Home settings={settings} memory={memory} urges={urges} mornings={mornings} days={days}
          needMorning={needMorning} needDay={needDay} needLastNight={needLastNight} voice={voice}
          onFold={() => { track("intervention_start"); setView("intervene"); }} onMorning={() => setView("morning")} onDay={() => setView("day")} />}
        {view === "intervene" && <Intervene settings={settings} memory={memory} urges={urges} mornings={mornings} days={days} feedback={feedback}
          replacements={replacements} voice={voice} onCancel={() => setView("home")}
          onFeedback={(f) => save(K.feedback, [{ ...f, ts: Date.now() }, ...feedback].slice(0, 50), setFeedback)}
          onComplete={(e) => { track("intervention_complete", { dropped: e.dropped, behavior: e.behavior }); save(K.urges, [{ ...e, id: Date.now(), ts: Date.now(), date: todayKey() }, ...urges], setUrges); setView("home"); }} />}
        {view === "morning" && <Morning existing={todayMorning} onCancel={() => setView("home")}
          onDone={(feel, folded) => { track("morning_checkin", { feel, folded }); const rest = mornings.filter((m) => m.date !== todayKey()); save(K.mornings, [{ date: todayKey(), feel, folded }, ...rest], setMornings); setView("home"); }} />}
        {view === "day" && <DayCheckin existing={todayDay} onCancel={() => setView("home")}
          onDone={(dayKind, carrying, note) => { const rest = days.filter((d) => d.date !== todayKey()); save(K.days, [{ date: todayKey(), dayKind, carrying, note }, ...rest], setDays); setView("home"); }} />}
        {view === "insights" && <Insights urges={urges} mornings={mornings} days={days} memory={memory} />}
        {view === "you" && <You settings={settings} urges={urges} voice={voice} saveVoice={saveVoice} onChange={(s) => save(K.settings, s, setSettings)} />}
      </div>
      {view !== "intervene" && view !== "morning" && view !== "day" && (
        <nav style={nav}>
          {[["home", "Now"], ["insights", "Patterns"], ["you", "Why"]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={navBtn(view === k)}>{l}</button>
          ))}
        </nav>
      )}
    </div>
  );
}

/* ── ONBOARDING ── */
const WHEN = ["After work", "After dinner", "Late night", "When I'm alone", "After scrolling"];
const SEEKING = ["Relief", "Quiet", "Confidence", "Escape", "A reward"];
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [o, setO] = useState({ primaryBehavior: "", seeking: "", usualWhen: "", reminder: "", coreReasons: [], build: "", project: "", futureSelf: "" });
  const toggleReason = (reason) => {
    setO((p) => {
      const exists = p.coreReasons.includes(reason);
      const next = exists ? p.coreReasons.filter((x) => x !== reason) : [...p.coreReasons, reason].slice(0, 3);
      return { ...p, coreReasons: next };
    });
  };
  const finish = () => onDone({ ...o, reminder: cleanUserText(o.reminder), project: cleanUserText(o.project) });
  return (
    <div style={{ ...pad, minHeight: "100%", display: "flex", flexDirection: "column", paddingTop: 60 }}>
      {step > 0 && <Progress step={step - 1} total={6} />}
      {step === 0 && (
        <div className="fade" style={{ ...stepWrap, justifyContent: "flex-start", paddingTop: 14 }}>
          <p style={{ ...kicker, letterSpacing: 4 }}>Clear Morning</p>
          <h1 style={{ ...h1, fontSize: 30, marginTop: 6, lineHeight: 1.12 }}>Catch yourself before you do something you'll regret.</h1>
          <p style={{ ...sub, fontSize: 15, marginTop: 12, maxWidth: 330, lineHeight: 1.5 }}>
            Open this before the drink. Before the text. Before the scroll. Before autopilot takes over.
          </p>
          <button style={{ ...primary, marginTop: 22, fontSize: 18, padding: "18px" }} onClick={() => setStep(1)}>Before I decide</button>
          <p style={{ ...sub, textAlign: "center", fontSize: 12.5, marginTop: 9, opacity: 0.7 }}>Takes about a minute.</p>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              "See what's really driving the urge",
              "Remember what matters",
              "Wake up with fewer regrets",
            ].map((t) => (
              <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#9a7b4f", fontSize: 15, lineHeight: 1.35 }}>✓</span>
                <span style={{ ...sub, margin: 0, fontSize: 14.5, lineHeight: 1.35 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <Step kick="One pattern" title="What do you reach for when the day gets loud?">
          {BEHAVIORS.map((b) => <Choice key={b} active={o.primaryBehavior === b} onClick={() => { setO((p) => ({ ...p, primaryBehavior: b })); setTimeout(() => setStep(2), 150); }}>{b}</Choice>)}
        </Step>
      )}
      {step === 2 && (
        <Step kick="The real reach" title="What are you hoping it gives you?">
          {SEEKING.map((s) => <Choice key={s} active={o.seeking === s} onClick={() => { setO((p) => ({ ...p, seeking: s })); setTimeout(() => setStep(3), 150); }}>{s}</Choice>)}
        </Step>
      )}
      {step === 3 && (
        <Step kick="Your moment" title="When does it usually hit?">
          {WHEN.map((w) => <Choice key={w} active={o.usualWhen === w} onClick={() => { setO((p) => ({ ...p, usualWhen: w })); setTimeout(() => setStep(4), 150); }}>{w}</Choice>)}
        </Step>
      )}
      {step === 4 && (
        <div className="fade" style={stepWrap}>
          <p style={kicker}>Why this matters</p>
          <h2 style={{ ...h2, marginBottom: 8 }}>What gets better when you stop folding?</h2>
          <p style={sub}>Folding means giving in to the thing you told yourself you didn't want tonight.</p>
          <p style={sub}>Pick up to 3. These become your anchors.</p>
          <div style={{ marginTop: 24 }}>
            {CORE_REASONS.map((r) => <Choice key={r} active={o.coreReasons.includes(r)} onClick={() => toggleReason(r)}>{r}</Choice>)}
          </div>
          <div style={{ flex: 1 }} />
          <button style={primary} onClick={() => setStep(5)}>Next</button>
        </div>
      )}
      {step === 5 && (
        <div className="fade" style={stepWrap}>
          <p style={kicker}>Build</p>
          <h2 style={{ ...h2, marginBottom: 8 }}>What are you building?</h2>
          <div style={{ marginTop: 6 }}>
            {BUILDS.map((b) => <Choice key={b} active={o.build === b} onClick={() => setO((p) => ({ ...p, build: b }))}>{b}</Choice>)}
          </div>
          {o.build && (
            <>
              <label style={{ ...lbl, marginTop: 20 }}>What's one thing you're actively working on right now?</label>
              <input value={o.project} onChange={(e) => setO((p) => ({ ...p, project: e.target.value }))} placeholder="Type it here — a side business, jiu-jitsu…" style={{ ...input, borderColor: "#9a7b4f" }} />
            </>
          )}
          {o.build ? <div style={{ height: 16 }} /> : <div style={{ flex: 1 }} />}
          <button style={{ ...primary, marginBottom: 8 }} onClick={() => setStep(6)}>Next</button>
        </div>
      )}
      {step === 6 && (
        <div className="fade" style={stepWrap}>
          <p style={kicker}>Last thing</p>
          <h2 style={{ ...h2, marginBottom: 6 }}>What should I remind you when you're close?</h2>
          <p style={sub}>I'll say this back to you in the moment.</p>
          <textarea value={o.reminder} onChange={(e) => setO((p) => ({ ...p, reminder: e.target.value }))} placeholder={'"Tomorrow matters more." · "I hate waking up foggy." · "My kids deserve the present version of me."'} style={textArea} />
          <div style={{ height: 16 }} />
          <button style={primary} onClick={finish}>Start</button>
          <button style={{ ...secondary, marginTop: 10, marginBottom: 8 }} onClick={finish}>Skip the reminder</button>
        </div>
      )}
    </div>
  );
}

/* ── HOME ── */
function Home({ settings, memory, urges, mornings, days, needMorning, needDay, needLastNight, voice, onFold, onMorning, onDay }) {
  const month = new Date().getMonth();
  const clearThis = mornings.filter((m) => new Date(m.date + "T12:00").getMonth() === month && (m.feel === "Clear" || m.feel === "Amazing")).length;
  const checkins = urges.length + mornings.length + days.length;
  const homeTitle = checkins < 3 ? "You don't need to\nfigure out your whole\nlife tonight." : checkins < 6 ? "I'm starting to\nnotice a few things." : "Here's what I'm\nnoticing about you.";
  const cardLabel = checkins < 3 ? "Your pattern" : checkins < 6 ? "What you told me" : "What I know so far";
  const cardBody = checkins < 3 ? onboardingCard(settings) : noticedToday(memory, urges, mornings, days);

  return (
    <div style={pad}>
      <p style={kicker}>Clear Morning{settings.name ? ` · ${settings.name}` : ""}</p>
      <h1 style={{ ...h1, whiteSpace: "pre-line" }}>{homeTitle}</h1>

      <div style={brandCard}>
        <p style={{ margin: 0, color: "#7a6b58", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>{cardLabel}</p>
        <p style={{ margin: "10px 0 0", fontFamily: "'Fraunces',serif", color: "#e8ddcc", fontSize: 18, lineHeight: 1.45 }}>{cardBody}</p>
      </div>

      <button style={foldBtn} onClick={onFold}>
        <span style={{ fontSize: 21, fontWeight: 500 }}>I need a reality check</span>
        <span style={{ fontSize: 13, opacity: 0.7, marginTop: 5 }}>get through the next 10 minutes</span>
      </button>

      {needMorning && <button style={{ ...secondary, marginTop: 12 }} onClick={onMorning}>How did you wake up?</button>}
      {needLastNight && <button style={{ ...secondary, marginTop: 12 }} onClick={onMorning}>How did last night go?</button>}
      {needDay
        ? <button style={{ ...secondary, marginTop: 12 }} onClick={onDay}>What kind of day are you having?</button>
        : (days.find((dd) => dd.date === todayKey()) && new Date().getHours() >= 12
            ? <button style={{ ...secondary, marginTop: 12, opacity: 0.6 }} onClick={onDay}>Today's check-in saved · edit</button>
            : null)}

      <div style={miniRow}>
        <div style={mini}><div style={miniNum}>{clearThis}</div><div style={miniLbl}>clear mornings this month</div></div>
        <div style={mini}><div style={miniNum}>{urges.length}</div><div style={miniLbl}>urges interrupted</div></div>
      </div>
      {memory.commonTrigger && (
        <p style={{ ...sub, textAlign: "center", marginTop: 18, fontSize: 12.5, letterSpacing: 0.5 }}>
          Most common driver: <span style={{ color: "#c8b79a" }}>{memory.commonTrigger.toLowerCase()}</span>
        </p>
      )}
    </div>
  );
}

function behaviorPhrase(b) {
  const x = (b || "").toLowerCase();
  if (x === "drink") return "a drink";
  if (x === "smoke") return "a smoke";
  if (x === "scroll") return "your phone";
  if (x === "eat") return "food";
  if (x === "text someone") return "your phone";
  return "the thing";
}
function onboardingCard(s) {
  const behavior = behaviorPhrase(s.primaryBehavior);
  const when = s.usualWhen ? s.usualWhen.toLowerCase() : "when the urge shows up";
  return `You said you usually reach for ${behavior} ${when}. When that moment hits, open this before you decide.`;
}

/* ── INTERVENTION ── */
function Intervene({ settings, memory, urges, mornings, days, feedback, replacements, voice, onComplete, onFeedback, onCancel }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({ behavior: null, trigger: null, context: null, replacement: null, dropped: null, tomorrow: null });
  const set = (k, v, advance = true) => { setD((p) => ({ ...p, [k]: v })); if (advance) setTimeout(() => setStep((s) => s + 1), 150); };
  const next = () => setStep((s) => s + 1);
  const playRef = useRef(null);

  return (
    <div style={{ ...pad, minHeight: "100%", display: "flex", flexDirection: "column", paddingTop: 54 }}>
      <button style={close} onClick={onCancel}>✕</button>
      <Progress step={step} total={9} />

      {voice && (
        <button style={voiceBar} onClick={() => playRef.current && playRef.current.play()}>Hear from clear-headed you</button>
      )}
      {voice && <audio ref={playRef} src={voice} />}

      {step === 0 && <Step kick="Right now" title="What are you about to do?">{BEHAVIORS.map((b) => <Choice key={b} active={d.behavior === b} onClick={() => set("behavior", b)}>{b}</Choice>)}</Step>}
      {step === 1 && <Step kick="Be honest" title="What are you actually reaching for?">{TRIGGERS.map((t) => <Choice key={t} active={d.trigger === t} onClick={() => set("trigger", t)}>{t}</Choice>)}</Step>}
      {step === 2 && <Step kick="One more thing" title="What happened right before this?">{CONTEXTS.map((c) => <Choice key={c} active={d.context === c} onClick={() => set("context", c)}>{c}</Choice>)}</Step>}
      {step === 3 && <RealityCheck settings={settings} memory={memory} urges={urges} mornings={mornings} days={days} feedback={feedback} d={d} onNext={(line) => { setD((p) => ({ ...p, realityLine: line })); setStep(4); }} />}
      {step === 4 && <ImmediateAction behavior={d.behavior} context={d.context} replacements={replacements} onNext={(replacement) => { setD((p) => ({ ...p, replacement })); setStep(5); }} />}
      {step === 5 && <Hold replacement={d.replacement} onNext={next} />}
      {step === 6 && <Step kick="Proof" title="What happened to the urge?"><p style={{ ...sub, marginTop: -14, marginBottom: 22 }}>You didn't beat it by thinking harder. You changed state, waited, and gave the feeling room to move.</p>{DROP.map((x) => <Choice key={x} active={d.dropped === x} onClick={() => set("dropped", x)}>{x}</Choice>)}</Step>}
      {step === 7 && <Step kick="Lock it in" title="How do you want to wake up?">{TOMORROW.map((t) => <Choice key={t} active={d.tomorrow === t} onClick={() => { setD((p) => ({ ...p, tomorrow: t, completedAt: Date.now() })); setTimeout(() => setStep(8), 150); }}>{t}</Choice>)}</Step>}
      {step === 8 && <Feedback line={d.realityLine} onDone={(verdict, note) => { if (verdict) track("reality_check_rated", { rating: verdict }); if (onFeedback && verdict) onFeedback({ verdict, note, line: d.realityLine, behavior: d.behavior, context: d.context }); onComplete({ ...d }); }} />}
    </div>
  );
}

function Feedback({ line, onDone }) {
  const [verdict, setVerdict] = useState(null);
  const [missNote, setMissNote] = useState("");
  return (
    <div className="fade" style={stepWrap}>
      <p style={kicker}>One quick thing</p>
      <h2 style={{ ...h2, marginBottom: 8 }}>Did this feel accurate?</h2>
      {line && <p style={{ ...sub, fontStyle: "italic", marginTop: 4 }}>"{line}"</p>}
      {verdict !== "miss" ? (
        <div style={{ marginTop: 26 }}>
          <button style={{ ...secondary, marginBottom: 12 }} onClick={() => onDone("very")}>Very accurate</button>
          <button style={{ ...secondary, marginBottom: 12 }} onClick={() => onDone("somewhat")}>Somewhat</button>
          <button style={secondary} onClick={() => setVerdict("miss")}>Not really — it missed something</button>
        </div>
      ) : (
        <div style={{ marginTop: 22 }}>
          <p style={{ ...sub, margin: "0 0 8px" }}>What was actually going on?</p>
          <textarea value={missNote} onChange={(e) => setMissNote(e.target.value)} placeholder="e.g. I wasn't stressed — I was bored. Or: I was avoiding work." style={{ ...textArea, minHeight: 80, marginTop: 0 }} />
          <button style={{ ...primary, marginTop: 10 }} onClick={() => onDone("miss", missNote.trim())}>Save</button>
        </div>
      )}
      <div style={{ flex: 1 }} />
      <button style={{ ...sub, background: "none", border: "none", textAlign: "center", padding: 8 }} onClick={() => onDone(null)}>Skip</button>
    </div>
  );
}

function ThinkingIcon() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 40, color: "#9a8a72", textAlign: "center" }}>
      <span style={{ display: "inline-flex", gap: 9 }}>
        <span style={{ ...thinkingDot, width: 11, height: 11, animationDelay: "0s" }} />
        <span style={{ ...thinkingDot, width: 11, height: 11, animationDelay: "0.2s" }} />
        <span style={{ ...thinkingDot, width: 11, height: 11, animationDelay: "0.4s" }} />
      </span>
      <span style={{ fontFamily: "'Fraunces',serif", fontSize: 19, fontStyle: "italic", color: "#c8b79a" }}>Thinking through your moment</span>
      <span style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>Looking at your patterns, what's worked before, and what you told yourself matters.</span>
    </div>
  );
}

function RealityCheck({ settings, memory, urges, mornings, days, feedback, d, onNext }) {
  const [aiLine, setAiLine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  // Guaranteed-personal line, built as COMPLETE thoughts (Pattern → Building → Reminder), never stitched fragments.
  const yref = yesterdayRef(urges, mornings, days);
  const personal = (() => {
    const seed = urges.length + (mornings.length || 0);
    const pick = (arr) => arr[seed % arr.length];
    const bn = behaviorPhrase(d.behavior); // "a drink", "your phone", "food"
    const reason = (settings.coreReasons || [])[0] || "";
    const build = settings.build || "";
    const project = (settings.project || "").trim();
    const futureSelf = (settings.futureSelf || "").trim();
    const skill = (settings.skills || [])[0] || "";
    const rw = memory.riskWindow || "";

    // 1) PATTERN — one short, honest sentence about the moment (no false history claims early)
    const ctxShort = {
      "Work": "after a long day, when there's nothing left in the tank",
      "Argument": "right after friction with someone",
      "Kids/family": "when the family stress piles up",
      "Scrolling": "after you've been on your phone for a while",
      "Bored at home": "when the night goes quiet and empty",
      "After dinner": "after dinner, as the day winds down",
      "Late night alone": "late at night, when you're alone",
      "Celebrating": "when there's something to celebrate",
    }[d.context];
    const seeking = (settings.seeking || "").trim();
    const realReach = seeking ? ` What you're really after is ${seeking.toLowerCase()}, not ${bn}.` : "";
    const patternSentence = ((urges.length >= 3 && rw
      ? `This is your ${rw} stretch — the one where your brain starts negotiating.`
      : (ctxShort ? `This tends to hit ${ctxShort}.` : "")) + realReach).trim();

    // 2) BUILDING — the identity reframe, complete sentence, project first
    const reasonClause = {
      "Marriage": "a little better for your marriage tomorrow",
      "Parenting": "a little more present for your kids tomorrow",
      "Fitness": "a little closer to the body you're building",
      "Business": "a little sharper for the work that matters",
      "Faith": "a little more grounded tomorrow",
      "Mental health": "a little steadier tomorrow",
      "Sleep": "a little more rested tomorrow",
      "Confidence": "a little prouder of yourself tomorrow",
      "Finances": "a little closer to where you want to be",
    }[reason];

    // 2) THE REFRAME — pick ONE angle by weight, so the project is an occasional card, not the default.
    // ~50% pattern/need, ~25% recent evidence, ~15% project/build, ~10% reminder-as-reframe.
    const lastClear = memory.lastClearMorningCause;
    const recentEvidence = [];
    if (rw && urges.length >= 4) recentEvidence.push(`The last few times, this showed up ${ctxShort || `during your ${rw} stretch`} — and it passed.`);
    if (lastClear) recentEvidence.push(`Last time you waited this out, you woke up clear.`);
    if (memory.bestReplacement) recentEvidence.push(`${memory.bestReplacement} has worked for you before — better than you expect in the moment.`);

    const needLine = seeking
      ? `The urge right now is for ${seeking.toLowerCase()} — the ${bn} is just the closest thing. The feeling moves on its own if you let it.`
      : `This feeling peaks and then drops on its own. You don't have to do anything with it.`;

    const projectLine = project
      ? `You're not really deciding about ${bn} — you're deciding whether tomorrow's energy goes toward ${project}, or toward recovering from tonight.`
      : (build ? `Tonight isn't really about ${bn}. It's about ${areaObject(build)}.` : "");

    const roll = Math.random();
    let buildingSentence = "";
    if (roll < 0.50) {
      buildingSentence = needLine; // pattern / emotional need
    } else if (roll < 0.75 && recentEvidence.length) {
      buildingSentence = pick(recentEvidence); // recent evidence
    } else if (roll < 0.90 && projectLine && urges.length > 3) {
      buildingSentence = projectLine; // project/build — occasional, only once they have history
    } else if (reasonClause) {
      buildingSentence = `Every time you don't fold, you wake up ${reasonClause}.`;
    } else {
      buildingSentence = needLine;
    }

    // 3) REMINDER — their own words, or a clean closing nudge
    const reminderSentence = settings.reminder
      ? `Remember what you told me: "${settings.reminder}"`
      : pick([
          "Don't trade tomorrow for the next ten minutes.",
          "Ten minutes from now this is quieter — and tomorrow you're glad.",
          "Don't hand tomorrow's clear morning to right now.",
        ]);

    const sentences = [patternSentence, buildingSentence, reminderSentence].filter(Boolean);
    if (sentences.length === 0) return firstUseLine(d.context, d.behavior, settings.tone);
    return sentences.slice(0, 3).join(" ");
  })();

  useEffect(() => {
    let off = false;
    (async () => {
      setLoading(true);
      const startedAt = Date.now();
      const txt = await askClaude(buildRealityPrompt({ settings, memory, urges, mornings, days, feedback, d, yref }), 160, 1);
      // Keep the thinking dots on screen at least 700ms — instant replies feel fake.
      const elapsed = Date.now() - startedAt;
      if (elapsed < 700) await new Promise((r) => setTimeout(r, 700 - elapsed));
      if (!off && txt) { setAiLine(txt); setSource("ai"); }
      else if (!off) setSource("fallback");
      if (!off) setLoading(false);
    })();
    return () => { off = true; };
  }, []);

  const shownLine = loading ? "" : (aiLine || personal);

  return (
    <div className="fade" style={stepWrap}>
      <p style={kicker}>Reality check</p>
      {loading ? (
        <ThinkingIcon />
      ) : (
        <p style={{ fontFamily: "'Fraunces',serif", color: "#e8ddcc", fontSize: 23, lineHeight: 1.38, margin: "4px 0 0", whiteSpace: "pre-line" }}>
          {shownLine}
        </p>
      )}
      {!loading && source === "fallback" && DEBUG_AI && <p style={{ ...sub, fontSize: 11, opacity: 0.6 }}>[using fallback — {LAST_AI_ERROR || "no AI available"}]</p>}
      <div style={{ flex: 1 }} />
      <button style={primary} onClick={() => onNext(shownLine)} disabled={loading}>Choose your next 10 minutes →</button>
    </div>
  );
}

const MOVE_OPTIONS = ["Walk", "Shower", "Journal", "Make tea", "Call someone", "Clean something", "Custom"];
function ImmediateAction({ behavior, context, replacements, onNext }) {
  const [picked, setPicked] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  // Lead with any build-aligned replacement the user set up, then the standard moves.
  const leadMoves = (replacements || []).filter((r) => r && !MOVE_OPTIONS.includes(r) && r !== "Pour something familiar").slice(0, 2);
  const options = [...leadMoves, ...MOVE_OPTIONS];
  if (customOpen) {
    return (
      <div className="fade" style={stepWrap}>
        <p style={kicker}>Your move</p>
        <h2 style={{ ...h2, marginBottom: 8 }}>What are you going to do for the next 10 minutes?</h2>
        <input value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Type it here — anything but the thing you came here to avoid." style={{ ...input, borderColor: "#9a7b4f" }} autoFocus />
        <div style={{ height: 16 }} />
        <button style={{ ...primary, marginBottom: 8 }} disabled={!customText.trim()} onClick={() => onNext(cleanUserText(customText) || "your own move")}>Start the 10 minutes</button>
        <button style={secondary} onClick={() => setCustomOpen(false)}>← back</button>
      </div>
    );
  }
  return (
    <div className="fade" style={stepWrap}>
      <p style={kicker}>Your move</p>
      <h2 style={{ ...h2, marginBottom: 8 }}>What's your move for the next 10 minutes?</h2>
      <p style={sub}>Anything but the thing you came here to avoid. Pick one and start.</p>
      <div style={{ flex: 1 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {options.map((r) => (
          <Choice key={r} grid active={picked === r} onClick={() => {
            if (r === "Custom") { setCustomOpen(true); return; }
            setPicked(r); setTimeout(() => onNext(r), 160);
          }}>{r}</Choice>
        ))}
      </div>
    </div>
  );
}

function Hold({ replacement, onNext }) {
  const [left, setLeft] = useState(600);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  const done = left <= 0;
  const guide = holdGuidance(left, replacement);
  return (
    <div className="fade" style={{ ...stepWrap, alignItems: "center", textAlign: "center" }}>
      <p style={kicker}>The next 10 minutes are yours</p>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 66, color: "#9a7b4f", lineHeight: 1 }}>
          {m}:{String(s).padStart(2, "0")}
        </div>
        <p style={{ ...sub, marginTop: 16, maxWidth: 300 }}>
          Good choice. Just do this for 10 minutes. You don't need to decide anything else right now.
        </p>
        <div style={{ ...aiCard, marginTop: 24, width: "100%" }}>
          <p style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 20, lineHeight: 1.4, color: "#e8ddcc" }}>
            {guide.title}
          </p>
          <p style={{ ...sub, marginTop: 8 }}>
            {guide.body}
          </p>
        </div>
      </div>
      <button style={done ? primary : secondary} onClick={onNext}>
        {done ? "I made it →" : "I'm through it. Keep going →"}
      </button>
    </div>
  );
}

/* ── DAILY CHECK-INS ── */
function Morning({ existing, onDone, onCancel }) {
  const [feel, setFeel] = useState(existing?.feel ?? null);
  const [step, setStep] = useState(0);
  return (
    <div style={{ ...wrapMorning, minHeight: "100%", display: "flex", flexDirection: "column", padding: "54px 26px 26px" }}>
      <button style={{ ...close, color: "#a98" }} onClick={onCancel}>✕</button>
      {step === 0 ? (
        <div className="fade" style={stepWrap}>
          <p style={{ ...kicker, color: "#b89878" }}>This morning</p>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 400, fontSize: 30, color: "#2a1d12", margin: "4px 0 0" }}>How did you wake up?</h2>
          <p style={{ ...sub, color: "#7a5d44" }}>This is the proof your night-self was right.</p>
          <div style={{ marginTop: 30 }}>
            {FEELINGS.map((f) => <button key={f} onClick={() => { setFeel(f); setTimeout(() => setStep(1), 150); }} style={{ ...choiceBase, border: "1px solid #d9c4a8", color: "#3a2a1c", background: feel === f ? "rgba(154,123,79,0.22)" : "rgba(255,255,255,0.4)" }}>{f}</button>)}
          </div>
        </div>
      ) : (
        <div className="fade" style={stepWrap}>
          <p style={{ ...kicker, color: "#b89878" }}>Honest check</p>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 400, fontSize: 30, color: "#2a1d12", margin: "4px 0 0" }}>How did last night go?</h2>
          <p style={{ ...sub, color: "#7a5d44" }}>No judgment. This is how I learn what actually trips you up.</p>
          <div style={{ marginTop: 30 }}>
            <button onClick={() => onDone(feel, false)} style={{ ...choiceBase, border: "1px solid #d9c4a8", color: "#3a2a1c", background: "rgba(255,255,255,0.4)" }}>I stayed clear</button>
            <button onClick={() => onDone(feel, true)} style={{ ...choiceBase, border: "1px solid #d9c4a8", color: "#3a2a1c", background: "rgba(255,255,255,0.4)" }}>I want to log what happened</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCheckin({ existing, onDone, onCancel }) {
  const [kind, setKind] = useState(existing?.dayKind ?? null);
  const [carry, setCarry] = useState(existing?.carrying ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [step, setStep] = useState(0);
  return (
    <div style={{ ...pad, minHeight: "100%", display: "flex", flexDirection: "column", paddingTop: 54 }}>
      <button style={close} onClick={onCancel}>✕</button>
      {step === 0 && <Step kick="Checking in" title="How has today felt so far?">{DAYKIND.map((x) => <Choice key={x} active={kind === x} onClick={() => { setKind(x); setTimeout(() => setStep(1), 150); }}>{x}</Choice>)}</Step>}
      {step === 1 && (
        <div className="fade" style={stepWrap}>
          <p style={kicker}>Looking ahead</p>
          <h2 style={{ ...h2, marginBottom: 8 }}>What could pull you off track later?</h2>
          <div style={{ marginTop: 6 }}>
            {CARRYING.map((x) => <Choice key={x} active={carry === x} onClick={() => setCarry(x)}>{x}</Choice>)}
          </div>
          <div style={{ flex: 1 }} />
          <button style={{ ...primary, marginBottom: 8 }} disabled={!carry} onClick={() => onDone(kind, carry, "")}>Save check-in</button>
          <button style={secondary} disabled={!carry} onClick={() => setStep(2)}>Add a note</button>
        </div>
      )}
      {step === 2 && (
        <div className="fade" style={stepWrap}>
          <p style={kicker}>In your own words</p>
          <h2 style={{ ...h2, marginBottom: 6 }}>Say it however it actually feels.</h2>
          <p style={sub}>One line. This is what I'll remember about today.</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Work was a lot. I'm tired and I don't want to think." style={textArea} />
          <div style={{ height: 16 }} />
          <button style={{ ...primary, marginBottom: 8 }} onClick={() => onDone(kind, carry, cleanUserText(note))}>Save check-in</button>
          <button style={secondary} onClick={() => setStep(1)}>← back</button>
        </div>
      )}
    </div>
  );
}

/* ── PATTERNS (Proof / Wins / Your playbook + levels) ── */
function Insights({ urges, mornings, days, memory }) {
  const [ai, setAi] = useState([]);
  const [loading, setLoading] = useState(false);
  const month = new Date().getMonth();
  const clearThis = mornings.filter((m) => new Date(m.date + "T12:00").getMonth() === month && (m.feel === "Clear" || m.feel === "Amazing")).length;
  const clearPct = mornings.length ? Math.round(mornings.filter((m) => m.feel === "Clear" || m.feel === "Amazing").length / mornings.length * 100) : null;
  const waited = urges.filter((u) => u.dropped);
  const dropPct = waited.length ? Math.round(waited.filter((u) => u.dropped !== "It got stronger").length / waited.length * 100) : null;
  const wins = recentWins(urges, mornings);
  const foldByContext = foldRates(urges, mornings, "context");
  const foldByTrigger = foldRates(urges, mornings, "trigger");

  useEffect(() => {
    if (urges.length < 4) return;
    let off = false;
    (async () => {
      try { const c = await store.get(K.insight); if (c?.value) { const p = JSON.parse(c.value); if (p.n === urges.length) { setAi(p.lines); return; } } } catch (_) {}
      setLoading(true);
      try {
        const txt = (await askClaude(
`You write the weekly "here's what I noticed about you" for Clear Morning. Voice: calm friend / sharp older brother. No preaching, no therapy-speak, no "quit/sober," no "you got this."
Their memory profile: ${JSON.stringify(memory)}.
Raw: ${summarize(urges)}. Mornings: ${mornings.map((m) => m.feel).join(", ") || "none"}. Days: ${days.map((d) => d.dayKind + (d.note ? ` ("${d.note}")` : "/" + d.carrying)).join("; ") || "none"}.
Return ONLY a JSON array of 3 short conversational insights (each under 22 words) that sound like a friend who's been watching — name the real driver, the risk moment, and what actually works for THEM. JSON array only.`
        )).replace(/```json|```/g, "").trim();
        const lines = JSON.parse(txt);
        if (!off && Array.isArray(lines)) { setAi(lines); try { await store.set(K.insight, JSON.stringify({ n: urges.length, lines })); } catch (_) {} }
      } catch (_) {}
      if (!off) setLoading(false);
    })();
    return () => { off = true; };
  }, [urges.length]);

  const riskPhrase = memory.riskWindow ? `You're usually fine until the house gets quiet. That ${memory.riskWindow} stretch is where your brain starts negotiating.` : null;

  return (
    <div style={pad}>
      <p style={kicker}>Patterns</p>
      <h2 style={h2}>What I've noticed about you</h2>

      <div style={{ ...miniRow, marginTop: 20 }}>
        <div style={mini}><div style={miniNum}>{mornings.filter((m) => m.feel === "Clear" || m.feel === "Amazing").length}</div><div style={miniLbl}>clear mornings</div></div>
        <div style={mini}><div style={miniNum}>{urges.length}</div><div style={miniLbl}>urges interrupted</div></div>
      </div>
      {memory.commonTrigger && <Fact label="Most common driver" value={memory.commonTrigger} />}

      {urges.length < 4 ? (
        <p style={{ ...sub, marginTop: 20 }}>A few more check-ins and this gets sharp — the "this app actually knows me" moment lands around check-in 4 or 5.</p>
      ) : (
        <>
          <SectionLabel>The read</SectionLabel>
          {loading && ai.length === 0 && <p style={{ ...sub, fontStyle: "italic" }}>finding the pattern…</p>}
          {ai.map((line, i) => (
            <div key={i} className="fade" style={{ ...aiCard, animationDelay: `${i * 90}ms` }}>
              <p style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 18, lineHeight: 1.42, color: "#e8ddcc" }}>{line}</p>
            </div>
          ))}
          {riskPhrase && <div style={aiCard}><p style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 17, lineHeight: 1.42, color: "#c8b79a" }}>{riskPhrase}</p></div>}

          <SectionLabel>Proof</SectionLabel>
          <div style={miniRow}>
            <div style={mini}><div style={miniNum}>{clearThis}</div><div style={miniLbl}>clear mornings this month</div></div>
            <div style={mini}><div style={miniNum}>{urges.length}</div><div style={miniLbl}>urges waited out</div></div>
          </div>

          {(foldByContext.length > 0 || foldByTrigger.length > 0) && (
            <>
              <SectionLabel>Possible risk patterns</SectionLabel>
              {(foldByContext.length ? foldByContext : foldByTrigger).slice(0, 4).map((r) => (
                <Fact key={r.label} label={r.label} value={`${r.pct}% fold rate`} />
              ))}
            </>
          )}

          <SectionLabel>Wins</SectionLabel>
          {wins.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {wins.map((w, i) => (
                <div key={i} style={aiCard}>
                  <p style={{ margin: "0 0 6px", color: "#7a6b58", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>{winWhen(w.ts, w.date)}</p>
                  <p style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 17, lineHeight: 1.42, color: "#e8ddcc" }}>
                    You wanted {behaviorPhrase(w.behavior)} and chose {w.replacement.toLowerCase()} instead{w.morning ? `. You woke up ${w.morning.toLowerCase()}.` : "."}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div style={miniRow}>
            <div style={mini}><div style={miniNum}>{dropPct ?? "—"}%</div><div style={miniLbl}>the urge dropped when you waited</div></div>
            <div style={mini}><div style={miniNum}>{clearPct ?? "—"}%</div><div style={miniLbl}>mornings clear</div></div>
          </div>
          {memory.bestReplacement && <Fact label="What works for you" value={memory.bestReplacement} />}
          {memory.commonBehavior && <Fact label="Most common urge" value={memory.commonBehavior} />}
          {memory.commonTrigger && <Fact label="Real driver" value={memory.commonTrigger} />}
        </>
      )}
    </div>
  );
}
const SectionLabel = ({ children }) => <p style={{ ...kicker, marginTop: 30, color: "#9a7b4f" }}>{children}</p>;
const Fact = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 0", borderBottom: "1px solid #1f1810" }}>
    <span style={{ color: "#7a6b58", fontSize: 14 }}>{label}</span><span style={{ color: "#c8b79a", fontSize: 14, fontWeight: 500 }}>{value}</span>
  </div>
);

/* ── YOU + clear-headed you ── */
function You({ settings, urges, voice, saveVoice, onChange }) {
  const [newRep, setNewRep] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState("");
  const recRef = useRef(null); const chunks = useRef([]); const timerRef = useRef(null); const playRef = useRef(null);

  const startRec = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); const blob = new Blob(chunks.current, { type: "audio/webm" }); const r = new FileReader(); r.onload = () => saveVoice(r.result); r.readAsDataURL(blob); };
      mr.start(); recRef.current = mr; setRecording(true); setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => {
        const next = e + 1;
        if (next >= 60) { stopRec(); return 60; }
        return next;
      }), 1000);
    } catch (e) { setErr("Mic isn't available in this preview — it works in the shipped app."); }
  };
  const stopRec = () => { try { recRef.current && recRef.current.stop(); } catch (_) {} clearInterval(timerRef.current); setRecording(false); };

  return (
    <div style={pad}>
      <p style={kicker}>You</p>
      <h2 style={h2}>Your setup</h2>

      <div style={{ ...aiCard, marginTop: 22 }}>
        <p style={{ margin: "0 0 4px", color: "#c8b79a", fontSize: 15, fontWeight: 500 }}>Clear-headed you</p>
        <p style={{ margin: "0 0 14px", color: "#7a6b58", fontSize: 13, lineHeight: 1.5 }}>Record a message to the version of you who's about to fold. It's the first thing you can hit in emergency mode.</p>
        {!recording ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...primary, width: "auto", padding: "12px 18px", fontSize: 14 }} onClick={startRec}>{voice ? "Re-record" : "● Record"}</button>
            {voice && <button style={{ ...secondary, width: "auto", padding: "12px 18px", fontSize: 14 }} onClick={() => playRef.current && playRef.current.play()}>Listen</button>}
            {voice && <button style={{ ...secondary, width: "auto", padding: "12px 18px", fontSize: 14, borderColor: "#4a2a2a", color: "#a87" }} onClick={() => saveVoice(null)}>Delete</button>}
          </div>
        ) : (<button style={{ ...primary, width: "auto", padding: "12px 22px", fontSize: 14, background: "#b5483f" }} onClick={stopRec}>■ Stop ({elapsed}s)</button>)}
        {err && <p style={{ color: "#a87", fontSize: 12.5, marginTop: 10, lineHeight: 1.4 }}>{err}</p>}
        {voice && <audio ref={playRef} src={voice} />}
      </div>

      <label style={{ ...lbl, marginTop: 22 }}>What should I remind you when you're close?</label>
      <textarea value={settings.reminder || ""} onChange={(e) => onChange({ ...settings, reminder: e.target.value })} onBlur={(e) => onChange({ ...settings, reminder: cleanUserText(e.target.value) })} placeholder={'"Tomorrow matters more." · "My kids deserve the present version of me." · "I\'m not going back to that version."'} style={{ ...textArea, minHeight: 76, marginTop: 0 }} />

      <label style={{ ...lbl, marginTop: 22 }}>What are you building?</label>
      <select value={settings.build || ""} onChange={(e) => onChange({ ...settings, build: e.target.value })} style={input}>
        <option value="">Choose one</option>
        {BUILDS.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <label style={lbl}>Why does it matter?</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CORE_REASONS.map((r) => {
          const active = (settings.coreReasons || []).includes(r);
          return (
            <span key={r} onClick={() => {
              const current = settings.coreReasons || [];
              const next = active ? current.filter((x) => x !== r) : [...current, r].slice(0, 3);
              onChange({ ...settings, coreReasons: next });
            }} style={{ ...chip, background: active ? "rgba(154,123,79,0.16)" : "transparent" }}>{r}</span>
          );
        })}
      </div>
      <label style={{ ...lbl, marginTop: 22 }}>90 days from now</label>
      <textarea value={settings.futureSelf || ""} onChange={(e) => onChange({ ...settings, futureSelf: e.target.value })} onBlur={(e) => onChange({ ...settings, futureSelf: cleanUserText(e.target.value) })} placeholder="More energy, better sleep, better workouts, more present at home." style={{ ...textArea, minHeight: 76, marginTop: 0 }} />

      <label style={lbl}>Skills I'm building</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SKILLS.map((sk) => {
          const active = (settings.skills || []).includes(sk);
          return (
            <span key={sk} onClick={() => {
              const current = settings.skills || [];
              const next = active ? current.filter((x) => x !== sk) : [...current, sk].slice(0, 3);
              onChange({ ...settings, skills: next });
            }} style={{ ...chip, background: active ? "rgba(154,123,79,0.16)" : "transparent" }}>{sk}</span>
          );
        })}
      </div>

      <label style={lbl}>First name</label>
      <input value={settings.name} onChange={(e) => onChange({ ...settings, name: e.target.value })} placeholder="What we call you" style={input} />

      <label style={{ ...lbl, marginTop: 22 }}>How should I talk to you?</label>
      <div style={{ display: "flex", gap: 8 }}>
        {["Calm friend", "Sharp older brother"].map((t) => (
          <button key={t} onClick={() => onChange({ ...settings, tone: t })} style={{ ...choiceBase, marginBottom: 0, flex: 1, textAlign: "center", fontSize: 13.5, border: `1px solid ${settings.tone === t ? "#9a7b4f" : "#2a2018"}`, background: settings.tone === t ? "rgba(154,123,79,0.14)" : "transparent", color: settings.tone === t ? "#e8ddcc" : "#8a7b66" }}>{t}</button>
        ))}
      </div>

      <div style={toggleRow} onClick={() => onChange({ ...settings, faithMode: !settings.faithMode })}>
        <div><div style={{ color: "#e8ddcc", fontSize: 15 }}>Faith mode</div><div style={{ color: "#6f6253", fontSize: 12, marginTop: 2 }}>Adds Prayer as a replacement</div></div>
        <div style={tog(settings.faithMode)}><div style={dot(settings.faithMode)} /></div>
      </div>

      <label style={{ ...lbl, marginTop: 22 }}>Your own replacements</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={newRep} onChange={(e) => setNewRep(e.target.value)} placeholder="Add one (e.g. Gym)" style={{ ...input, marginBottom: 0 }} />
        <button style={{ ...secondary, width: "auto", padding: "0 18px" }} onClick={() => { if (newRep.trim()) { onChange({ ...settings, custom: [...(settings.custom || []), newRep.trim()] }); setNewRep(""); } }}>Add</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {(settings.custom || []).map((c) => <span key={c} style={chip} onClick={() => onChange({ ...settings, custom: settings.custom.filter((x) => x !== c) })}>{c} ✕</span>)}
      </div>
      <p style={{ ...sub, marginTop: 30 }}>{urges.length} check-ins logged. Everything stays on this device.</p>
    </div>
  );
}

/* ── shared ── */
const Step = ({ kick, title, children }) => (<div className="fade" style={stepWrap}><p style={kicker}>{kick}</p><h2 style={{ ...h2, marginBottom: 24 }}>{title}</h2>{children}</div>);
const Choice = ({ children, active, onClick, grid }) => (
  <button onClick={onClick} style={{ ...choiceBase, ...(grid ? { marginBottom: 0, textAlign: "center", padding: "20px 8px" } : {}), border: `1px solid ${active ? "#9a7b4f" : "#2a2018"}`, background: active ? "rgba(154,123,79,0.14)" : "transparent", color: active ? "#e8ddcc" : "#8a7b66" }}>{children}</button>
);
const Progress = ({ step, total }) => (<div style={{ display: "flex", gap: 5, marginBottom: 22 }}>{Array.from({ length: total }).map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "#9a7b4f" : "#2a2018", transition: "background .3s" }} />)}</div>);

/* ── MEMORY ENGINE ── */
function computeMemory(urges, mornings, days, settings) {
  const byDate = {}; mornings.forEach((m) => byDate[m.date] = m.feel);
  const lastDay = days[0];
  // last clear morning cause
  let lastClearCause = null;
  for (const m of mornings) {
    if (m.feel === "Clear" || m.feel === "Amazing") {
      const u = urges.find((x) => x.date === m.date && x.replacement);
      if (u) { lastClearCause = `Chose ${u.replacement.toLowerCase()} instead of ${(u.behavior || "the thing").toLowerCase()}`; break; }
    }
  }
  return {
    commonBehavior: mode(urges.map((u) => u.behavior).filter(Boolean)),
    commonTrigger: mode(urges.map((u) => u.trigger).filter(Boolean)),
    commonContext: mode(urges.map((u) => u.context).filter(Boolean)),
    riskWindow: peakWindow(urges),
    bestReplacement: bestReplacement(urges, mornings),
    lastClearMorningCause: lastClearCause,
    recentEmotion: lastDay ? (lastDay.note ? `"${lastDay.note}"` : `${lastDay.dayKind} day, carrying ${String(lastDay.carrying || "").toLowerCase()}`) : (urges[0]?.context || null),
    identityGoal: mode(urges.map((u) => u.tomorrow).filter(Boolean)) || "Clear",
    primaryBehavior: settings.primaryBehavior,
    seeking: settings.seeking || "",
    usualWhen: settings.usualWhen,
    reminder: settings.reminder,
    faithMode: settings.faithMode,
    coreReasons: settings.coreReasons || [],
    build: settings.build || "",
    project: settings.project || "",
    futureSelf: settings.futureSelf || "",
    skills: settings.skills || [],
    tone: settings.tone,
  };
}

function firstUseLine(context, behavior, tone) {
  const b = (behavior || "the thing").toLowerCase();
  const sharp = tone === "Sharp older brother";
  const map = {
    "Work": `Work didn't make you weak — it left you empty, and your brain's trying to fill the quiet fast. ${b === "drink" ? "The drink" : "This"} won't fill it. It'll just blur it.`,
    "Argument": `You're not reaching for ${b}. You're reaching for the off switch on a conversation that's still running in your head.`,
    "Kids/family": `You poured out all day. There's nothing left and you're trying to borrow some — but this charges interest you pay tomorrow.`,
    "Scrolling": `Scrolling primed this. You fed your brain noise and now it wants the next hit. The urge isn't even yours — the screen handed it to you.`,
    "Bored at home": `This isn't desire. It's empty time with no plan, and your brain hates a vacuum. Give it something to do for ten minutes.`,
    "After dinner": `That's a habit wearing the mask of a craving. The meal ended and your hand went looking for the ritual. You can keep the ritual without the fog.`,
    "Late night alone": `The house got quiet and the day finally caught up with you. You don't want ${b}. You want the day to stop pressing on you.`,
    "Celebrating": `You earned the mood. ${b === "drink" ? "The drink" : "This"} won't add to it — it borrows from tomorrow's version of it. Keep the win clean.`,
    "Other": sharp ? `Be honest. You're not craving the thing — you're craving a way to stop feeling the day.` : `You're not really craving ${b}. You're craving a way to stop feeling the day.`,
  };
  return map[context] || map["Other"];
}

function yesterdayRef(urges, mornings, days) {
  const yk = yesterdayKey();
  const yMorn = mornings.find((m) => m.date === yk);
  const yUrge = urges.find((u) => u.date === yk && u.replacement);
  const yDay = days.find((d) => d.date === yk);
  if (yDay && yUrge && yMorn) return `Last night you said it was a ${String(yDay.dayKind).toLowerCase()} day, chose ${yUrge.replacement.toLowerCase()}, and woke up ${yMorn.feel.toLowerCase()}. That's probably your play tonight too.`;
  if (yUrge && yMorn) return `Last night you chose ${yUrge.replacement.toLowerCase()} and woke up ${yMorn.feel.toLowerCase()} — that worked.`;
  if (yDay) return `You came in off a ${String(yDay.dayKind).toLowerCase()} day carrying ${String(yDay.carrying || "").toLowerCase()}.`;
  return null;
}

function noticedToday(mem, urges, mornings, days) {
  const y = days.find((d) => d.date === yesterdayKey());
  const yMorn = mornings.find((m) => m.date === yesterdayKey());
  const yUrge = urges.find((u) => u.date === yesterdayKey() && u.replacement);
  const t = days.find((d) => d.date === todayKey());
  if (!y && !yMorn && !t && urges.length < 2) return dailyNote(mem);

  const parts = [];
  // 1. yesterday
  if (yMorn && yUrge) parts.push(`Yesterday you woke up ${yMorn.feel.toLowerCase()} after choosing ${yUrge.replacement.toLowerCase()}.`);
  else if (yMorn) parts.push(`Yesterday you woke up ${yMorn.feel.toLowerCase()}.`);
  else if (y) parts.push(`Yesterday landed as a ${String(y.dayKind).toLowerCase()} day.`);

  // 2. today's mood (prefer their own words)
  if (t && t.note) parts.push(`Today you said, "${t.note}"`);
  else if (t) parts.push(`Today you said it was ${String(t.dayKind).toLowerCase()}${t.carrying ? `, carrying ${String(t.carrying).toLowerCase()}` : ""}.`);

  // 3. known pattern → reframe
  const b = (mem.commonBehavior || "a drink").toLowerCase();
  if ((t && (t.dayKind === "Draining" || t.dayKind === "Stressful")) || mem.commonTrigger === "Stress relief") {
    parts.push(`That means tonight probably isn't about wanting ${b}. It's about needing the day to end.`);
  } else if (mem.commonContext === "Bored at home" || mem.commonTrigger === "Boredom") {
    parts.push(`That means tonight isn't desire — it's empty time looking for something to do.`);
  } else if (mem.bestReplacement) {
    parts.push(`${mem.bestReplacement} is what's worked for you before.`);
  }

  // 4. one move
  const ph = peakHour(urges);
  if (ph != null) { const hr = ph % 12 === 0 ? 12 : ph % 12; parts.push(`Decide before ${hr}${ph >= 12 ? "pm" : "am"}.`); }
  else parts.push(`Decide before 9, not at 9:45.`);

  return parts.join(" ") || dailyNote(mem);
}

function dailyNote(mem) {
  const n = [];
  if (mem.riskWindow) n.push(`Your hardest nights usually start ${mem.riskWindow}. Decide before it gets a vote.`);
  if (mem.commonContext === "Scrolling") n.push(`Your hardest nights usually start after scrolling. Watch the phone tonight.`);
  if (mem.commonContext === "Bored at home" || mem.commonTrigger === "Boredom") n.push(`You don't need motivation tonight. You need a plan before boredom gets a vote.`);
  if (mem.bestReplacement) n.push(`On your clear mornings, ${mem.bestReplacement.toLowerCase()} usually came first. Keep it close tonight.`);
  if (mem.lastClearMorningCause) n.push(`${mem.lastClearMorningCause} — and you woke up clear. Same move's available tonight.`);
  if (mem.project) n.push(`This isn't about being perfect tonight. It's about whether tomorrow's energy goes toward ${mem.project}.`);
  else if (mem.build) n.push(`This isn't about being perfect tonight. It's about ${areaObject(mem.build)}.`);
  if (mem.coreReasons?.length) n.push(`${mem.coreReasons[0]} is one of the reasons this matters tonight.`);
  if (mem.futureSelf) n.push(`Ninety-day you is building this: ${mem.futureSelf}`);
  n.push(`Tonight might be quieter if you decide before 8:30, not at 9:45.`);
  n.push(`You don't need to win the whole night. Just the next 10 minutes, when it comes.`);
  return n[dayOfYear() % n.length];
}

/* ── analytics ── */
function cleanUserText(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bi\b/g, "I")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bive\b/gi, "I've")
    .replace(/\bid\b/gi, "I'd")
    .replace(/\bill\b/gi, "I'll")
    .replace(/\bthats\b/gi, "that's")
    .replace(/\bwhats\b/gi, "what's")
    .replace(/\bitll\b/gi, "it'll")
    .replace(/\bdoesnt\b/gi, "doesn't")
    .replace(/\bisnt\b/gi, "isn't")
    .replace(/\bwasnt\b/gi, "wasn't")
    .replace(/\bwerent\b/gi, "weren't");
}

function buildReplacement(settings) {
  const project = (settings.project || "").trim();
  const skill = (settings.skills || [])[0];
  if (project) return `Work 10 minutes on ${project}`;
  if (skill) return `Practice ${skill} for 10 minutes`;
  if (settings.build) return `Do one thing for ${areaObject(settings.build)}`;
  return null;
}

const REALITY_LENSES = {
  pattern: "PATTERN lens: Name the recurring shape of this moment — when it shows up, what precedes it. Not what they feel; the pattern itself. E.g. 'This keeps showing up after the day goes quiet, not when it's loud.'",
  emotion: "EMOTION lens: Name the actual feeling underneath the urge — the one the behavior is trying to manage. Be precise, not generic. E.g. 'This isn't wanting. It's the day not having a clean ending.'",
  environment: "ENVIRONMENT lens: Point out that nothing changed inside them — the situation around them did. E.g. 'Nothing happened in you. The house got quiet. That's a different thing.'",
  self_deception: "SELF-DECEPTION lens: Name the small lie the urge tells in this moment — gently, without accusing. E.g. 'The story right now is that one won't matter. That's the story every time.'",
  consequence: "FUTURE-CONSEQUENCE lens: Connect this ten minutes to the specific morning that follows — concrete, not preachy. E.g. 'The version of you that wakes up at 6 is the one paying for this, not the one deciding it.'",
  evidence: "EVIDENCE lens: Use their own history as proof the feeling passes. Only if there's real data. E.g. 'The last times you waited this out, it dropped. Your own record says so.'",
  identity: "IDENTITY lens: Frame it as a small vote for who they're becoming — without grand language. E.g. 'This is a small rep in becoming someone who doesn't auto-pilot at night.'",
};
const LENS_KEYS = Object.keys(REALITY_LENSES);
function buildRealityPrompt({ settings, memory, urges, mornings, days, feedback, d, yref }) {
  const recentLines = [
    ...(feedback || []).map((f) => f.line),
    ...(urges || []).map((u) => u.realityLine),
  ].filter(Boolean).slice(0, 5);
  // Pick ONE lens. Avoid evidence lens until there's real history to cite.
  const usable = LENS_KEYS.filter((k) => k !== "evidence" || urges.length >= 4);
  const lensKey = usable[Math.floor(Math.random() * usable.length)];
  const lensInstruction = REALITY_LENSES[lensKey];
  // Moves that have worked for them before (chose a replacement and the urge dropped) — surface for relevance.
  const workedMoves = [...new Set((urges || [])
    .filter((u) => u.replacement && u.dropped && u.dropped !== "It got stronger")
    .map((u) => u.replacement))].slice(0, 4);
  // Memory minus the long-term goal fields — those are supporting context only, not the focus.
  const m = { ...memory };
  delete m.project; delete m.build; delete m.skills; delete m.futureSelf; delete m.coreReasons;
  return `
You are Clear Morning.
Talk like a perceptive friend with backbone. Direct. Human. No therapy voice. No fake motivation. No coaching clichés ("you got this", "stay strong", "remember your why").
Never say: sober, recovery, addiction, quit, relapse, journey, healing.

THE MOMENT (this is what matters most):
About to: ${d.behavior}
Reaching for: ${d.trigger}
What happened right before: ${d.context}
What they usually want from it: ${settings.seeking || memory.seeking || "unknown"}
${settings.reminder ? `Their own words to remember: "${settings.reminder}"` : ""}

Their patterns: ${JSON.stringify(m)}
Recent entries: ${summarize(urges)}
${yref ? `Yesterday: ${yref}` : ""}
${(feedback || []).filter((f) => f.verdict === "miss" && f.note).slice(0, 4).map((f) => `IMPORTANT — a past read missed; they said what was really going on: "${f.note}". Learn from this.`).join("\n")}
${recentLines.length ? `Things you've ALREADY said on past nights (do NOT repeat these — fresh angle, fresh words):\n- ${recentLines.join("\n- ")}` : ""}
${workedMoves.length ? `Moves that have worked for them before: ${workedMoves.join(", ")}.` : ""}

USE EXACTLY ONE LENS for this reality check. Do not blend lenses. Do not list multiple observations. Commit fully to this single angle:
${lensInstruction}

Stay with what's happening right now, tonight. Understand the moment — don't recite what you remember about them. Use at most ONE personal reference total. Do not mention their project, business, or skill unless directly relevant to this exact moment, and almost never.
Write under 70 words. One tight paragraph, or two very short ones. No preamble. No motivational quotes. Do not sound poetic. It should feel like one sharp, true observation from someone who sees what's going on — then stop.
`.trim();
}

function areaObject(a) {
  const m = {
    "Better health": "your health",
    "Better marriage": "your marriage",
    "Better finances": "your finances",
    "Better mental health": "your own head",
    "Better relationship with my kids": "your relationship with your kids",
    "A business": "the business you're building",
    "A career": "your career",
    "A skill": "the skill you're building",
    "Something else": "what you're building",
  };
  return m[a] || "what you're building";
}

function foldRates(urges, mornings, key = "context") {
  // Join each fold-reporting morning to the most recent urge in the ~24h before that morning.
  const tally = {};
  mornings.forEach((m) => {
    if (typeof m.folded !== "boolean") return;
    const morningTs = new Date(m.date + "T08:00").getTime();
    let best = null;
    urges.forEach((u) => {
      if (!u.ts) return;
      if (u.ts < morningTs && u.ts > morningTs - 28 * 3600 * 1000) {
        if (!best || u.ts > best.ts) best = u;
      }
    });
    const label = best && best[key];
    if (!label) return;
    tally[label] = tally[label] || { fold: 0, total: 0 };
    tally[label].total++;
    if (m.folded) tally[label].fold++;
  });
  return Object.entries(tally)
    .filter(([, v]) => v.total >= 5)
    .map(([label, v]) => ({ label, pct: Math.round((v.fold / v.total) * 100), n: v.total }))
    .sort((a, b) => b.pct - a.pct);
}

function nextDateKey(date) {
  const d = new Date(date + "T12:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function recentWins(urges, mornings) {
  return urges
    .filter((u) => u.replacement)
    .slice(0, 5)
    .map((u) => {
      const nextMorning = mornings.find((m) => m.date === nextDateKey(u.date));
      return {
        date: u.date,
        ts: u.ts,
        behavior: u.behavior || "the thing",
        replacement: u.replacement,
        dropped: u.dropped,
        morning: nextMorning?.feel || null,
      };
    });
}

function winWhen(ts, date) {
  const d = ts ? new Date(ts) : new Date(date + "T20:00");
  const day = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = ts ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
  return time ? `${day}, ${time}` : day;
}

function holdGuidance(left, replacement) {
  if (left > 540) {
    return {
      title: "Do not debate it yet.",
      body: "Your only job is to move first. The craving can talk after your body changes state."
    };
  }
  if (left > 420) {
    return {
      title: "This is a wave, not a command.",
      body: "It feels urgent because your brain wants relief now. Urgent does not mean true."
    };
  }
  if (left > 300) {
    return {
      title: "Stay out of the old room.",
      body: replacement
        ? `${replacement} is not a distraction. It is proof that you can choose a different loop.`
        : "The move matters less than breaking the automatic loop."
    };
  }
  if (left > 180) {
    return {
      title: "This is where the urge starts bargaining.",
      body: "It may tell you one time does not matter. That is the exact moment that does matter."
    };
  }
  if (left > 60) {
    return {
      title: "You are already doing it.",
      body: "Not by forcing confidence. By staying present long enough for the feeling to lose volume."
    };
  }
  if (left > 0) {
    return {
      title: "Finish clean.",
      body: "You did not just avoid something. You kept tomorrow from paying for tonight."
    };
  }
  return {
    title: "That was the rep.",
    body: "The urge showed up, you waited, and you proved it can pass without obeying it."
  };
}

function peakHour(urges) {
  if (urges.length < 3) return null;
  const b = {}; urges.forEach((u) => { const h = new Date(u.ts).getHours(); const k = Math.floor(h / 2) * 2; b[k] = (b[k] || 0) + 1; });
  const top = Object.entries(b).sort((a, c) => c[1] - a[1])[0];
  return top ? +top[0] : null;
}
function peakWindow(urges) {
  if (urges.length < 3) return null;
  const b = {}; urges.forEach((u) => { const h = new Date(u.ts).getHours(); const k = Math.floor(h / 2) * 2; b[k] = (b[k] || 0) + 1; });
  const top = Object.entries(b).sort((a, c) => c[1] - a[1])[0]; if (!top) return null;
  const h = +top[0]; const fmt = (x) => { const ap = x >= 12 ? "pm" : "am"; const hr = x % 12 === 0 ? 12 : x % 12; return `${hr}${ap}`; };
  return `between ${fmt(h)} and ${fmt(h + 2)}`;
}
const mode = (a) => { if (!a.length) return null; const c = {}; a.forEach((x) => c[x] = (c[x] || 0) + 1); return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]; };
function bestReplacement(urges, mornings) {
  const by = {}; mornings.forEach((m) => by[m.date] = m.feel); const s = {};
  urges.forEach((u) => { if (!u.replacement) return; const f = by[u.date]; const win = f === "Clear" || f === "Amazing"; s[u.replacement] = s[u.replacement] || { w: 0, n: 0 }; s[u.replacement].n++; if (win) s[u.replacement].w++; });
  const r = Object.entries(s).sort((a, c) => (c[1].w / c[1].n) - (a[1].w / a[1].n));
  return r.length ? r[0][0] : mode(urges.map((u) => u.replacement).filter(Boolean));
}
function summarize(urges) {
  const t = {}, h = {}, r = {}, b = {}, dd = {}, cx = {};
  urges.forEach((u) => { if (u.trigger) t[u.trigger] = (t[u.trigger] || 0) + 1; if (u.behavior) b[u.behavior] = (b[u.behavior] || 0) + 1; if (u.context) cx[u.context] = (cx[u.context] || 0) + 1; const hr = new Date(u.ts).getHours(); h[hr] = (h[hr] || 0) + 1; if (u.replacement) r[u.replacement] = (r[u.replacement] || 0) + 1; if (u.dropped) dd[u.dropped] = (dd[u.dropped] || 0) + 1; });
  return `${urges.length} urges. Behaviors:${JSON.stringify(b)} Triggers:${JSON.stringify(t)} Before:${JSON.stringify(cx)} Hours:${JSON.stringify(h)} Replacements:${JSON.stringify(r)} PullDropped:${JSON.stringify(dd)}`;
}

function movementLine(behavior, context) {
  if (context === "Work") return "Stand up. Put one hand on the counter. Take one slow breath.";
  if (context === "Argument") return "Leave the room for ten seconds. Let your body exit the argument first.";
  if (context === "Kids/family") return "Step away. Drop your shoulders. Stop carrying everyone for ten seconds.";
  if (context === "Scrolling") return "Lock the phone. Stand up. Change rooms before your brain asks again.";
  if (context === "Bored at home") return "Stand up and change rooms. Boredom loses power when your body moves.";
  if (context === "After dinner") return "Clear one thing from the table. Break the automatic hand-to-mouth loop.";
  if (context === "Late night alone") return "Turn on one light. Sit somewhere different. Do not stay in the same chair.";
  if (context === "Celebrating") return "Pause before you add more. Let the win stay clean for ten seconds.";
  return "Stand up. Change rooms. Give your brain a new scene.";
}

/* ── styles ── */
const wrap = { maxWidth: 440, width: "100%", margin: "0 auto", height: "100dvh", minHeight: 600, background: "linear-gradient(175deg,#1a130d,#0c0805 65%,#080503)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", overflowX: "hidden", overscrollBehavior: "none", fontFamily: "'Jost',sans-serif" };
const wrapMorning = { maxWidth: 440, margin: "0 auto", background: "linear-gradient(175deg,#f3e3cd,#e9cfa9 70%,#dcb886)", position: "relative" };
const grain = { position: "absolute", inset: 0, zIndex: 1, opacity: 0.04, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" };
const css = `html,body{margin:0;padding:0;width:100%;max-width:100%;overflow-x:hidden;overscroll-behavior:none}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}.fade{animation:fu .6s cubic-bezier(.2,.7,.2,1) both}@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes pulseDot{0%,80%,100%{transform:scale(0.6);opacity:0.35}40%{transform:scale(1);opacity:1}}input,textarea{outline:none}input:focus,textarea:focus{border-color:#9a7b4f!important}input::placeholder,textarea::placeholder{color:#6f6253;opacity:1}h1,h2,p{overflow-wrap:break-word;word-break:break-word}button{cursor:pointer;font-family:'Jost',sans-serif}`;
const pad = { padding: "52px 26px 26px" };
const stepWrap = { flex: 1, display: "flex", flexDirection: "column" };
const kicker = { textTransform: "uppercase", letterSpacing: 3, fontSize: 11, color: "#6f6253", margin: "0 0 10px" };
const h1 = { fontFamily: "'Fraunces',serif", fontWeight: 400, fontSize: 33, lineHeight: 1.14, color: "#e8ddcc", margin: 0, letterSpacing: -0.4 };
const h2 = { fontFamily: "'Fraunces',serif", fontWeight: 400, fontSize: 28, color: "#e8ddcc", margin: 0, letterSpacing: -0.3 };
const sub = { color: "#7a6b58", fontSize: 14, lineHeight: 1.5, margin: "12px 0 0" };
const foldBtn = { width: "100%", marginTop: 24, padding: "28px", borderRadius: 18, border: "1px solid #6b5536", background: "radial-gradient(circle at 50% 0%,rgba(154,123,79,0.24),rgba(154,123,79,0.05))", color: "#e8ddcc", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 0 50px rgba(154,123,79,0.16)" };
const voiceBar = { width: "100%", padding: "13px", marginBottom: 18, borderRadius: 12, border: "1px solid #6b5536", background: "rgba(154,123,79,0.1)", color: "#d8c8ad", fontSize: 14.5, fontWeight: 500 };
const primary = { width: "100%", padding: "17px", borderRadius: 14, border: "none", background: "linear-gradient(180deg,#b59266,#9a7b4f)", color: "#140e08", fontSize: 16, fontWeight: 500 };
const secondary = { width: "100%", padding: "17px", borderRadius: 14, border: "1px solid #3a2f22", background: "transparent", color: "#c8b79a", fontSize: 16 };
const choiceBase = { width: "100%", padding: "16px 18px", marginBottom: 10, borderRadius: 12, textAlign: "left", fontSize: 15, transition: "all .15s" };
const miniRow = { display: "flex", gap: 12, margin: "14px 0 0" };
const mini = { flex: 1, background: "rgba(154,123,79,0.06)", border: "1px solid rgba(154,123,79,0.15)", borderRadius: 14, padding: "16px" };
const miniNum = { fontFamily: "'Fraunces',serif", fontSize: 32, color: "#9a7b4f", lineHeight: 1 };
const miniLbl = { color: "#7a6b58", fontSize: 12, marginTop: 6, lineHeight: 1.3 };
const brandCard = { marginTop: 22, padding: "18px 20px", border: "1px solid rgba(154,123,79,0.15)", borderRadius: 14, background: "rgba(0,0,0,0.2)" };
const aiCard = { padding: "18px 20px", marginBottom: 12, borderRadius: 14, border: "1px solid rgba(154,123,79,0.18)", background: "rgba(154,123,79,0.05)" };
const nav = {
  position: "fixed",
  bottom: 0,
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 440,
  zIndex: 50,
  display: "flex",
  borderTop: "1px solid #2a2018",
  background: "rgba(8,5,3,0.97)",
  backdropFilter: "blur(12px)",
  paddingBottom: "env(safe-area-inset-bottom)"
};
const navBtn = (a) => ({ flex: 1, margin: "8px 6px", padding: "11px 0 12px", background: a ? "rgba(154,123,79,0.16)" : "none", borderRadius: 12, border: "none", color: a ? "#e8ddcc" : "#7a6b58", fontSize: 13.5, fontWeight: a ? 600 : 400, letterSpacing: 1.2, textTransform: "uppercase" });
const close = { position: "absolute", top: 18, right: 22, background: "none", border: "none", color: "#5a4d3d", fontSize: 20, zIndex: 5 };
const lbl = { display: "block", color: "#8a7b66", fontSize: 13, marginBottom: 9, marginTop: 18 };
const input = { width: "100%", padding: 14, borderRadius: 12, border: "1px solid #5a4a36", background: "rgba(154,123,79,0.07)", color: "#e8ddcc", fontSize: 15, fontFamily: "'Jost',sans-serif", marginBottom: 8, appearance: "none" };
const textArea = { width: "100%", minHeight: 110, marginTop: 20, padding: 16, borderRadius: 12, border: "1px solid #5a4a36", background: "rgba(154,123,79,0.07)", color: "#e8ddcc", fontSize: 15, fontFamily: "'Jost',sans-serif", resize: "none", lineHeight: 1.5 };
const toggleRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, padding: "16px 0", borderTop: "1px solid #2a2018", cursor: "pointer" };
const tog = (on) => ({ width: 48, height: 28, borderRadius: 20, background: on ? "#9a7b4f" : "#2a2018", position: "relative", flexShrink: 0, transition: "background .2s" });
const dot = (on) => ({ position: "absolute", top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#e8ddcc", transition: "left .2s" });
const chip = { fontSize: 13, color: "#c8b79a", border: "1px solid #3a2f22", borderRadius: 20, padding: "6px 12px", cursor: "pointer" };
const thinkingDot = { width: 7, height: 7, borderRadius: "50%", background: "#c8b79a", display: "inline-block", animation: "pulseDot 1.2s infinite ease-in-out" };
