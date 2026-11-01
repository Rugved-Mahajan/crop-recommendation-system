"""Builds www/crops.js: season guide + typical N-P-K per crop (from the dataset) + model facts.
Usage: python tools/make_crop_data.py path/to/Crop_recommendation.csv path/to/crop_model.pkl"""
import json, sys, joblib, numpy as np, pandas as pd
from sklearn.model_selection import train_test_split

csv = sys.argv[1] if len(sys.argv) > 1 else "data/Crop_recommendation.csv"
pkl = sys.argv[2] if len(sys.argv) > 2 else "crop_model.pkl"
df = pd.read_csv(csv); model = joblib.load(pkl)
npk = df.groupby("label")[["N", "P", "K"]].mean().round(1).to_dict("index")

# sow = months (1-12) when sowing/planting is suitable. General guidance for India.
S = {
 "rice":        (["Kharif"], [6,7], "Oct–Nov", "Needs standing water. Summer/boro rice is also grown under irrigation in some states."),
 "maize":       (["Kharif","Rabi"], [6,7,10,11], "Sep–Oct (Kharif), Feb–Mar (Rabi)", "Mostly Kharif; a Rabi crop is possible where irrigation is available."),
 "chickpea":    (["Rabi"], [10,11], "Feb–Mar", "Likes cool, dry weather. Avoid waterlogging."),
 "kidneybeans": (["Kharif"], [6,7], "Sep–Oct", "Grown mainly in hilly regions. Sensitive to frost and waterlogging."),
 "pigeonpeas":  (["Kharif"], [6,7], "Nov–Jan", "Long-duration crop (about 5–6 months). Often grown as an intercrop."),
 "mothbeans":   (["Kharif"], [6,7], "Sep–Oct", "Very drought tolerant. Suits dry regions such as Rajasthan and Gujarat."),
 "mungbean":    (["Kharif","Zaid"], [6,7,3,4], "Sep (Kharif), Jun (Zaid)", "Short-duration pulse (about 60–70 days). Fits between main crops."),
 "blackgram":   (["Kharif"], [6,7,8], "Sep–Oct", "Also sown in summer (Zaid) or Rabi in some regions."),
 "lentil":      (["Rabi"], [10,11], "Mar–Apr", "Cool-season pulse. Needs well-drained soil."),
 "pomegranate": (["Perennial"], [7,8,2,3], "About 5–7 months after flowering", "Tolerates dry spells. Harvest timing depends on the 'bahar' (flowering season) you choose."),
 "banana":      (["Perennial"], [6,7,2,3], "11–14 months after planting", "Needs steady water and protection from strong wind."),
 "mango":       (["Perennial"], [7,8], "Apr–Jun", "Flowers Dec–Feb. Grafted trees take about 3–5 years to fruit."),
 "grapes":      (["Perennial"], [12,1,2], "Feb–Apr (after October pruning)", "Needs a dry, sunny fruiting period. Pruning time controls harvest time."),
 "watermelon":  (["Zaid"], [1,2,3], "Apr–Jun", "Warm-season crop. Light, sandy soil works well."),
 "muskmelon":   (["Zaid"], [2,3], "May–Jun", "Warm and dry weather gives sweeter fruit."),
 "apple":       (["Perennial"], [12,1,2], "Aug–Oct", "Needs winter chilling. Grown in hill regions (J&K, Himachal, Uttarakhand)."),
 "orange":      (["Perennial"], [7,8], "Nov–Mar (depends on bahar)", "Citrus crop. Needs well-drained soil."),
 "papaya":      (["Perennial"], [6,7,8,9,2,3], "About 9–12 months after planting", "Very sensitive to waterlogging and frost."),
 "coconut":     (["Perennial"], [6,7,8,9], "Every 45–60 days once bearing (4–6 years)", "Plant at monsoon onset. Prefers humid, coastal climate."),
 "cotton":      (["Kharif"], [5,6], "Oct–Jan (several pickings)", "Needs warm weather and a dry spell at boll opening."),
 "jute":        (["Kharif"], [3,4,5], "Jul–Sep", "Needs warm, humid weather. Grown mainly in West Bengal, Bihar and Assam."),
 "coffee":      (["Perennial"], [6,7], "About Nov–Mar (varies by variety)", "Shade-grown in hills (Karnataka, Kerala, Tamil Nadu)."),
}
assert set(S) == set(model.classes_), set(model.classes_) ^ set(S)

crops = {c: {"seasons": S[c][0], "sow": S[c][1], "harvest": S[c][2], "note": S[c][3], "npk": npk[c]} for c in model.classes_}
X, y = df.drop("label", axis=1), df["label"]
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
info = {
  "accuracy": round(float((model.predict(Xte.values) == yte.values).mean()) * 100, 2),
  "rows": int(len(df)), "train": int(len(Xtr)), "test": int(len(Xte)),
  "trees": len(model.estimators_), "classes": len(model.classes_),
  "perCrop": int(df.label.value_counts().iloc[0]),
  "importance": {k: round(float(v), 4) for k, v in zip(X.columns, model.feature_importances_)},
}
with open("www/crops.js", "w") as f:
    f.write("window.CROP_INFO=" + json.dumps(crops, separators=(",", ":")) + ";\n")
    f.write("window.MODEL_INFO=" + json.dumps(info, separators=(",", ":")) + ";\n")
print(info)
