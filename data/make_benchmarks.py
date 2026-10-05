import json
from pathlib import Path
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / "student_performance_realistic (1).csv"      
OUT_PATH = HERE.parent / "backend" / "benchmarks.json"          
TARGET = "Predicted Performance"
LOWER = ["No. of Backlogs", "Active Backlogs", "Social Media (hrs/day)", "Gaming (hrs/day)", "Commute Time (min/day)"]
DISCRETE = ["No. of Backlogs", "Active Backlogs", "Online Certifications"]

df = pd.read_csv(CSV_PATH).drop_duplicates().drop(columns="Student ID")

good = df[df[TARGET] == "Good"]
risk = df[df[TARGET] == "At-Risk"]


out = {}
for col in df.select_dtypes("number").columns:
    if col in LOWER:   # good students are at or below this value (75th percentile)
        target, direction = good[col].quantile(0.75), "lower"
    else:              # good students are at or above this value (25th percentile)
        target, direction = good[col].quantile(0.25), "higher"
    if col in DISCRETE:
        target = float(np.ceil(target)) if direction == "lower" else float(np.floor(target))
    out[col] = {
        "direction": direction,
        "target": round(float(target), 1),
        "risk_median": round(float(risk[col].median()), 1),
    }


OUT_PATH.write_text(json.dumps(out, indent=2))
print(f"Read   : {CSV_PATH}")
print(f"Wrote  : {OUT_PATH}")
for k, v in out.items():
    print(f"  {k:32s} {v['direction']:6s} target={v['target']}")
