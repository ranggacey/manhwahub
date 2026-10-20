// Same-origin proxy to AniList GraphQL — fallback when the visitor's network
// can't reach graphql.anilist.co directly (e.g. Cloudflare blocking their IP range).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "upstream fetch failed" });
  }
}
