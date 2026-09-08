import streamlit as st
import joblib
import numpy as np

st.set_page_config(page_title='Crop Recommendation System', layout='centered')

@st.cache_resource
def get_model():
    return joblib.load('crop_model.pkl')

model = get_model()

st.title('AI-Powered Crop Recommendation System')
st.markdown('Enter soil parameters and climate conditions below to get the best crop recommendation with confidence scores, detailed agronomic explanations, and fertilizer advice.')

preset_data = {
    'Rice': [90.0, 42.0, 43.0, 20.88, 82.0, 6.5, 202.94],
    'Maize': [71.0, 54.0, 16.0, 22.61, 63.69, 5.75, 87.76],
    'Chickpea': [40.0, 72.0, 77.0, 17.02, 16.99, 7.49, 88.55],
    'Cotton': [133.0, 47.0, 24.0, 24.40, 79.20, 7.23, 90.80],
    'Coffee': [91.0, 21.0, 26.0, 26.33, 57.36, 7.26, 191.65]
}

sel = st.sidebar.selectbox('Choose a preset', ['-- None --'] + list(preset_data.keys()))
p = preset_data.get(sel, [90.0, 42.0, 43.0, 20.88, 82.0, 6.5, 202.94])

col1, col2 = st.columns(2)

with col1:
    st.subheader('🧪 Soil Nutrients')
    n = st.number_input('Nitrogen (N)', 0.0, 150.0, p[0])
    phosphorus = st.number_input('Phosphorus (P)', 0.0, 150.0, p[1])
    k = st.number_input('Potassium (K)', 0.0, 205.0, p[2])
    ph = st.number_input('Soil pH', 0.0, 14.0, p[5])

with col2:
    st.subheader('🌦️ Climate & Weather')
    temp = st.number_input('Temperature', 0.0, 60.0, p[3])
    hum = st.number_input('Humidity', 0.0, 100.0, p[4])
    rain = st.number_input('Rainfall', 0.0, 400.0, p[6])

st.markdown('')

if st.button('Predict Crop and Get Advice'):
    data = np.array([[n, phosphorus, k, temp, hum, ph, rain]])
    pred = model.predict(data)[0]
    probs = model.predict_proba(data)[0]
    classes = model.classes_
    conf = probs[model.classes_ == pred][0] * 100
    
    crop_display = pred.capitalize()
    st.success('Recommended Crop: ' + crop_display + ' (Confidence: ' + f'{conf:.2f}%' + ')')
    
    reasons = []
    if rain > 200:
        reasons.append('High rainfall (' + str(rain) + ' mm) supports water-intensive growth.')
    elif rain < 100:
        reasons.append('Moderate to low rainfall (' + str(rain) + ' mm) prevents waterlogging.')
    else:
        reasons.append('Balanced rainfall (' + str(rain) + ' mm) meets standard irrigation needs.')
        
    if temp > 25:
        reasons.append('Warm temperature (' + str(temp) + ' C) accelerates metabolic processes.')
    else:
        reasons.append('Cooler temperature (' + str(temp) + ' C) suits temperate crop requirements.')
        
    if ph < 6.0:
        reasons.append('Acidic soil pH (' + str(ph) + ') matches specific nutrient absorption needs.')
    elif ph > 7.5:
        reasons.append('Alkaline soil pH (' + str(ph) + ') provides suitable chemical balance.')
    else:
        reasons.append('Neutral soil pH (' + str(ph) + ') ensures optimal nutrient availability.')

    reason_str = ' '.join(reasons)
    explanation = 'Why this crop? ' + crop_display + ' was recommended because: ' + reason_str + ' Soil nutrient levels (N:' + str(n) + ', P:' + str(phosphorus) + ', K:' + str(k) + ') and humidity (' + str(hum) + '%) align with optimal historical thresholds.'
    st.info(explanation)
    
    st.markdown('### Fertilizer Recommendation and Soil Correction Advisor')
    fert_advice = []
    if n < 50:
        fert_advice.append('Nitrogen is low: Consider applying Urea or Ammonium Sulphate to boost vegetative growth.')
    elif n > 120:
        fert_advice.append('Nitrogen is high: Avoid excess nitrogen to prevent lodging.')
    else:
        fert_advice.append('Nitrogen level is optimal.')
        
    if phosphorus < 30:
        fert_advice.append('Phosphorus is low: Apply Single Super Phosphate (SSP) or DAP to enhance root development.')
    else:
        fert_advice.append('Phosphorus level is optimal.')
        
    if k < 30:
        fert_advice.append('Potassium is low: Apply Muriate of Potash (MOP) to improve disease resistance and grain filling.')
    else:
        fert_advice.append('Potassium level is optimal.')

    if ph < 5.5:
        fert_advice.append('Soil is acidic: Apply Agricultural Lime to raise pH towards neutral.')
    elif ph > 8.0:
        fert_advice.append('Soil is alkaline: Apply Gypsum or elemental sulfur to lower pH.')
    else:
        fert_advice.append('Soil pH is within healthy agricultural range.')
        
    for advice in fert_advice:
        st.markdown('- ' + advice)
    
    st.markdown('### 📊 Top-3 Alternatives & Confidence Breakdown')
    for i in probs.argsort()[-3:][::-1]:
        alt_name = classes[i].capitalize()
        alt_conf = probs[i] * 100
        col_name, col_bar = st.columns([1, 4])
        with col_name:
            st.markdown('**' + alt_name + '**')
        with col_bar:
            st.progress(float(probs[i]))
            st.caption('Confidence: ' + f'{alt_conf:.2f}%')
