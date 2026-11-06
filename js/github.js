(function (root) {
  const C = () => root.APP_CONFIG;
  const API = "https://api.github.com";
  const store = () => root.localStorage;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const delay = () => (C().retryMs ?? 800);
  async function why(res) { try { return (await res.json()).message || ""; } catch (_) { return ""; } }

  function repo() {
    let { owner, repo, branch } = C();
    if (!owner && root.location) owner = root.location.hostname.split(".")[0];
    if (!repo && root.location) repo = root.location.pathname.split("/")[1];
    return { owner, repo, branch: branch || "main" };
  }
  const token = () => store().getItem("rh_token") || "";
  const setToken = (t) => (t ? store().setItem("rh_token", t) : store().removeItem("rh_token"));
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
  const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));

  function headers(auth) {
    const h = { Accept: "application/vnd.github+json" };
    if (auth && token()) h.Authorization = "Bearer " + token();
    return h;
  }
  const url = (path) => { const r = repo(); return `${API}/repos/${r.owner}/${r.repo}/contents/${path}`; };
  const imageUrl = (path) => { const r = repo(); return `https://raw.githubusercontent.com/${r.owner}/${r.repo}/${r.branch}/${path}`; };

  async function getFile(path, auth) {
    const r = repo();
    const res = await fetch(`${url(path)}?ref=${r.branch}&t=${Date.now()}`, { headers: headers(auth), cache: "no-store" });
    if (res.status === 404) return { data: { vehicles: [] }, sha: null };
    if (!res.ok) throw new Error("GitHub error " + res.status);
    const j = await res.json();
    return { data: JSON.parse(unb64(j.content)), sha: j.sha };
  }

  // Public pages read without a token; the admin page passes auth=true (no rate limit).
  async function readVehicles(auth) {
    try { return (await getFile(C().dataPath, !!auth)).data.vehicles || []; }
    catch (e) {
      const res = await fetch(C().dataPath + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw e;
      return (await res.json()).vehicles || [];
    }
  }

  async function put(path, body) {
    const r = repo();
    return fetch(url(path), {
      method: "PUT", headers: { ...headers(true), "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, branch: r.branch })
    });
  }

  // Read-modify-write with automatic retry if someone else saved first.
  async function saveVehicles(mutate, message) {
    let last = 0, msg = "";
    for (let i = 0; i < 5; i++) {
      if (i) await wait(delay() * i);
      const { data, sha } = await getFile(C().dataPath, true);
      const next = { vehicles: mutate(data.vehicles || []) };
      const res = await put(C().dataPath, { message, content: b64(JSON.stringify(next, null, 2)), ...(sha ? { sha } : {}) });
      if (res.ok) return next.vehicles;
      last = res.status; msg = await why(res);
      if (res.status !== 409 && res.status !== 422) break;
    }
    throw new Error(`Save failed (${last}${msg ? ": " + msg : ""}). Check your token permissions.`);
  }

  // GitHub can answer 409 when commits arrive back-to-back, so retry with a short pause.
  async function uploadImage(path, base64) {
    if (!base64) throw new Error("Photo data was empty, nothing was uploaded.");
    let last = 0, msg = "";
    for (let i = 0; i < 5; i++) {
      if (i) await wait(delay() * i);
      let res;
      try { res = await put(path, { message: "Add photo " + path, content: base64 }); }
      catch (_) { last = 0; msg = "network error"; continue; }
      if (res.ok) return;
      last = res.status; msg = await why(res);
      if (res.status === 422 && /sha/i.test(msg)) return; // file already exists
      if (![409, 422, 500, 502, 503].includes(res.status)) break;
    }
    throw new Error(`Photo upload failed (${last}${msg ? ": " + msg : ""})`);
  }
  async function deleteImage(path) {
    try {
      const res = await fetch(`${url(path)}?ref=${repo().branch}`, { headers: headers(true) });
      if (!res.ok) return;
      const { sha } = await res.json();
      await fetch(url(path), { method: "DELETE", headers: { ...headers(true), "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Remove photo", sha, branch: repo().branch }) });
    } catch (_) {}
  }
  async function verifyToken() {
    const r = repo();
    const res = await fetch(`${API}/repos/${r.owner}/${r.repo}`, { headers: headers(true) });
    if (!res.ok) throw new Error("Token or repository not valid (" + res.status + ")");
    const j = await res.json();
    if (j.permissions && !j.permissions.push) throw new Error("This token cannot write to the repository.");
    return true;
  }

  const api = { repo, token, setToken, imageUrl, readVehicles, saveVehicles, uploadImage, deleteImage, verifyToken };
  root.GH = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
