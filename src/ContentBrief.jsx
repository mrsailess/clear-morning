"use client";
import { useState, useRef } from "react";

const BRANDS = {
  no86: {
    label: "No. 86",
    color: "#C8972A",
    rewritePrompt: `Rewrite this content for No. 86, a non-alcoholic whiskey for men 30–45.

Voice: Sounds like a private confession to a friend at 10pm. Never a brand talking.
Core message: "Keep the ritual. Lose the fog."
Never use: "Here's the truth" / "The hard truth" / "What if" / "You deserve" / "Real men"
End caption with: "That's why we made No. 86."
90% relatability. 10% insight.

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  },
  clearmorning: {
    label: "Clear Morning",
    color: "#4A9EBF",
    rewritePrompt: `Rewrite this content for Clear Morning, a free app for adults 30–45 (50% men, 50% women) who lose the 8–11pm window to bad habits.

Voice: Private thought someone has but never says out loud. A confession, not content.
Never use: "Here's the truth" / "The hard truth" / "What if" / "You deserve better"
Mention the app once softly — "free" and "60 seconds." CTA drives to clear-morning-one.vercel.app.
90% relatability. 10% insight.

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  },
  personal: {
    label: "@mr.sailes",
    color: "#8B5CF6",
    rewritePrompt: `Rewrite this content for Sean's personal brand @mr.sailes — Navy veteran, father, husband, entrepreneur, Jiu-Jitsu practitioner.

Voice: Raw. Honest. Sounds like someone who learned it the hard way telling one person — not performing.
Never use: "Here's the truth" / "The hard truth" / "What if" / "Real talk" / "Most men"
Leave space. Don't wrap it up. End: "If you can relate, maybe this account can help."
90% relatability. 10% insight.

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"..."}`
  }
};

const ANALYZE_SYSTEM = `You analyze content — images, screenshots, or text posts — and extract what makes them work emotionally.

Then you generate one piece of original content built around what you found.

Never copy wording. Extract the emotional pattern and write something new from it.

Always start from a specific human moment or scene. Never abstract concepts.

The reader should think "damn, that's me" — not "that's good advice."

Never use: "Here's the truth" / "The hard truth" / "That's the thing" / "What if" / "Presence matters"

90% relatability. 10% insight. Leave space — don't finish the thought for them.

Hook: One sentence. Starts with "Imagine." Names a specific moment or feeling. Max 35 words.
Caption: 80–120 words. Stays inside the moment. No lesson. One quiet observation.
CTA: Soft. Max 12 words.

Return ONLY valid JSON: {"hook":"...","caption":"...","cta":"...","insight":"one sentence on why this works emotionally"}`;

