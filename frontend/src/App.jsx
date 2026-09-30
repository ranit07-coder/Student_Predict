import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/predict";

// Every field = one cell. `key` must match the column name used in the notebook.
const SECTIONS = [
  {
    title: "Academics",
    icon: "🎓",
    fields: [
      { key: "Current CGPA (0 10)", label: "Current CGPA", icon: "📘", hint: "0 – 10", min: 0, max: 10, step: 0.01 },
      { key: "No. of Backlogs", label: "Total Backlogs", icon: "📚", hint: "count", min: 0, max: 20, step: 1 },
      { key: "Active Backlogs", label: "Active Backlogs", icon: "⚠️", hint: "count", min: 0, max: 20, step: 1 },
      { key: "Attendance (%)", label: "Attendance", icon: "🗓️", hint: "%", min: 0, max: 100, step: 0.1 },
      { key: "Assignment Submission (%)", label: "Assignments Submitted", icon: "📝", hint: "%", min: 0, max: 100, step: 0.1 },
      { key: "Internal Marks (%)", label: "Internal Marks", icon: "🧮", hint: "%", min: 0, max: 100, step: 0.1 },
      { key: "Lab Score (%)", label: "Lab Score", icon: "🔬", hint: "%", min: 0, max: 100, step: 0.1 },
      { key: "Online Certifications", label: "Online Certifications", icon: "🏅", hint: "count", min: 0, max: 50, step: 1 },
    ],
  },
  {
    title: "Study Habits",
    icon: "✏️",
    fields: [
      { key: "Daily Study Hours", label: "Daily Study Hours", icon: "⏱️", hint: "hrs/day", min: 0, max: 24, step: 0.1 },
      {
        key: "Revision Frequency", label: "Revision Frequency", icon: "🔁", type: "select",
        options: ["Never", "Only Before Exam", "Monthly", "Weekly", "Daily"],
      },
      {
        key: "Phone During Study", label: "Phone During Study", icon: "📱", type: "select",
        options: ["Actively Use", "Silent", "Keep Away"],
      },
      { key: "Online Learning (hrs/day)", label: "Online Learning", icon: "💻", hint: "hrs/day", min: 0, max: 24, step: 0.1 },
      { key: "Online Tuition (hrs/week)", label: "Online Tuition", icon: "🧑‍🏫", hint: "hrs/week", min: 0, max: 100, step: 0.1 },
    ],
  },
  {
    title: "Lifestyle",
    icon: "🌱",
    fields: [
      { key: "Social Media (hrs/day)", label: "Social Media", icon: "📲", hint: "hrs/day", min: 0, max: 24, step: 0.1 },
      { key: "Gaming (hrs/day)", label: "Gaming", icon: "🎮", hint: "hrs/day", min: 0, max: 24, step: 0.1 },
      { key: "Sleep (hrs/day)", label: "Sleep", icon: "😴", hint: "hrs/day", min: 0, max: 12, step: 0.1 },
      { key: "Commute Time (min/day)", label: "Commute Time", icon: "🚌", hint: "min/day", min: 0, max: 600, step: 1 },
      { key: "Physical Activity (hrs/week)", label: "Physical Activity", icon: "🏃", hint: "hrs/week", min: 0, max: 100, step: 0.1 },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const CLASS_STYLE = { Good: "good", Average: "average", "At-Risk": "risk" };

export default function App() {
  const [name, setName] = useState("");
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filled = ALL_FIELDS.filter((f) => values[f.key] !== undefined && values[f.key] !== "").length;

  const handleChange = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleReset = () => {
    setName("");
    setValues({});
    setResult(null);
    setError("");
  };

  const handlePredict = async () => {
    setLoading(true);
    setError("");
    // Empty cells are sent as null -> the model's imputer fills them in.
    const payload = {};
    ALL_FIELDS.forEach((f) => {
      const v = values[f.key];
      payload[f.key] = v === undefined || v === "" ? null : f.type === "select" ? v : Number(v);
    });

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResult(data);
      setHistory((h) => [{ name: name || "Unnamed student", label: data.label }, ...h].slice(0, 6));
    } catch (e) {
      setError("Could not reach the prediction server. Is the Flask app running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>🎯 Student Performance Dashboard</h1>
        <p>Enter a student's details and get an instant Good / Average / At-Risk prediction.</p>
      </header>

      <main className="layout">
        {/* ---------- LEFT: input cells ---------- */}
        <section className="inputs">
          <div className="cell name-cell">
            <label>👤 Student Name / ID <span className="hint">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. STU1307"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title} className="section">
              <h2>{section.icon} {section.title}</h2>
              <div className="grid">
                {section.fields.map((f) => (
                  <div className="cell" key={f.key}>
                    <label>
                      <span className="icon">{f.icon}</span> {f.label}
                      {f.hint && <span className="hint">{f.hint}</span>}
                    </label>

                    {f.type === "select" ? (
                      <select value={values[f.key] ?? ""} onChange={(e) => handleChange(f.key, e.target.value)}>
                        <option value="">Select…</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        placeholder="—"
                        value={values[f.key] ?? ""}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ---------- RIGHT: result panel ---------- */}
        <aside className="side">
          <div className="panel">
            <div className="progress-label">{filled} / {ALL_FIELDS.length} fields filled</div>
            <div className="progress"><div style={{ width: `${(filled / ALL_FIELDS.length) * 100}%` }} /></div>
            <p className="note">Blank cells are fine — missing values are filled in automatically.</p>

            <button className="btn primary" onClick={handlePredict} disabled={loading || filled === 0}>
              {loading ? "Predicting…" : "🔮 Predict Performance"}
            </button>
            <button className="btn ghost" onClick={handleReset}>Reset</button>

            {error && <div className="error">{error}</div>}
          </div>

          {result && (
            <div className={`panel result ${CLASS_STYLE[result.label]}`}>
              <div className="result-title">{name || "Student"} is predicted</div>
              <div className="badge">{result.label}</div>

              <div className="bars">
                {Object.entries(result.probabilities).map(([cls, p]) => (
                  <div key={cls} className="bar-row">
                    <span>{cls}</span>
                    <div className="bar"><div className={`fill ${CLASS_STYLE[cls]}`} style={{ width: `${p * 100}%` }} /></div>
                    <span className="pct">{(p * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="panel">
              <h3>Recent predictions</h3>
              <ul className="history">
                {history.map((h, i) => (
                  <li key={i}>
                    <span>{h.name}</span>
                    <span className={`tag ${CLASS_STYLE[h.label]}`}>{h.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
