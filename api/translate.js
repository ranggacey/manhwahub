// Terjemahan otomatis sinopsis EN -> ID (Google Translate via server, biar bebas CORS).
// Body: { q: "english text" } -> { translated: "teks indonesia" }
async function translateChunk(text) {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=" + encodeURIComponent(text);
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("translate upstream " + r.status);
  const j = await r.json();
  return (j[0] || []).map((seg) => seg[0]).join("");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const q = (req.body || {}).q;
  // mode batch: q = ["judul 1", "judul 2", ...] -> { translated: [...] }
  if (Array.isArray(q)) {
    try {
      const items = q.slice(0, 40).map((s) => String(s == null ? "" : s).slice(0, 300));
      const translated = await Promise.all(items.map((t) => (t.trim() ? translateChunk(t).catch(() => t) : t)));
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.status(200).json({ translated });
    } catch (e) {
      res.status(502).json({ error: "translate failed" });
    }
    return;
  }
  const text = (q || "").toString().slice(0, 4500);
  if (!text.trim()) {
    res.status(400).json({ error: "empty" });
    return;
  }
  try {
    // potong per ~1200 char di batas kalimat biar endpoint Google nyaman
    const chunks = [];
    let rest = text;
    while (rest.length > 1200) {
      let cut = rest.lastIndexOf(". ", 1200);
      if (cut < 400) cut = 1200;
      chunks.push(rest.slice(0, cut + 1));
      rest = rest.slice(cut + 1);
    }
    chunks.push(rest);
    const out = [];
    for (const c of chunks) out.push(await translateChunk(c));
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.status(200).json({ translated: out.join(" ") });
  } catch (e) {
    res.status(502).json({ error: "translate failed" });
  }
}
