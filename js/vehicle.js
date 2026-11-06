(function () {
  const $ = (id) => document.getElementById(id);
  const msg = (t) => { $("view").innerHTML = `<div class="empty">${t}</div>`; };

  async function init() {
    const id = new URLSearchParams(location.search).get("id");
    let all;
    try { all = await GH.readVehicles(); } catch (e) { return msg("Could not load this vehicle. Please refresh in a minute."); }
    const v = all.find((x) => x.id === id);
    if (!v) return msg("Vehicle not found. It may have been removed.");
    document.title = v.name + " | Recondition House";
    const imgs = (v.images || []).map(GH.imageUrl);
    if (!imgs.length) imgs.push(U.NOPHOTO);
    U.guard($("view")); let n = 0;
    $("view").innerHTML = `<div class="vgrid">
      <section><div class="stage" id="stage"><img id="big" alt="${U.esc(v.name)}">
        ${imgs.length > 1 ? `<button class="nv prev" aria-label="Previous photo">‹</button><button class="nv next" aria-label="Next photo">›</button><span class="cnt" id="cnt"></span>` : ""}</div>
        ${imgs.length > 1 ? `<div class="thumbs vt">${imgs.map((u, i) => `<img data-i="${i}" src="${u}" alt="Photo ${i + 1}">`).join("")}</div>` : ""}</section>
      <aside class="panel"><span class="tag static">${U.esc(v.number)}</span><h1 class="vname">${U.esc(v.name)}</h1><div class="price big">${U.money(v.price)}</div>
        <div class="spec"><div>Vehicle number<b>${U.esc(v.number)}</b></div><div>Model<b>${U.esc(v.model)}</b></div><div>Colour<b>${U.esc(v.color)}</b></div><div>Photos<b>${v.images ? v.images.length : 0}</b></div></div></aside></div>`;
    const go = (i) => {
      n = (i + imgs.length) % imgs.length;
      $("big").dataset.r = "0"; $("big").src = imgs[n]; $("stage").style.setProperty("--bg-img", `url("${imgs[n]}")`);
      if ($("cnt")) $("cnt").textContent = (n + 1) + " / " + imgs.length;
      document.querySelectorAll(".vt img").forEach((t, k) => t.classList.toggle("on", k === n));
    };
    go(0);
    const p = document.querySelector(".prev"), x = document.querySelector(".next");
    if (p) { p.onclick = () => go(n - 1); x.onclick = () => go(n + 1); }
    document.querySelectorAll(".vt img").forEach((t) => t.onclick = () => go(+t.dataset.i));
    document.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(n - 1); if (e.key === "ArrowRight") go(n + 1); });
  }
  init();
})();
