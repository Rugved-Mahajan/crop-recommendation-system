(function () {
  const M = window.CROP_MODEL, INFO = window.CROP_INFO, MI = window.MODEL_INFO, L = window.CropLogic, I = window.I18N;
  const t = I.t, cname = (c) => I.crop(c, "name");
  const $ = (id) => document.getElementById(id);
  const mon = (m) => I.months()[m - 1];
  const monthList = (sow) => [...sow].sort((a, b) => a - b).map(mon).join(", ");

  const FIELDS = [
    { id: "N", unit: "kg/ha", min: 0, max: 150, step: 1 },
    { id: "P", unit: "kg/ha", min: 0, max: 150, step: 1 },
    { id: "K", unit: "kg/ha", min: 0, max: 205, step: 1 },
    { id: "ph", unit: "", min: 0, max: 14, step: 0.1 },
    { id: "temperature", unit: "°C", min: 0, max: 60, step: 0.1 },
    { id: "humidity", unit: "%", min: 0, max: 100, step: 0.1 },
    { id: "rainfall", unit: "mm", min: 0, max: 400, step: 0.1 },
  ];
  const flabel = (id) => t("f." + id);
  const ORDER = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];
  const DEFAULTS = [90, 42, 43, 20.88, 82, 6.5, 202.94]; // starting values on first load
  // 10 sample test inputs (demo only, not real readings), fixed values in the same order as ORDER: [N, P, K, temperature, humidity, ph, rainfall]
  const CITIES = {
    Pune: [60, 45, 40, 25.5, 62, 6.8, 70],
    Mumbai: [80, 40, 40, 28, 80, 6.5, 230],
    Delhi: [50, 55, 45, 24, 55, 7.6, 60],
    Chennai: [90, 45, 40, 29, 75, 6.9, 120],
    Kolkata: [78, 46, 40, 25, 80, 6.7, 175],
    Nagpur: [110, 50, 20, 26, 70, 7.2, 85],
    Jaipur: [40, 70, 75, 18, 18, 7.5, 85],
    Shimla: [20, 130, 200, 22, 92, 5.9, 115],
    Kochi: [20, 20, 30, 27, 95, 5.9, 175],
    Hyderabad: [100, 20, 50, 34, 60, 6.8, 50],
  };
  const EMOJI = { apple:"🍎", banana:"🍌", blackgram:"🫘", chickpea:"🫘", coconut:"🥥", coffee:"☕", cotton:"🌿",
    grapes:"🍇", jute:"🌾", kidneybeans:"🫘", lentil:"🫘", maize:"🌽", mango:"🥭", mothbeans:"🫘", mungbean:"🫘",
    muskmelon:"🍈", orange:"🍊", papaya:"🥭", pigeonpeas:"🫛", pomegranate:"🍎", rice:"🌾", watermelon:"🍉" };
  let last = null; // last prediction {crop, v, probs}
  let selectedCity = null;

  // ---------- tabs ----------
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== "pane-" + b.dataset.tab));
    window.scrollTo({ top: 0 });
  }));

  // ---------- inputs ----------
  const form = $("fields");
  FIELDS.forEach((f) => {
    const w = document.createElement("div");
    w.className = "field";
    w.innerHTML =
      `<label for="${f.id}"><span id="lbl_${f.id}"></span>${f.unit ? ` <span class="unit">${f.unit}</span>` : ""}</label>` +
      `<div class="row"><input type="range" id="${f.id}_r" min="${f.min}" max="${f.max}" step="${f.step}">` +
      `<input type="number" id="${f.id}" inputmode="decimal" min="${f.min}" max="${f.max}" step="${f.step}"></div>`;
    form.appendChild(w);
    const num = w.querySelector("#" + f.id), rng = w.querySelector("#" + f.id + "_r");
    num.addEventListener("input", () => { rng.value = num.value; });
    rng.addEventListener("input", () => { num.value = rng.value; });
  });
  function refreshFieldLabels() { FIELDS.forEach((f) => { $("lbl_" + f.id).textContent = flabel(f.id); }); }
  function setValue(id, val) { $(id).value = val; $(id + "_r").value = val; }
  function setValues(arr) { ORDER.forEach((id, i) => setValue(id, arr[i])); }
  function readValues() {
    const out = [];
    for (const id of ORDER) {
      const f = FIELDS.find((x) => x.id === id), label = flabel(id);
      const v = parseFloat($(id).value);
      if (isNaN(v)) return { error: t("err.enter", { label }) };
      if (v < f.min || v > f.max) return { error: t("err.range", { label, min: f.min, max: f.max }) };
      out.push(v);
    }
    return { values: out };
  }
  const cityChips = $("cityPresets");
  function renderCityChips() {
    cityChips.innerHTML = "";
    Object.keys(CITIES).forEach((name) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (name === selectedCity ? " on" : ""); b.textContent = t("city." + name);
      b.onclick = () => {
        setValues(CITIES[name]);
        selectedCity = name;
        cityChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b));
        $("result").hidden = true;
      };
      cityChips.appendChild(b);
    });
  }
  setValues(DEFAULTS);

  // ---------- 1) weather auto-fill (Open-Meteo, free, no key) ----------
  let wLast = null; // {key, vars, kind} so the status can be re-translated
  function wStatus(key, vars, kind) {
    wLast = key ? { key, vars, kind } : null;
    renderWStatus();
  }
  function renderWStatus() {
    const e = $("wStatus");
    if (!wLast) { e.textContent = ""; e.className = "wstatus"; e.hidden = true; return; }
    const v = Object.assign({}, wLast.vars || {});
    if (v.own) v.label = t("w.yourLoc");
    let msg = t(wLast.key, v);
    if (wLast.key === "w.filled") {
      if (v.capped) msg += t("w.capped");
      msg += t("w.soilNext");
    }
    e.textContent = msg; e.className = "wstatus " + (wLast.kind || ""); e.hidden = false;
  }
  async function getJSON(url) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(tm); }
  }
  async function fillFromWeather(lat, lon, label) {
    wStatus("w.fetching", null, "");
    try {
      const j = await getJSON(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m&daily=precipitation_sum&past_days=30&forecast_days=1&timezone=auto`);
      const w = L.parseWeather(j);
      setValue("temperature", w.temperature); setValue("humidity", w.humidity); setValue("rainfall", w.rainfall);
      selectedCity = null; cityChips.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
      $("result").hidden = true;
      wStatus("w.filled", { label, own: label === null, temp: w.temperature, hum: w.humidity, rain: w.rainfall, days: w.days, capped: w.rainfallRaw > 400 }, "ok");
    } catch (e) {
      wStatus("w.fail", null, "err");
    }
  }
  $("geoBtn").addEventListener("click", () => {
    if (!navigator.geolocation) { wStatus("w.noGeo", null, "err"); return; }
    wStatus("w.getLoc", null, "");
    navigator.geolocation.getCurrentPosition(
      (p) => fillFromWeather(p.coords.latitude.toFixed(3), p.coords.longitude.toFixed(3), null),
      () => wStatus("w.locDenied", null, "err"),
      { timeout: 15000, maximumAge: 600000 });
  });
  async function searchCity() {
    const q = $("cityInput").value.trim(), box = $("cityResults");
    box.innerHTML = "";
    if (q.length < 2) { wStatus("w.min2", null, "err"); return; }
    wStatus("w.searching", null, "");
    try {
      const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=${I.lang()}&format=json`);
      if (!j.results || !j.results.length) { wStatus("w.noCity", null, "err"); return; }
      wStatus("w.tap", null, "");
      j.results.forEach((r) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "chip";
        const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
        b.textContent = label;
        b.onclick = () => { box.innerHTML = ""; fillFromWeather(r.latitude, r.longitude, label); };
        box.appendChild(b);
      });
    } catch (e) {
      wStatus("w.searchFail", null, "err");
    }
  }
  $("cityBtn").addEventListener("click", searchCity);
  $("cityInput").addEventListener("keydown", (e) => { if (e.key === "Enter") searchCity(); });

  // ---------- advice rules (same as the original Streamlit app) ----------
  function explain(crop, v) {
    const [n, p, k, temp, hum, ph, rain] = v;
    const r = [];
    if (rain > 200) r.push(t("ex.rainHigh", { rain }));
    else if (rain < 100) r.push(t("ex.rainLow", { rain }));
    else r.push(t("ex.rainMid", { rain }));
    if (temp > 25) r.push(t("ex.tempWarm", { temp }));
    else r.push(t("ex.tempCool", { temp }));
    if (ph < 6) r.push(t("ex.phAcid", { ph }));
    else if (ph > 7.5) r.push(t("ex.phAlk", { ph }));
    else r.push(t("ex.phNeu", { ph }));
    return t("ex.head", { crop: cname(crop), reasons: r.join(" "), n, p, k, hum });
  }
  function advice(v) {
    const [n, p, k, , , ph] = v, a = [];
    if (n < 50) a.push(["warn", t("adv.nLow")]);
    else if (n > 120) a.push(["warn", t("adv.nHigh")]);
    else a.push(["ok", t("adv.nOk")]);
    if (p < 30) a.push(["warn", t("adv.pLow")]); else a.push(["ok", t("adv.pOk")]);
    if (k < 30) a.push(["warn", t("adv.kLow")]); else a.push(["ok", t("adv.kOk")]);
    if (ph < 5.5) a.push(["warn", t("adv.phAcid")]);
    else if (ph > 8) a.push(["warn", t("adv.phAlk")]);
    else a.push(["ok", t("adv.phOk")]);
    return a;
  }

  // ---------- 2) season guide for the recommended crop ----------
  const seasonName = (s) => t("season." + s);
  function seasonCardHTML(crop) {
    const c = INFO[crop], month = new Date().getMonth() + 1;
    const st = L.sowStatus(c.sow, month);
    const plant = c.seasons[0] === "Perennial";
    const badges = c.seasons.map((s) => `<span class="badge ${s.toLowerCase()}">${seasonName(s)}</span>`).join("");
    const now = st.now
      ? `<div class="now ok">${t(plant ? "season.okPlant" : "season.okSow", { month: mon(month) })}</div>`
      : `<div class="now warn">${t(plant ? "season.noPlant" : "season.noSow", { month: mon(month), next: mon(st.next) })}</div>`;
    return `<h2>${t("season.title", { crop: cname(crop) })}</h2><div class="badges">${badges}</div>
      <div class="kv"><span>${t(plant ? "season.plantMonths" : "season.sowMonths")}</span><b>${monthList(c.sow)}</b></div>
      <div class="kv"><span>${t("season.harvest")}</span><b>${I.crop(crop, "harvest")}</b></div>${now}
      <p class="hint">${I.crop(crop, "note")} ${t("season.foot")}</p>`;
  }

  // ---------- 3) fertilizer quantity ----------
  const unitName = (unit, area) => t("u." + unit + (area === 1 ? "" : ".pl"));
  function bags(kg, size) { return kg > 0 ? t("fert.bags", { n: (kg / size).toFixed(1), size }) : ""; }
  function renderFert() {
    const out = $("fertOut");
    if (!last) return;
    const area = parseFloat($("area").value), unit = $("unit").value;
    const ha = L.areaToHa(area, unit);
    if (!isFinite(ha)) { out.innerHTML = `<div class="err">${t("fert.badArea")}</div>`; return; }
    const npk = INFO[last.crop].npk, p = L.fertPlan(npk, last.v, ha), kg = t("fert.kg");
    const row = (n, mine, typ, gap) => `<tr><td>${n}</td><td>${mine}</td><td>${typ}</td><td class="${gap > 0 ? "gap" : ""}">${gap > 0 ? "+" + gap.toFixed(1) : t("fert.ok")}</td></tr>`;
    const table = `<div class="scroll"><table><tr><th>${t("fert.nutrient")}</th><th>${t("fert.yours")}</th><th>${t("fert.typical", { crop: cname(last.crop) })}</th><th>${t("fert.gap")}</th></tr>` +
      row(t("fert.N"), last.v[0], npk.N, p.gap.N) + row(t("fert.P"), last.v[1], npk.P, p.gap.P) +
      row(t("fert.K"), last.v[2], npk.K, p.gap.K) + `</table></div>`;
    const f = p.field;
    let prods;
    if (f.urea + f.dap + f.mop === 0) prods = `<div class="now ok">${t("fert.none")}</div>`;
    else prods = `<div class="kv"><span>${t("fert.urea")}</span><b>${f.urea} ${kg}${bags(f.urea, 45)}</b></div>
      <div class="kv"><span>${t("fert.dap")}</span><b>${f.dap} ${kg}${bags(f.dap, 50)}</b></div>
      <div class="kv"><span>${t("fert.mop")}</span><b>${f.mop} ${kg}${bags(f.mop, 50)}</b></div>
      <p class="hint">${t("fert.total", { area, unit: unitName(unit, area) })}</p>`;
    out.innerHTML = table + prods;
  }
  $("area").addEventListener("input", renderFert);
  $("unit").addEventListener("change", renderFert);

  // ---------- offline sample market prices ----------
  const PRICES = window.CROP_PRICES || {}, PNOTE = window.PRICE_NOTES || {};
  const inr = (n) => "\u20B9" + n.toLocaleString("en-IN");
  function priceCardHTML(c) {
    const p = PRICES[c];
    if (!p) return "";
    const note = PNOTE[c] ? ` (${t("pn." + c)})` : "";
    return `<h2>${t("price.title", { note })}</h2>
      <div class="kv"><span>${t("price.typical")}</span><b>${inr(p[1])} ${t("price.perQ")}</b></div>
      <div class="kv"><span>${t("price.range")}</span><b>${inr(p[0])} – ${inr(p[2])}</b></div>
      <div class="wstatus err" style="margin:10px 0 0">${t("price.warn")}</div>`;
  }

  // ---------- predict ----------
  function renderResult() {
    if (!last) return;
    const crop = last.crop, v = last.v, probs = last.probs;
    const idx = M.classes.indexOf(crop);
    $("emoji").textContent = EMOJI[crop] || "🌱";
    $("crop").textContent = cname(crop);
    $("conf").textContent = t("res.conf", { pct: (probs[idx] * 100).toFixed(2) });
    $("why").textContent = explain(crop, v);
    $("seasonCard").innerHTML = seasonCardHTML(crop);
    $("priceCard").innerHTML = priceCardHTML(crop);
    $("fert").innerHTML = advice(v).map(([k, s]) => `<li class="${k}">${s}</li>`).join("");
    renderFert();
    const top = probs.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).slice(0, 3);
    $("top3").innerHTML = top.map(([p, i]) =>
      `<div class="bar"><div class="bn">${cname(M.classes[i])}</div><div class="bt"><div class="bf" style="width:${(p * 100).toFixed(1)}%"></div></div><div class="bp">${(p * 100).toFixed(2)}%</div></div>`).join("");
  }
  $("predict").addEventListener("click", () => {
    const err = $("error"), r = readValues();
    if (r.error) { err.textContent = r.error; err.hidden = false; $("result").hidden = true; return; }
    err.hidden = true;
    const v = r.values, res = CropEngine.predict(M, v);
    last = { crop: res.label, v, probs: res.probs };
    renderResult();
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- season guide tab ----------
  let seasonFilter = "All";
  const SF = ["All", "Kharif", "Rabi", "Zaid", "Perennial"];
  function renderSeasonFilters() {
    const box = $("sfilters"); box.innerHTML = "";
    SF.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (s === seasonFilter ? " on" : ""); b.textContent = s === "All" ? t("sg.all") : seasonName(s);
      b.onclick = () => { seasonFilter = s; box.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b)); renderSeasonList(); };
      box.appendChild(b);
    });
  }
  function renderSeasonList() {
    const q = $("sSearch").value.trim().toLowerCase(), month = new Date().getMonth() + 1;
    const html = M.classes.filter((c) => (seasonFilter === "All" || INFO[c].seasons.includes(seasonFilter)) &&
      (c.includes(q) || cname(c).toLowerCase().includes(q))).map((c) => {
      const i = INFO[c], st = L.sowStatus(i.sow, month), plant = i.seasons[0] === "Perennial";
      return `<div class="crop"><div class="ch"><span class="ce">${EMOJI[c] || "🌱"}</span><b>${cname(c)}</b>${st.now ? `<span class="badge sownow">${t("sg.sowNow")}</span>` : ""}</div>
        <div class="badges">${i.seasons.map((s) => `<span class="badge ${s.toLowerCase()}">${seasonName(s)}</span>`).join("")}</div>
        <div class="kv"><span>${t(plant ? "season.plantMonths" : "season.sowMonths")}</span><b>${monthList(i.sow)}</b></div>
        <div class="kv"><span>${t("season.harvest")}</span><b>${I.crop(c, "harvest")}</b></div>${PRICES[c] ? `<div class="kv"><span>${t("price.sample")}</span><b>${inr(PRICES[c][1])} ${t("price.perQ")}</b></div>` : ""}<p class="hint">${I.crop(c, "note")}</p></div>`;
    }).join("");
    $("sList").innerHTML = html || `<p class="hint">${t("sg.none")}</p>`;
  }
  $("sSearch").addEventListener("input", renderSeasonList);

  // ---------- 4) about the model ----------
  function renderAbout() {
    const imp = Object.entries(MI.importance).sort((a, b) => b[1] - a[1]);
    const max = imp[0][1];
    $("aboutStats").innerHTML = [[MI.accuracy + "%", t("about.acc")], [MI.trees, t("about.trees")], [MI.classes, t("about.crops")], [MI.rows, t("about.rows")]]
      .map(([a, b]) => `<div class="stat"><div class="sv">${a}</div><div class="sl">${b}</div></div>`).join("");
    $("aboutImp").innerHTML = imp.map(([k, v]) =>
      `<div class="bar"><div class="bn">${t("about.imp." + k)}</div><div class="bt"><div class="bf" style="width:${(v / max * 100).toFixed(0)}%"></div></div><div class="bp">${(v * 100).toFixed(1)}%</div></div>`).join("");
    $("aboutCrops").textContent = M.classes.map(cname).join(", ");
    $("aboutSplit").textContent = t("about.split", { train: MI.train, test: MI.test, perCrop: MI.perCrop });
  }

  // ---------- language ----------
  function renderAll() {
    refreshFieldLabels(); renderCityChips(); renderWStatus(); renderSeasonFilters(); renderSeasonList(); renderAbout();
    if (last) renderResult();
  }
  window.addEventListener("langchange", renderAll);
  renderAll();
})();
