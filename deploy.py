#!/usr/bin/env python3
"""Deploy ManhwaHub (static index.html) to Vercel via API."""
import hashlib, json, os, sys, time, urllib.request

TOKEN = open(os.path.expanduser("~/.config/vercel/token")).read().strip()
TEAM = "team_Xi1A2RIIkkeuj2PdmiJSjIaJ"
PROJECT = "manhwahub"
ROOT = os.path.dirname(os.path.abspath(__file__))

def req(method, url, data=None, headers=None, raw=False):
    h = {"Authorization": f"Bearer {TOKEN}"}
    if headers: h.update(headers)
    body = None
    if data is not None:
        body = data if raw else json.dumps(data).encode()
        if not raw: h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:400]); sys.exit(1)

files_meta = []
for fname in ["index.html", "api/anilist.js", "api/translate.js", "favicon.svg", "favicon.png", "apple-touch-icon.png"]:
    blob = open(os.path.join(ROOT, fname), "rb").read()
    sha = hashlib.sha1(blob).hexdigest()
    req("POST", f"https://api.vercel.com/v2/files?teamId={TEAM}", data=blob, raw=True,
        headers={"x-vercel-digest": sha, "Content-Type": "application/octet-stream"})
    files_meta.append({"file": fname, "sha": sha, "size": len(blob)})
    print("uploaded", fname, len(blob), "bytes")

dep = req("POST", f"https://api.vercel.com/v13/deployments?teamId={TEAM}&skipAutoDetectionConfirmation=1", data={
    "name": PROJECT, "target": "production",
    "files": files_meta,
})
did = dep["id"]
print("deployment:", did)
for _ in range(40):
    time.sleep(6)
    st = req("GET", f"https://api.vercel.com/v13/deployments/{did}?teamId={TEAM}")
    state = st.get("readyState")
    print(" state:", state)
    if state == "READY":
        # disable deployment protection
        pid = st.get("projectId")
        if pid:
            req("PATCH", f"https://api.vercel.com/v9/projects/{pid}?teamId={TEAM}", data={"ssoProtection": None})
            print("protection disabled")
        print("URL: https://" + st.get("url", ""))
        break
    if state == "ERROR":
        print("BUILD ERROR"); sys.exit(1)
