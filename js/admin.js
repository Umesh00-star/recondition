(function () {
  const $ = (id) => document.getElementById(id);
  let files = [], vehicles = [];
  const show = (el, type, text) => { el.className = "msg " + type; el.textContent = text; };

  async function enter() {
    $("login").hidden = true; $("app").hidden = false;
    try { vehicles = await GH.readVehicles(); } catch (e) { vehicles = []; }
    rows();
  }
  function rows() {
    $("rows").innerHTML = vehicles.length ? vehicles.map((v) => `<div class="row"><img src="${v.images && v.images[0] ? GH.imageUrl(v.images[0]) : ""}" alt="">
      <div class="grow"><b>${U.esc(v.name)}</b><span class="meta">${U.esc(v.number)} · ${U.money(v.price)}</span></div>
      <button class="btn danger" data-d="${U.esc(v.id)}">Delete</button></div>`).join("") : '<p class="meta">No vehicles yet. Add your first one.</p>';
  }

  $("connect").onclick = async () => {
    GH.setToken($("tok").value.trim());
    try { show($("lmsg"), "ok", "Checking…"); await GH.verifyToken(); enter(); }
    catch (e) { GH.setToken(""); show($("lmsg"), "err", e.message); }
  };
  $("logout").onclick = () => { GH.setToken(""); location.reload(); };

  $("photos").onchange = (e) => {
    files = [...e.target.files].slice(0, 5);
    $("prev").innerHTML = files.map((f) => `<img src="${URL.createObjectURL(f)}" alt="">`).join("");
  };

  $("f").onsubmit = async (e) => {
    e.preventDefault();
    const g = (id) => $(id).value.trim();
    if (!g("name") || !g("number") || !g("model") || !g("color") || g("price") === "") return show($("msg"), "err", "Please fill in every field.");
    $("save").disabled = true; show($("msg"), "ok", "Saving… please wait");
    const id = Date.now().toString(36), paths = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const p = `${APP_CONFIG.imageDir}/${id}-${i + 1}-${U.slug(g("name"))}.jpg`;
        await GH.uploadImage(p, await U.compress(files[i])); paths.push(p);
      }
      const v = { id, name: g("name"), number: g("number"), model: g("model"), color: g("color"), price: Number(g("price")), images: paths, createdAt: Date.now() };
      vehicles = await GH.saveVehicles((list) => [v, ...list], "Add vehicle: " + v.name);
      $("f").reset(); files = []; $("prev").innerHTML = ""; rows();
      show($("msg"), "ok", "Saved. The vehicle is now on the Vehicles page.");
    } catch (err) { show($("msg"), "err", err.message); }
    $("save").disabled = false;
  };

  $("rows").addEventListener("click", async (e) => {
    const id = e.target.dataset.d; if (!id || !confirm("Delete this vehicle?")) return;
    const gone = vehicles.find((v) => v.id === id);
    try {
      vehicles = await GH.saveVehicles((l) => l.filter((v) => v.id !== id), "Delete vehicle"); rows();
      for (const p of (gone.images || [])) await GH.deleteImage(p);
    } catch (err) { alert(err.message); }
  });

  if (GH.token()) GH.verifyToken().then(enter).catch(() => GH.setToken(""));
})();
