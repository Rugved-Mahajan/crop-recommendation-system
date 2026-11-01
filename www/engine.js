// Random Forest inference in plain JS (mirrors scikit-learn's predict_proba).
(function (root) {
  function predictProba(model, input) {
    // scikit-learn casts inputs to float32 before comparing with thresholds
    const x = input.map(Math.fround);
    const nClass = model.classes.length;
    const votes = new Array(nClass).fill(0);
    for (const t of model.trees) {
      let i = 0;
      while (t.f[i] !== -1) i = x[t.f[i]] <= t.t[i] ? t.l[i] : t.r[i];
      votes[t.c[i]] += 1;
    }
    const n = model.trees.length;
    return votes.map(v => v / n);
  }
  function predict(model, input) {
    const p = predictProba(model, input);
    let best = 0;
    for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    return { index: best, label: model.classes[best], probs: p };
  }
  const api = { predictProba, predict };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CropEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
