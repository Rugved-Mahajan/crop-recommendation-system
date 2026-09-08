# Crop Recommendation System

A complete Machine Learning project built with Python, Jupyter Notebook, Scikit-Learn, and Streamlit to recommend the most suitable crop to grow based on soil and climate parameters.

## Project Goal
Build a predictive model that recommends optimal crops to cultivate depending on soil nutrients (Nitrogen, Phosphorus, Potassium), climatic conditions (temperature, humidity, pH), and rainfall.

---

## Dataset
- **Name**: Crop Recommendation Dataset (commonly sourced from Kaggle)
- **File**: `data/Crop_recommendation.csv`
- **Features**:
  - `N`: Nitrogen content in soil
  - `P`: Phosphorus content in soil
  - `K`: Potassium content in soil
  - `temperature`: Temperature in degrees Celsius
  - `humidity`: Relative humidity in %
  - `ph`: pH value of the soil
  - `rainfall`: Rainfall in mm
  - `label`: Name of the crop (Target variable)

---

## Project Structure
```text
crop-recommendation-system/
├── data/
│   └── Crop_recommendation.csv
├── crop_model.ipynb
├── crop_model.pkl
├── app.py
├── requirements.txt
└── README.md
```

---

## Installation & Prerequisites

1. Install all required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

---

## How to Run the Jupyter Notebook (`crop_model.ipynb`)

1. Open Jupyter Notebook or JupyterLab:
   ```bash
   jupyter notebook
   ```
2. Navigate to `crop_model.ipynb` and run cells sequentially to:
   - Load and explore the dataset
   - Perform train/test split (80/20)
   - Train a `RandomForestClassifier` (n_estimators=100)
   - Evaluate model accuracy, classification report, and confusion matrix heatmap
   - Visualize feature importance
   - Test a manual sample prediction
   - Save the trained model as `crop_model.pkl`

---

## How to Run the Streamlit Web App (`app.py`)

Make sure you have generated `crop_model.pkl` by running the Jupyter notebook first. Then run:

```bash
streamlit run app.py
```

Open your browser at `http://localhost:8501` to interact with the web interface, input soil and climate parameters, and view the recommended crop instantly.
