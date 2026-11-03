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
  function compress(file, max = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        resolve(c.toDataURL("image/jpeg", quality).split(",")[1]);
      };
      img.onerror = () => reject(new Error("Could not read " + file.name));
      img.src = u;
    });
  }
  const api = { esc, money, slug, filterSort, compress };
  root.U = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
