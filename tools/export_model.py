"""Export crop_model.pkl (RandomForest) to www/model.js so the app runs fully offline.

Usage (from project root):
    python tools/export_model.py path/to/crop_model.pkl
"""
import json, sys
import joblib
import numpy as np

src = sys.argv[1] if len(sys.argv) > 1 else "crop_model.pkl"
model = joblib.load(src)

trees = []
for est in model.estimators_:
    t = est.tree_
    leaf = t.children_left == -1
    # class of each leaf (leaves of a fully grown forest are pure; argmax is exact then)
    cls = np.argmax(t.value[:, 0, :], axis=1)
    trees.append({
        "f": np.where(leaf, -1, t.feature).tolist(),
        "t": [round(float(x), 9) if not l else 0 for x, l in zip(t.threshold, leaf)],
        "l": t.children_left.tolist(),
        "r": t.children_right.tolist(),
        "c": np.where(leaf, cls, -1).tolist(),
    })

out = {
    "features": ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    "classes": [str(c) for c in model.classes_],
    "trees": trees,
}
with open("www/model.js", "w") as fh:
    fh.write("window.CROP_MODEL=" + json.dumps(out, separators=(",", ":")) + ";")
print("Wrote www/model.js with", len(trees), "trees")
