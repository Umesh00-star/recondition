(function () {
  const $ = (id) => document.getElementById(id);
  const FIELDS = ["name", "number", "model", "color", "price"];
  let items = [], vehicles = [], editing = null;
  const local = {}; // photos uploaded this session, shown from memory so we never request a not-yet-published image
  const show = (el, type, text) => { el.className = "msg " + type; el.textContent = text; };
  const src = (p) => local[p] || GH.imageUrl(p);

  async function enter() {
    $("login").hidden = true; $("app").hidden = false;
    try { vehicles = await GH.readVehicles(true); } catch (e) { vehicles = []; }
    rows();
  }
  function rows() {
    $("rows").innerHTML = vehicles.length ? vehicles.map((v) => `<div class="row"><img src="${v.images && v.images[0] ? src(v.images[0]) : U.NOPHOTO}" alt="">
      <div class="grow"><b>${U.esc(v.name)}</b><span class="meta">${U.esc(v.number)} · ${U.money(v.price)} · ${(v.images || []).length} photo${(v.images || []).length === 1 ? "" : "s"}</span></div>
      <div class="acts"><button class="btn ghost sm" data-e="${U.esc(v.id)}">Edit</button><button class="btn danger" data-d="${U.esc(v.id)}">Delete</button></div></div>`).join("") : '<p class="meta">No vehicles yet. Add your first one.</p>';
  }
  function previews() {
    $("prev").innerHTML = items.map((f, i) => `<div class="pv"><img src="data:image/jpeg;base64,${f.data}" alt=""><button type="button" data-x="${i}" aria-label="Remove photo">×</button></div>`).join("");
  }
  function mode(id) {
    editing = id; const add = !id;
    $("ftitle").textContent = add ? "Add a vehicle" : "Edit vehicle";
    $("fsub").textContent = add ? "It shows on the Vehicles page right after saving." : "Change any detail. Photos stay as they are.";
    $("save").textContent = add ? "Save vehicle" : "Update vehicle";
    $("photoField").hidden = !add; $("cancel").hidden = add;
    if (add) { $("f").reset(); items = []; previews(); }
    $("msg").className = "msg"; $("msg").textContent = "";
  }

  $("connect").onclick = async () => {
    GH.setToken($("tok").value.trim());
    try { show($("lmsg"), "ok", "Checking…"); await GH.verifyToken(); enter(); }
    catch (e) { GH.setToken(""); show($("lmsg"), "err", e.message); }
  };
  $("logout").onclick = () => { GH.setToken(""); location.reload(); };
  $("cancel").onclick = () => mode(null);

  // Each photo is read and shrunk the moment it is picked (while the phone still allows reading it),
  // then kept in memory until you press Save. Up to 5 photos; picking again adds to them.
  $("photos").onchange = async (e) => {
    const picked = [...e.target.files];
    show($("msg"), "ok", "Preparing photo…");
    const jobs = picked.map((f) => {
      const key = f.name + "|" + f.size + "|" + f.lastModified;
      return U.compress(f).then((data) => ({ key, name: f.name, data }));
    });
    const results = await Promise.allSettled(jobs); // all start reading immediately
    let err = "";
    for (const r of results) {
      if (r.status !== "fulfilled") { err = r.reason.message; continue; }
      if (items.length < 5 && !items.some((o) => o.key === r.value.key)) items.push(r.value);
    }
    e.target.value = ""; previews();
    if (err) show($("msg"), "err", err); else { $("msg").className = "msg"; $("msg").textContent = ""; }
  };
  $("prev").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    items.splice(+b.dataset.x, 1); previews();
  });

  $("f").onsubmit = async (e) => {
    e.preventDefault();
    const g = (id) => $(id).value.trim();
    if (FIELDS.some((k) => g(k) === "")) return show($("msg"), "err", "Please fill in every field.");
    const d = { name: g("name"), number: g("number"), model: g("model"), color: g("color"), price: Number(g("price")) };
    $("save").disabled = true;
    const paths = []; let saved = false;
    try {
      if (editing) {
        show($("msg"), "ok", "Updating…");
        const id = editing;
        vehicles = await GH.saveVehicles((l) => l.map((v) => v.id === id ? { ...v, ...d } : v), "Edit vehicle: " + d.name);
        saved = true; mode(null); rows(); show($("msg"), "ok", "Updated. Changes are live on the Vehicles page.");
      } else {
        const id = Date.now().toString(36);
        for (let i = 0; i < items.length; i++) {
          show($("msg"), "ok", `Uploading photo ${i + 1} of ${items.length}…`);
          const data = items[i].data;
          const p = `${APP_CONFIG.imageDir}/${id}-${i + 1}-${U.slug(d.name)}.jpg`;
          await GH.uploadImage(p, data); paths.push(p); local[p] = "data:image/jpeg;base64," + data;
        }
        show($("msg"), "ok", "Saving vehicle details…");
        const v = { id, ...d, images: paths, createdAt: Date.now() };
        vehicles = await GH.saveVehicles((l) => [v, ...l], "Add vehicle: " + v.name);
        saved = true; mode(null); rows();
        show($("msg"), "ok", `Saved with ${paths.length} photo${paths.length === 1 ? "" : "s"}. It is now on the Vehicles page.`);
      }
    } catch (err) {
      if (!saved) for (const p of paths) await GH.deleteImage(p); // don't leave orphan photos behind
      show($("msg"), "err", err.message + (paths.length && !saved ? " Nothing was saved, please try again." : ""));
    }
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
      for (const p of (gone.images || [])) { await GH.deleteImage(p); delete local[p]; }
    } catch (err) { alert(err.message); }
  });

  U.guard($("rows"));
  if (GH.token()) GH.verifyToken().then(enter).catch(() => GH.setToken(""));
})();
