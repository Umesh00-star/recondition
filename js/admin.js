(function () {
  const $ = (id) => document.getElementById(id);
  const FIELDS = ["name", "number", "model", "color", "price"];
  let files = [], vehicles = [], editing = null;
  const show = (el, type, text) => { el.className = "msg " + type; el.textContent = text; };

  async function enter() {
    $("login").hidden = true; $("app").hidden = false;
    try { vehicles = await GH.readVehicles(); } catch (e) { vehicles = []; }
    rows();
  }
  function rows() {
    $("rows").innerHTML = vehicles.length ? vehicles.map((v) => `<div class="row"><img src="${v.images && v.images[0] ? GH.imageUrl(v.images[0]) : U.NOPHOTO}" alt="">
      <div class="grow"><b>${U.esc(v.name)}</b><span class="meta">${U.esc(v.number)} · ${U.money(v.price)}</span></div>
      <div class="acts"><button class="btn ghost sm" data-e="${U.esc(v.id)}">Edit</button><button class="btn danger" data-d="${U.esc(v.id)}">Delete</button></div></div>`).join("") : '<p class="meta">No vehicles yet. Add your first one.</p>';
  }
  function mode(id) {
    editing = id; const add = !id;
    $("ftitle").textContent = add ? "Add a vehicle" : "Edit vehicle";
    $("fsub").textContent = add ? "It shows on the Vehicles page right after saving." : "Change any detail. Photos stay as they are.";
    $("save").textContent = add ? "Save vehicle" : "Update vehicle";
    $("photoField").hidden = !add; $("cancel").hidden = add;
    if (add) { $("f").reset(); files = []; $("prev").innerHTML = ""; }
    show($("msg"), "", ""); $("msg").className = "msg";
  }

  $("connect").onclick = async () => {
    GH.setToken($("tok").value.trim());
    try { show($("lmsg"), "ok", "Checking…"); await GH.verifyToken(); enter(); }
    catch (e) { GH.setToken(""); show($("lmsg"), "err", e.message); }
  };
  $("logout").onclick = () => { GH.setToken(""); location.reload(); };
  $("cancel").onclick = () => mode(null);

  $("photos").onchange = (e) => {
    files = [...e.target.files].slice(0, 5);
    $("prev").innerHTML = files.map((f) => `<img src="${URL.createObjectURL(f)}" alt="">`).join("");
  };

  $("f").onsubmit = async (e) => {
    e.preventDefault();
    const g = (id) => $(id).value.trim();
    if (FIELDS.some((k) => g(k) === "")) return show($("msg"), "err", "Please fill in every field.");
    const d = { name: g("name"), number: g("number"), model: g("model"), color: g("color"), price: Number(g("price")) };
    $("save").disabled = true; show($("msg"), "ok", editing ? "Updating…" : "Saving… please wait");
    try {
      if (editing) {
        const id = editing;
        vehicles = await GH.saveVehicles((l) => l.map((v) => v.id === id ? { ...v, ...d } : v), "Edit vehicle: " + d.name);
        mode(null); rows(); show($("msg"), "ok", "Updated. Changes are live on the Vehicles page.");
      } else {
        const id = Date.now().toString(36), paths = [];
        for (let i = 0; i < files.length; i++) {
          const p = `${APP_CONFIG.imageDir}/${id}-${i + 1}-${U.slug(d.name)}.jpg`;
          await GH.uploadImage(p, await U.compress(files[i])); paths.push(p);
        }
        const v = { id, ...d, images: paths, createdAt: Date.now() };
        vehicles = await GH.saveVehicles((l) => [v, ...l], "Add vehicle: " + v.name);
        mode(null); rows(); show($("msg"), "ok", "Saved. The vehicle is now on the Vehicles page.");
      }
    } catch (err) { show($("msg"), "err", err.message); }
    $("save").disabled = false;
  };

  $("rows").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.e) {
      const v = vehicles.find((x) => x.id === b.dataset.e); if (!v) return;
      mode(v.id); FIELDS.forEach((k) => $(k).value = v[k] ?? "");
      $("f").scrollIntoView({ behavior: "smooth", block: "start" }); return;
    }
    const id = b.dataset.d; if (!id || !confirm("Delete this vehicle?")) return;
    const gone = vehicles.find((v) => v.id === id);
    try {
      vehicles = await GH.saveVehicles((l) => l.filter((v) => v.id !== id), "Delete vehicle");
      if (editing === id) mode(null);
      rows();
      for (const p of (gone.images || [])) await GH.deleteImage(p);
    } catch (err) { alert(err.message); }
  });

  if (GH.token()) GH.verifyToken().then(enter).catch(() => GH.setToken(""));
})();
