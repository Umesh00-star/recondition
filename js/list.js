(function () {
  const $ = (id) => document.getElementById(id);
  let all = [], view = "grid";
  const img = (v, i = 0) => (v.images && v.images[i]) ? GH.imageUrl(v.images[i]) : U.NOPHOTO;

  function render() {
    const list = U.filterSort(all, $("q").value, $("sort").value);
    $("grid").className = "grid" + (view === "list" ? " list" : "");
    $("grid").innerHTML = list.length ? list.map((v) => `
      <a class="card" href="vehicle.html?id=${encodeURIComponent(v.id)}"><div class="ph" style="--bg-img:url('${img(v)}')"><img loading="lazy" src="${img(v)}" alt="${U.esc(v.name)}"><span class="tag">${U.esc(v.number)}</span></div>
      <div class="bd"><h3>${U.esc(v.name)}</h3><span class="meta">${U.esc(v.model)} · ${U.esc(v.color)}</span><span class="price">${U.money(v.price)}</span></div></a>`).join("")
      : `<div class="empty">${all.length ? "No vehicles match your search." : "No vehicles listed yet. Check back soon."}</div>`;
    $("count").textContent = all.length + (all.length === 1 ? " vehicle" : " vehicles") + " available";
  }
  async function init() {
    ["q", "sort"].forEach((id) => $(id).addEventListener("input", render));
    $("vg").onclick = () => { view = "grid"; $("vg").classList.add("on"); $("vl").classList.remove("on"); render(); };
    $("vl").onclick = () => { view = "list"; $("vl").classList.add("on"); $("vg").classList.remove("on"); render(); };
    try { all = await GH.readVehicles(); render(); }
    catch (e) { $("count").textContent = ""; $("grid").innerHTML = `<div class="empty">Could not load vehicles. Please refresh in a minute.</div>`; }
  }
  init();
})();
