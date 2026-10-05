import json
from pathlib import Path

import pandas as pd

BENCH = json.loads((Path(__file__).parent / "benchmarks.json").read_text())

META = {
    "Current CGPA (0 10)": ("CGPA", "", "CGPA rises through consistent internal marks and clearing backlogs - focus on your weakest subjects first and ask faculty for feedback on past papers."),
    "No. of Backlogs": ("Total backlogs", "", "Make a clearing plan: pick one backlog per exam cycle, get previous question papers and attend the supplementary classes."),
    "Active Backlogs": ("Active backlogs", "", "Prioritise these now - register for the next exam, form a study group for that subject and meet the subject teacher weekly."),
    "Attendance (%)": ("Attendance", "%", "Avoid skipping classes: keep a weekly attendance tracker and aim to miss no more than one class a week."),
    "Assignment Submission (%)": ("Assignment submission", "%", "Write deadlines in a planner/phone calendar and submit a day early; start each assignment the day it is given."),
    "Internal Marks (%)": ("Internal marks", "%", "Revise after every class and attempt previous internal papers; ask teachers where marks were lost."),
    "Lab Score (%)": ("Lab score", "%", "Read the experiment before the lab, practise the programs/experiments again at home and keep the record up to date."),
    "Daily Study Hours": ("Daily study time", " hrs/day", "Build a fixed daily timetable: 2-3 focused blocks of 45-50 min with short breaks, at the same time every day."),
    "Social Media (hrs/day)": ("Social media time", " hrs/day", "Set app timers, turn off notifications and keep social media for breaks after a study block."),
    "Gaming (hrs/day)": ("Gaming time", " hrs/day", "Limit gaming to weekends or a fixed slot after finishing the day's study targets."),
    "Online Learning (hrs/day)": ("Online learning", " hrs/day", "Use free courses (NPTEL, Coursera, YouTube lectures) for the subjects you find hard - even 30-60 min a day helps."),
    "Online Certifications": ("Online certifications", "", "Complete a short certification in your field (NPTEL, Coursera, Google/Microsoft courses) - one per semester is a good start."),
    "Online Tuition (hrs/week)": ("Extra tuition / guided learning", " hrs/week", "Add a few hours a week of guided help (online tuition, doubt-clearing sessions or peer study group) for weak subjects."),
    "Sleep (hrs/day)": ("Sleep", " hrs/day", "Keep a fixed sleep time and avoid screens 30 min before bed; good sleep improves memory and focus."),
    "Commute Time (min/day)": ("Commute time", " min/day", "Use travel time for revision (notes, audio lectures, flashcards) or plan study around your commute."),
    "Physical Activity (hrs/week)": ("Physical activity", " hrs/week", "Add short, regular activity - a daily 20-30 min walk, sport or yoga - to improve concentration and stress."),
}

REVISION_TARGET = ["Weekly", "Daily"]       # all Good students revise weekly or daily
REVISION_TIP = "Revise what was taught every week (a 30 min recap per subject) rather than only before exams."
PHONE_TIP = "Keep the phone in another room or on silent while studying - students who keep it away do best."

SEVERITY_ORDER = {"High": 0, "Medium": 1, "Low": 2}


def _fmt(x):
    return f"{x:.1f}".rstrip("0").rstrip(".")


def _severity(ratio):
    """ratio = progress from the 'At-Risk' median (0) to the Good benchmark (1)."""
    if ratio < 0.35:
        return "High"
    if ratio < 0.75:
        return "Medium"
    return "Low"


def build_feedback(values: dict) -> dict:
    """values = {column name: number / category / None} exactly as entered by the user."""
    weak, ok, not_provided = [], 0, []

    for col, b in BENCH.items():
        label, unit, tip = META[col]
        v = values.get(col)
        if v is None or pd.isna(v):
            not_provided.append(label)
            continue

        t, rm = b["target"], b["risk_median"]
        if b["direction"] == "higher":
            met, gap = v >= t, t - v
            ratio = (v - rm) / (t - rm) if t != rm else 1
            advice = f"Increase from {_fmt(v)}{unit} to at least {_fmt(t)}{unit} (+{_fmt(gap)}{unit})"
        else:
            met, gap = v <= t, v - t
            ratio = (rm - v) / (rm - t) if t != rm else 1
            if col in {"No. of Backlogs", "Active Backlogs"}:
                advice = f"Reduce from {_fmt(v)} to {_fmt(t)}"
            else:
                advice = f"Reduce from {_fmt(v)}{unit} to {_fmt(t)}{unit} or less (-{_fmt(gap)}{unit})"

        if met:
            ok += 1
            continue
        weak.append({
            "feature": col, "label": label, "current": round(float(v), 2), "target": t,
            "unit": unit, "gap": round(float(gap), 2), "severity": _severity(ratio),
            "ratio": round(float(ratio), 3), "improvement": advice, "tip": tip,
        })

    # categorical fields
    rev = values.get("Revision Frequency")
    if rev is None or pd.isna(rev):
        not_provided.append("Revision frequency")
    elif rev in REVISION_TARGET:
        ok += 1
    else:
        weak.append({
            "feature": "Revision Frequency", "label": "Revision frequency", "current": rev,
            "target": "Weekly", "unit": "", "gap": None,
            "severity": "Medium" if rev == "Monthly" else "High", "ratio": 0.2 if rev != "Monthly" else 0.5,
            "improvement": f"Move from '{rev}' to at least 'Weekly' revision", "tip": REVISION_TIP,
        })

    phone = values.get("Phone During Study")
    if phone is None or pd.isna(phone):
        not_provided.append("Phone during study")
    elif phone != "Actively Use":
        ok += 1
    else:
        weak.append({
            "feature": "Phone During Study", "label": "Phone use while studying", "current": phone,
            "target": "Silent / Keep Away", "unit": "", "gap": None, "severity": "High", "ratio": 0.0,
            "improvement": "Stop actively using the phone while studying (switch to 'Silent' or 'Keep Away')",
            "tip": PHONE_TIP,
        })

    weak.sort(key=lambda w: (SEVERITY_ORDER[w["severity"]], w["ratio"]))
    for w in weak:
        w.pop("ratio")
    return {"weak_areas": weak, "on_track_count": ok, "not_provided": not_provided}
