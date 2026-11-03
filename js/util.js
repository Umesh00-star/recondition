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
  // Tries three ways to decode (phone cameras can produce huge or unusual files);
  // if all fail, uploads the original file as-is when it is small enough.
  const readB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("Could not read " + file.name));
    r.readAsDataURL(file);
  });
  const loadImg = (src) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
  async function decode(file) {
    if (root.createImageBitmap) {
      try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (_) {}
      try { return await createImageBitmap(file); } catch (_) {}
    }
    const u = URL.createObjectURL(file);
    try { return await loadImg(u); } catch (_) {} finally { URL.revokeObjectURL(u); }
    return loadImg("data:" + (file.type || "image/jpeg") + ";base64," + await readB64(file));
  }
  async function compress(file, max = 1200, quality = 0.8) {
    try {
      const img = await decode(file);
      const w0 = img.width, h0 = img.height, k = Math.min(1, max / Math.max(w0, h0));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      if (img.close) img.close();
      return c.toDataURL("image/jpeg", quality).split(",")[1];
    } catch (_) {
      if (file.size <= 6 * 1024 * 1024) return readB64(file);
      throw new Error(file.name + " is too large to process. Try a smaller photo.");
    }
  }
  const api = { esc, money, slug, filterSort, compress };
  root.U = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
