(function (root) {
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (root.APP_CONFIG.currency || "") + " " + Number(n || 0).toLocaleString("en-IN");
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "car";
  function filterSort(list, q, sort) {
    q = (q || "").toLowerCase().trim();
    const out = list.filter((v) => !q || [v.name, v.number, v.model, v.color].join(" ").toLowerCase().includes(q));
    const by = { new: (a, b) => b.createdAt - a.createdAt, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price };
    return out.sort(by[sort] || by.new);
  }
  // Resize + compress a photo in the browser so the repo stays small.
  // Phones hand the page a temporary link to the photo that can stop working a few seconds later,
  // so FIRST copy the photo into memory (snap), then do everything from that copy.
  const readBuf = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = () => rej(r.error || new Error("read failed"));
    r.readAsArrayBuffer(file);
  });
  const readB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = () => rej(new Error("Could not read " + (file.name || "photo")));
    r.readAsDataURL(file);
  });
  async function snap(file) {
    const type = file.type || "image/jpeg";
    try { if (file.arrayBuffer) return new Blob([await file.arrayBuffer()], { type }); } catch (_) {}
    try { return new Blob([await readBuf(file)], { type }); } catch (_) {}
    throw new Error("Could not read " + (file.name || "the photo") + ". Save it to your phone storage (or pick it from Files or Downloads instead of a cloud or Google Photos view) and try again.");
  }
  const loadImg = (src) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
  async function decode(blob) {
    if (root.createImageBitmap) {
      try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch (_) {}
      try { return await createImageBitmap(blob); } catch (_) {}
    }
    const u = URL.createObjectURL(blob);
    try { return await loadImg(u); } catch (_) {} finally { URL.revokeObjectURL(u); }
    return loadImg("data:" + (blob.type || "image/jpeg") + ";base64," + await readB64(blob));
  }
  async function compress(file, max = 1200, quality = 0.8) {
    const blob = await snap(file);
    try {
      const img = await decode(blob);
      const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
      if (!w0 || !h0) throw new Error("empty image");
      const k = Math.min(1, max / Math.max(w0, h0));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); // transparent PNGs would turn black otherwise
      ctx.drawImage(img, 0, 0, c.width, c.height);
      if (img.close) img.close();
      const out = c.toDataURL("image/jpeg", quality).split(",")[1] || "";
      if (out.length < 500) throw new Error("canvas returned nothing"); // low-memory phones can return an empty image
      return out;
    } catch (_) {
      if (/hei[cf]/i.test((file.type || "") + (file.name || ""))) throw new Error((file.name || "Photo") + " is in HEIC format, which browsers cannot read. Please choose a JPG or PNG photo.");
      if (Math.max(file.size || 0, blob.size) <= 6 * 1024 * 1024) { const raw = await readB64(blob); if (raw) return raw; }
      throw new Error((file.name || "Photo") + " could not be processed. Try a smaller JPG or PNG photo.");
    }
  }
  const NOPHOTO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#cbd5dc"/><text x="200" y="155" text-anchor="middle" font-family="sans-serif" fill="#5d6b78">No photo</text></svg>');
  // If a photo fails to load (e.g. GitHub's image cache is a few seconds behind), retry once, then show a placeholder.
  function guard(el) {
    el.addEventListener("error", (e) => {
      const i = e.target; if (!i || i.tagName !== "IMG") return;
      const r = i.dataset.r || "0"; if (r === "2") return;
      if (r === "0") { i.dataset.r = "1"; const s = i.src; setTimeout(() => { i.src = s + (s.includes("?") ? "&" : "?") + "r=" + Date.now(); }, 1500); }
      else { i.dataset.r = "2"; i.src = NOPHOTO; }
    }, true);
  }
  const api = { guard, NOPHOTO, esc, money, slug, filterSort, compress };
  root.U = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
