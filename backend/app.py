from pathlib import Path
import os
import sys

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

BASE_DIR = Path(__file__).resolve().parent

percentages = ["Attendance (%)", "Assignment Submission (%)", "Internal Marks (%)", "Lab Score (%)"]
discrete = ["No. of Backlogs", "Active Backlogs", "Online Certifications"]
positive = [
    "Current CGPA (0 10)", "No. of Backlogs", "Active Backlogs", "Daily Study Hours",
    "Social Media (hrs/day)", "Gaming (hrs/day)", "Online Learning (hrs/day)",
    "Online Certifications", "Online Tuition (hrs/week)", "Commute Time (min/day)",
    "Physical Activity (hrs/week)",
]


def limit(data):
    data = data.copy()
    data[percentages] = data[percentages].clip(0, 100)
    data["Sleep (hrs/day)"] = data["Sleep (hrs/day)"].clip(0, 12)
    data["Current CGPA (0 10)"] = data["Current CGPA (0 10)"].clip(upper=10)
    data[discrete] = data[discrete].round()
    data[positive] = data[positive].clip(lower=0)
    return data


# The serialized FunctionTransformer references this notebook function by name.
if not hasattr(sys.modules["__main__"], "limit"):
    sys.modules["__main__"].limit = limit

bundle = joblib.load(BASE_DIR / "student_performance_preprocessor.joblib")
pipeline = bundle["preprocessor"]
encoder = bundle["label_encoder"]
model = XGBClassifier()
model.load_model(str(BASE_DIR / "xgb_model.json"))

# Same column names and order as the notebook's X_train
COLUMNS = [
    "Current CGPA (0 10)", "No. of Backlogs", "Active Backlogs", "Attendance (%)",
    "Assignment Submission (%)", "Internal Marks (%)", "Lab Score (%)",
    "Daily Study Hours", "Revision Frequency", "Social Media (hrs/day)",
    "Phone During Study", "Gaming (hrs/day)", "Online Learning (hrs/day)",
    "Online Certifications", "Online Tuition (hrs/week)", "Sleep (hrs/day)",
    "Commute Time (min/day)", "Physical Activity (hrs/week)",
]
ALLOWED = {
    "Revision Frequency": ["Never", "Only Before Exam", "Monthly", "Weekly", "Daily"],
    "Phone During Study": ["Actively Use", "Silent", "Keep Away"],
}
CAT_COLS = list(ALLOWED)

# Below this many filled fields the prediction is mostly imputed guesswork.
MIN_FIELDS = 3


def clean_category(col, value):
    """Normalise like the notebook (strip + Title Case); None if blank; raise if invalid."""
    if value is None or str(value).strip() == "":
        return None
    v = str(value).strip().title()
    if v not in ALLOWED[col]:
        raise ValueError(f"Invalid value '{value}' for '{col}'. Allowed: {ALLOWED[col]}")
    return v


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/predict")
def predict():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    try:
        row = {}
        for c in COLUMNS:
            v = data.get(c)
            row[c] = clean_category(c, v) if c in CAT_COLS else v
        df = pd.DataFrame([row])[COLUMNS]

        # Blank cells -> NaN, so the pipeline's imputers fill them in
        for c in COLUMNS:
            if c in CAT_COLS:
                df[c] = df[c].astype(object).where(df[c].notna(), np.nan)
            else:
                df[c] = pd.to_numeric(df[c], errors="coerce")

        filled = int(df.notna().sum(axis=1).iloc[0])
        if filled < MIN_FIELDS:
            return jsonify({"error": f"Please fill at least {MIN_FIELDS} fields (got {filled})."}), 400

        probs = model.predict_proba(pipeline.transform(df))[0]
        label = encoder.inverse_transform([int(np.argmax(probs))])[0]
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "Internal error while predicting."}), 500

    return jsonify({
        "label": label,
        "filled_fields": filled,
        "probabilities": {cls: float(p) for cls, p in zip(encoder.classes_, probs)},
    })


if __name__ == "__main__":
    app.run(port=5000, debug=os.environ.get("FLASK_DEBUG") == "1")
