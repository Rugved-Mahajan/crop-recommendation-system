import streamlit as st
import joblib
import numpy as np

st.set_page_config(page_title="Crop Recommendation System", page_icon="🌾", layout="centered")

@st.cache_resource
def load_model():
    return joblib.load("crop_model.pkl")

model = load_model()

st.title("🌾 Crop Recommendation System")
st.markdown("""
Welcome to the **Crop Recommendation System**! 
This web application helps farmers and agricultural experts determine the best crop to grow based on soil nutrients and local climatic conditions.
Enter soil and climate parameters below or pick a preset from the sidebar, then click **Predict Crop**.
""")

st.markdown("---")

st.sidebar.header("🎯 Quick Sample Presets")
preset_data = {
    "Rice": [90.0, 42.0, 43.0, 20.88, 82.0, 6.5, 202.94],
    "Maize": [71.0, 54.0, 16.0, 22.61, 63.69, 5.75, 87.76],
    "Chickpea": [40.0, 72.0, 77.0, 17.02, 16.99, 7.49, 88.55],
    "Cotton": [133.0, 47.0, 24.0, 24.40, 79.20, 7.23, 90.80],
    "Coffee": [91.0, 21.0, 26.0, 26.33, 57.36, 7.26, 191.65]
}

selected_preset = st.sidebar.selectbox("Choose a preset crop", ["-- Select Preset --"] + list(preset_data.keys()))

if selected_preset != "-- Select Preset --":
    p_vals = preset_data[selected_preset]
    default_n, default_p, default_k = p_vals[0], p_vals[1], p_vals[2]
    default_temp, default_hum = p_vals[3], p_vals[4]
    default_ph, default_rain = p_vals[5], p_vals[6]
else:
    default_n, default_p, default_k = 90.0, 42.0, 43.0
    default_temp, default_hum = 20.88, 82.0
    default_ph, default_rain = 6.5, 202.94

col1, col2 = st.columns(2)

with col1:
    n_val = st.number_input("Nitrogen (N ratio in soil)", min_value=0.0, max_value=150.0, value=default_n, step=1.0)
    p_val = st.number_input("Phosphorus (P ratio in soil)", min_value=0.0, max_value=150.0, value=default_p, step=1.0)
    k_val = st.number_input("Potassium (K ratio in soil)", min_value=0.0, max_value=205.0, value=default_k, step=1.0)
    temperature = st.number_input("Temperature (°C)", min_value=0.0, max_value=60.0, value=default_temp, step=0.1)

with col2:
    humidity = st.number_input("Relative Humidity (%)", min_value=0.0, max_value=100.0, value=default_hum, step=0.1)
    ph = st.number_input("Soil pH value", min_value=0.0, max_value=14.0, value=default_ph, step=0.1)
    rainfall = st.number_input("Rainfall (mm)", min_value=0.0, max_value=400.0, value=default_rain, step=0.1)

st.markdown("")

if st.button("Predict Crop", type="primary"):
    input_data = np.array([[n_val, p_val, k_val, temperature, humidity, ph, rainfall]])
    
    prediction = model.predict(input_data)
    probabilities = model.predict_proba(input_data)[0]
    classes = model.classes_
    
    top3_indices = probabilities.argsort()[-3:][::-1]
    
    best_crop = prediction[0].capitalize()
    best_confidence = probabilities[model.classes_ == prediction[0]][0] * 100
    
    st.success(f"🌱 **Top Recommended Crop**: **{best_crop}** (Confidence: **{best_confidence:.2f}%**)")
    
    st.markdown("### 📊 Top-3 Crop Alternatives and Confidence Scores")
    
    for idx in top3_indices:
        crop_name = classes[idx].capitalize()
        conf = probabilities[idx] * 100
        col_a, col_b = st.columns([2, 5])
        with col_a:
            st.markdown(f"**{crop_name}**")
        with col_b:
            st.progress(float(probabilities[idx]))
        st.caption(f"Confidence: {conf:.2f}%")
