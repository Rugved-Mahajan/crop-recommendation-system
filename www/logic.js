// Pure helper functions (no DOM) so they can be tested in Node.
(function (root) {
  const AREA_HA = { acre: 0.404686, hectare: 1, guntha: 0.010117 };
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Fertilizer plan. npk = typical N,P,K for the crop; v = [N,P,K,...] entered by the user (kg/ha).
  // Nutrient content: Urea 46% N, DAP 18% N + 46% P2O5, MOP 60% K2O.
  function fertPlan(npk, v, areaHa) {
    const gap = {
      N: Math.max(0, npk.N - v[0]),
      P: Math.max(0, npk.P - v[1]),
      K: Math.max(0, npk.K - v[2]),
    };
    const dapHa = gap.P / 0.46;
    const nFromDap = dapHa * 0.18;
    const ureaHa = Math.max(0, gap.N - nFromDap) / 0.46;
    const mopHa = gap.K / 0.60;
    const f = (x) => Math.round(x * areaHa * 10) / 10;
    return { gap, perHa: { urea: ureaHa, dap: dapHa, mop: mopHa },
             field: { urea: f(ureaHa), dap: f(dapHa), mop: f(mopHa) } };
  }

  function areaToHa(value, unit) {
    const k = AREA_HA[unit];
    return k && value > 0 ? value * k : NaN;
  }

  // Is the current month inside the crop's sowing window? Also finds the next window.
  function sowStatus(sow, month) {
    const now = sow.includes(month);
    let next = null;
    for (let i = 1; i <= 12 && !now; i++) {
      const m = ((month - 1 + i) % 12) + 1;
      if (sow.includes(m)) { next = m; break; }
    }
    return { now, next };
  }

  function monthList(sow) {
    return [...sow].sort((a, b) => a - b).map((m) => MONTHS[m - 1]).join(", ");
  }

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  // Turns an Open-Meteo response into the three model inputs.
  function parseWeather(j) {
    if (!j || !j.current) throw new Error("No weather data");
    const temp = j.current.temperature_2m, hum = j.current.relative_humidity_2m;
    if (typeof temp !== "number" || typeof hum !== "number") throw new Error("Incomplete weather data");
    let p = (j.daily && j.daily.precipitation_sum) || [];
    if (p.length > 30) p = p.slice(0, p.length - 1); // drop today's forecast, keep past days
    const rainRaw = p.reduce((s, x) => s + (typeof x === "number" ? x : 0), 0);
    return {
      temperature: Math.round(clamp(temp, 0, 60) * 10) / 10,
      humidity: Math.round(clamp(hum, 0, 100)),
      rainfall: Math.round(clamp(rainRaw, 0, 400)),
      rainfallRaw: Math.round(rainRaw),
      days: p.length,
    };
  }

  const api = { AREA_HA, MONTHS, fertPlan, areaToHa, sowStatus, monthList, parseWeather };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CropLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
