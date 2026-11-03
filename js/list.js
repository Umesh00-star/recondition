(function () {
  const $ = (id) => document.getElementById(id);
  let all = [], view = "grid";
  const NOPHOTO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#cbd5dc"/><text x="200" y="155" text-anchor="middle" font-family="sans-serif" fill="#5d6b78">No photo</text></svg>');
  const img = (v, i = 0) => (v.images && v.images[i]) ? GH.imageUrl(v.images[i]) : NOPHOTO;

  function render() {
    const list = U.filterSort(all, $("q").value, $("sort").value);
    $("grid").className = "grid" + (view === "list" ? " list" : "");
    $("grid").innerHTML = list.length ? list.map((v) => `
      <button class="card" data-id="${U.esc(v.id)}"><div class="ph"><img loading="lazy" src="${img(v)}" alt="${U.esc(v.name)}"><span class="tag">${U.esc(v.number)}</span></div>
      <div class="bd"><h3>${U.esc(v.name)}</h3><span class="meta">${U.esc(v.model)} · ${U.esc(v.color)}</span><span class="price">${U.money(v.price)}</span></div></button>`).join("")
      : `<div class="empty">${all.length ? "No vehicles match your search." : "No vehicles listed yet. Check back soon."}</div>`;
    $("count").textContent = all.length + (all.length === 1 ? " vehicle" : " vehicles") + " available";
  }
  function open(id) {
    const v = all.find((x) => x.id === id); if (!v) return;
    const n = Math.max(1, (v.images || []).length);
    $("dlg").innerHTML = `<button class="close" aria-label="Close" id="x">✕</button><div class="dl-main"><img id="big" src="${img(v)}" alt="${U.esc(v.name)}"></div>
      ${n > 1 ? `<div class="thumbs">${[...Array(n).keys()].map((i) => `<img data-i="${i}" class="${i ? "" : "on"}" src="${img(v, i)}" alt="Photo ${i + 1}">`).join("")}</div>` : ""}
      <div class="dl-body"><h2>${U.esc(v.name)}</h2><div class="price big">${U.money(v.price)}</div>
      <div class="spec"><div>Vehicle number<b>${U.esc(v.number)}</b></div><div>Model<b>${U.esc(v.model)}</b></div><div>Colour<b>${U.esc(v.color)}</b></div></div></div>`;
    $("dlg").showModal();
    $("x").onclick = () => $("dlg").close();
    $("dlg").querySelectorAll(".thumbs img").forEach((t) => t.onclick = () => {
      $("big").src = t.src; $("dlg").querySelectorAll(".thumbs img").forEach((o) => o.classList.toggle("on", o === t));
    });
  }
  async function init() {
    ["q", "sort"].forEach((id) => $(id).addEventListener("input", render));
    $("vg").onclick = () => { view = "grid"; $("vg").classList.add("on"); $("vl").classList.remove("on"); render(); };
    $("vl").onclick = () => { view = "list"; $("vl").classList.add("on"); $("vg").classList.remove("on"); render(); };
    $("grid").addEventListener("click", (e) => { const c = e.target.closest(".card"); if (c) open(c.dataset.id); });
    $("dlg").addEventListener("click", (e) => { if (e.target === $("dlg")) $("dlg").close(); });
    try { all = await GH.readVehicles(); render(); }
    catch (e) { $("count").textContent = ""; $("grid").innerHTML = `<div class="empty">Could not load vehicles. Please refresh in a minute.</div>`; }
  }
  init();
})();