export default function ContentBrief() {
  const [mode, setMode] = useState("upload");
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [rewriting, setRewriting] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
    setInput("");
    setBrief(null);
    setError(null);
  };

  const analyze = async () => {
    if (!input.trim() && !imageBase64) return;
    setLoading(true);
    setBrief(null);
    setError(null);
    setInsight(null);

    try {
      let messages;
      if (imageBase64) {
        messages = [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: imageMime, data: imageBase64 } },
            { type: "text", text: "Analyze this image. Extract the emotional moment, scene, and tension. Then generate original content built around what you found." }
          ]
        }];
      } else {
        messages = [{
          role: "user",
          content: `Analyze this content. Extract what makes it work emotionally — the scene, the feeling, the tension. Then generate original content built around that emotional pattern. Do not copy wording.\n\n---\n${input}`
        }];
      }

      const response = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, system: ANALYZE_SYSTEM })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setBrief(data);
      if (data.insight) setInsight(data.insight);
    } catch (err) {
      setError("Failed to analyze. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const rewrite = async (brandKey) => {
    if (!brief) return;
    setRewriting(brandKey);

    const currentContent = `HOOK: ${brief.hook}\n\nCAPTION: ${brief.caption}\n\nCTA: ${brief.cta}`;

    try {
      const response = await fetch("/api/content-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Rewrite this content for the brand. Keep the same emotional moment and scene. Change the voice and angle to fit the brand.\n\n${currentContent}`
          }],
          system: BRANDS[brandKey].rewritePrompt
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.error) throw new Error();
      setBrief(data);
    } catch {
      setError("Rewrite failed. Try again.");
    } finally {
      setRewriting(null);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    copy(`HOOK:\n${brief.hook}\n\nCAPTION:\n${brief.caption}\n\nCTA:\n${brief.cta}`, "all");
  };

  const reset = () => {
    setInput(""); setImage(null); setImageBase64(null); setImageMime(null);
    setBrief(null); setInsight(null); setError(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#E8E0D4", fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0D0D0D" }}>
        <div>
          <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#555", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "3px" }}>Content Engine</div>
          <div style={{ fontSize: "18px", fontWeight: "700" }}>Daily Brief</div>
        </div>
        {(brief || image || input) && (
          <button onClick={reset} style={{ background: "transparent", border: "1px solid #222", color: "#666", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>RESET</button>
        )}
      </div>

      <div style={{ maxWidth: "540px", margin: "0 auto", padding: "32px 20px" }}>

        {/* Upload zone */}
        {!brief && (
          <>
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: `1px dashed ${dragOver ? "#555" : "#2A2A2A"}`,
                borderRadius: "12px",
                padding: "32px 20px",
                textAlign: "center",
                cursor: "pointer",
                marginBottom: "16px",
                background: dragOver ? "#111" : "transparent",
                transition: "all 0.2s"
              }}>
              {image ? (
                <img src={image} alt="uploaded" style={{ maxWidth: "100%", maxHeight: "220px", borderRadius: "8px", objectFit: "cover" }} />
              ) : (
                <>
                  <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.3 }}>↑</div>
                  <div style={{ fontSize: "14px", color: "#555", marginBottom: "6px" }}>Drop image or screenshot</div>
                  <div style={{ fontSize: "12px", color: "#333" }}>TikTok, photo, anything visual</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />

            <div style={{ textAlign: "center", fontSize: "12px", color: "#333", margin: "12px 0" }}>or</div>

            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setImage(null); setImageBase64(null); }}
              placeholder="Paste a post, caption, or describe a moment..."
              style={{
                width: "100%", minHeight: "100px", background: "#0D0D0D",
                border: "1px solid #222", borderRadius: "10px", padding: "14px",
                color: "#E8E0D4", fontSize: "14px", fontFamily: "'Georgia', serif",
                resize: "vertical", boxSizing: "border-box", outline: "none",
                lineHeight: "1.6"
              }}
            />

            {(input.trim() || imageBase64) && !loading && (
              <button onClick={analyze} style={{
                width: "100%", marginTop: "14px", background: "#E8E0D4",
                border: "none", borderRadius: "10px", padding: "16px",
                cursor: "pointer", fontSize: "14px", fontWeight: "700",
                color: "#080808", letterSpacing: "1.5px", textTransform: "uppercase",
                fontFamily: "monospace"
              }}>Analyze + Generate</button>
            )}

            {loading && (
              <div style={{ marginTop: "24px", textAlign: "center", color: "#444", fontSize: "12px", fontFamily: "monospace", letterSpacing: "1px" }}>
                <div style={{ width: "24px", height: "24px", border: "1.5px solid #222", borderTop: "1.5px solid #888", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
                READING THE MOMENT...
              </div>
            )}

            {error && (
              <div style={{ marginTop: "14px", padding: "12px", background: "#1A0A0A", border: "1px solid #3A1A1A", borderRadius: "8px", color: "#CC4444", fontSize: "13px", fontFamily: "monospace" }}>{error}</div>
            )}
          </>
        )}

        {/* Output */}
        {brief && (
          <div>
            {/* Insight pill */}
            {insight && (
              <div style={{ marginBottom: "20px", padding: "12px 16px", background: "#111", border: "1px solid #1E1E1E", borderRadius: "8px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", fontFamily: "monospace", marginBottom: "6px" }}>WHY THIS WORKS</div>
                <div style={{ fontSize: "13px", color: "#888", fontStyle: "italic", lineHeight: "1.6" }}>{insight}</div>
              </div>
            )}

            {/* Content cards */}
            <div style={{ background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: "14px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #1A1A1A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", fontFamily: "monospace" }}>Generated Content</div>
                <button onClick={copyAll} style={{ background: copied === "all" ? "#E8E0D4" : "transparent", border: "1px solid #222", color: copied === "all" ? "#080808" : "#555", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                  {copied === "all" ? "COPIED" : "COPY ALL"}
                </button>
              </div>

              {[
                { key: "hook", label: "🎬 Hook", field: brief.hook, style: { fontSize: "16px", fontStyle: "italic", lineHeight: "1.6" } },
                { key: "caption", label: "📝 Caption", field: brief.caption, style: { fontSize: "14px", lineHeight: "1.9", color: "#C8C0B4", whiteSpace: "pre-wrap" } },
                { key: "cta", label: "👉 CTA", field: brief.cta, style: { fontSize: "14px", fontWeight: "600", color: "#E8E0D4" } }
              ].map(({ key, label, field, style }, i, arr) => (
                <div key={key} style={{ padding: "18px", borderBottom: i < arr.length - 1 ? "1px solid #1A1A1A" : "none" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#333", marginBottom: "8px", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
                  <div style={{ marginBottom: "10px", ...style }}>{field}</div>
                  <button onClick={() => copy(field, key)} style={{ background: "transparent", border: "1px solid #1E1E1E", color: copied === key ? "#E8E0D4" : "#444", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "10px", fontFamily: "monospace" }}>
                    {copied === key ? "✓ COPIED" : "COPY"}
                  </button>
                </div>
              ))}
            </div>

            {/* Brand rewrite buttons */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#333", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "10px" }}>Rewrite for brand</div>
              <div style={{ display: "flex", gap: "8px" }}>
                {Object.entries(BRANDS).map(([key, brand]) => (
                  <button key={key}
                    onClick={() => rewrite(key)}
                    disabled={!!rewriting}
                    style={{
                      flex: 1, padding: "10px 8px",
                      background: rewriting === key ? brand.color + "22" : "transparent",
                      border: `1px solid ${rewriting === key ? brand.color : "#222"}`,
                      borderRadius: "8px", cursor: rewriting ? "default" : "pointer",
                      color: rewriting === key ? brand.color : "#666",
                      fontSize: "12px", fontWeight: "600", fontFamily: "monospace",
                      transition: "all 0.2s", opacity: rewriting && rewriting !== key ? 0.4 : 1
                    }}>
                    {rewriting === key ? "..." : brand.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Re-analyze */}
            <button onClick={reset} style={{ width: "100%", marginTop: "16px", background: "transparent", border: "1px solid #1A1A1A", color: "#444", padding: "12px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", letterSpacing: "1px" }}>
              ↑ NEW UPLOAD
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover:not(:disabled) { opacity: 0.8; }
        textarea::placeholder { color: #2A2A2A; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
