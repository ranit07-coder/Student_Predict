import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/predict";
const HEALTH_URL = "http://localhost:5000/health";
const MIN_FIELDS = 3;

const SECTIONS = [
  {
    title: "Academics",
    icon: "🎓",
    description: "Core academic indicators used by the prediction model.",
    fields: [
      {
        key: "Current CGPA (0 10)",
        label: "Current CGPA",
        icon: "📘",
        hint: "0–10",
        min: 0,
        max: 10,
        step: 0.01,
      },
      {
        key: "No. of Backlogs",
        label: "Total Backlogs",
        icon: "📚",
        hint: "count",
        min: 0,
        max: 20,
        step: 1,
      },
      {
        key: "Active Backlogs",
        label: "Active Backlogs",
        icon: "⚠️",
        hint: "count",
        min: 0,
        max: 20,
        step: 1,
      },
      {
        key: "Attendance (%)",
        label: "Attendance",
        icon: "🗓️",
        hint: "%",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "Assignment Submission (%)",
        label: "Assignment Submission",
        icon: "📝",
        hint: "%",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "Internal Marks (%)",
        label: "Internal Marks",
        icon: "🧮",
        hint: "%",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "Lab Score (%)",
        label: "Lab Score",
        icon: "🔬",
        hint: "%",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "Online Certifications",
        label: "Online Certifications",
        icon: "🏅",
        hint: "count",
        min: 0,
        max: 50,
        step: 1,
      },
    ],
  },

  {
    title: "Study Habits",
    icon: "✏️",
    description: "Study patterns and learning behaviour.",
    fields: [
      {
        key: "Daily Study Hours",
        label: "Daily Study Hours",
        icon: "⏱️",
        hint: "hrs/day",
        min: 0,
        max: 24,
        step: 0.1,
      },
      {
        key: "Revision Frequency",
        label: "Revision Frequency",
        icon: "🔁",
        type: "select",
        options: [
          "Never",
          "Only Before Exam",
          "Monthly",
          "Weekly",
          "Daily",
        ],
      },
      {
        key: "Phone During Study",
        label: "Phone During Study",
        icon: "📱",
        type: "select",
        options: ["Actively Use", "Silent", "Keep Away"],
      },
      {
        key: "Online Learning (hrs/day)",
        label: "Online Learning",
        icon: "💻",
        hint: "hrs/day",
        min: 0,
        max: 24,
        step: 0.1,
      },
      {
        key: "Online Tuition (hrs/week)",
        label: "Online Tuition",
        icon: "🧑‍🏫",
        hint: "hrs/week",
        min: 0,
        max: 100,
        step: 0.1,
      },
    ],
  },

  {
    title: "Lifestyle",
    icon: "🌱",
    description: "Lifestyle factors included in the model.",
    fields: [
      {
        key: "Social Media (hrs/day)",
        label: "Social Media",
        icon: "📲",
        hint: "hrs/day",
        min: 0,
        max: 24,
        step: 0.1,
      },
      {
        key: "Gaming (hrs/day)",
        label: "Gaming",
        icon: "🎮",
        hint: "hrs/day",
        min: 0,
        max: 24,
        step: 0.1,
      },
      {
        key: "Sleep (hrs/day)",
        label: "Sleep",
        icon: "😴",
        hint: "hrs/day",
        min: 0,
        max: 12,
        step: 0.1,
      },
      {
        key: "Commute Time (min/day)",
        label: "Commute Time",
        icon: "🚌",
        hint: "min/day",
        min: 0,
        max: 600,
        step: 1,
      },
      {
        key: "Physical Activity (hrs/week)",
        label: "Physical Activity",
        icon: "🏃",
        hint: "hrs/week",
        min: 0,
        max: 100,
        step: 0.1,
      },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((section) => section.fields);

const CLASS_STYLE = {
  Good: "good",
  Average: "average",
  "At-Risk": "risk",
};

const SEV_ICON = {
  High: "🔴",
  Medium: "🟠",
  Low: "🟡",
};

/* -------------------------------------------------------
   AUTHENTICATION
------------------------------------------------------- */

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("studentai_session") || "null"
    );
  } catch {
    return null;
  }
}

async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (mode === "signup" && name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      const passwordHash = await hashText(password);

      const accounts = JSON.parse(
        localStorage.getItem("studentai_accounts") || "{}"
      );

      if (mode === "signup") {
        if (accounts[cleanEmail]) {
          throw new Error(
            "An account with this email already exists. Please log in."
          );
        }

        accounts[cleanEmail] = {
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
        };

        localStorage.setItem(
          "studentai_accounts",
          JSON.stringify(accounts)
        );

        const session = {
          name: name.trim(),
          email: cleanEmail,
        };

        localStorage.setItem(
          "studentai_session",
          JSON.stringify(session)
        );

        onLogin(session);
      } else {
        const account = accounts[cleanEmail];

        if (!account || account.passwordHash !== passwordHash) {
          throw new Error("Incorrect email or password.");
        }

        const session = {
          name: account.name,
          email: account.email,
        };

        localStorage.setItem(
          "studentai_session",
          JSON.stringify(session)
        );

        onLogin(session);
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-brand">
          <span className="brand-mark">🎓</span>

          <div>
            <strong>StudentAI</strong>
            <small>Performance System</small>
          </div>
        </div>

        <div className="auth-copy">
          <span className="eyebrow">
            AI-POWERED ACADEMIC ANALYTICS
          </span>

          <h1>
            Understand performance.
            <br />
            Improve outcomes.
          </h1>

          <p>
            Predict student performance and turn the result into
            practical, personalized improvement guidance.
          </p>
        </div>

        <div className="auth-feature-row">
          <span>✓ 18 input variables</span>
          <span>✓ XGBoost classification</span>
          <span>✓ Personalized feedback</span>
        </div>
      </div>

      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="mobile-brand">
            <span className="brand-mark">🎓</span>

            <div>
              <strong>StudentAI</strong>
              <small>Performance System</small>
            </div>
          </div>

          <span className="eyebrow">
            {mode === "login" ? "WELCOME BACK" : "GET STARTED"}
          </span>

          <h2>
            {mode === "login"
              ? "Sign in to StudentAI"
              : "Create your account"}
          </h2>

          <p className="auth-subtitle">
            {mode === "login"
              ? "Access your performance prediction dashboard."
              : "Set up your account to use the prediction dashboard."}
          </p>

          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Sign in →"
                : "Create account →"}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </div>

          <p className="auth-demo-note">
            Demo authentication is stored locally in this browser.
            Production authentication should be handled by the Flask
            backend and a database.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   SIDEBAR
------------------------------------------------------- */

function Sidebar({
  page,
  setPage,
  user,
  onLogout,
  backendOnline,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">🎓</span>

        <div>
          <strong>StudentAI</strong>
          <small>Performance System</small>
        </div>
      </div>

      <nav className="nav">
        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          <span>⌂</span>
          Dashboard
        </button>

        <button
          className={page === "prediction" ? "active" : ""}
          onClick={() => setPage("prediction")}
        >
          <span>◇</span>
          Prediction
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="model-status">
          <span
            className={`status-dot ${
              backendOnline ? "online" : "offline"
            }`}
          />

          <div>
            <strong>XGBoost Model</strong>
            <small>
              {backendOnline
                ? "Prediction engine online"
                : "Backend offline"}
            </small>
          </div>
        </div>

        <div className="user-mini">
          <div className="avatar">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{user?.name || "User"}</strong>
            <small>{user?.email}</small>
          </div>

          <button title="Sign out" onClick={onLogout}>
            ↪
          </button>
        </div>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------
   TOP BAR
------------------------------------------------------- */

function Topbar({ title, backendOnline }) {
  return (
    <div className="topbar">
      <div>
        <span className="eyebrow">AI-POWERED ANALYTICS</span>
        <h1>{title}</h1>
      </div>

      <div className="system-pill">
        <span
          className={`status-dot ${
            backendOnline ? "online" : "offline"
          }`}
        />

        {backendOnline ? "System Online" : "System Offline"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   OVERVIEW CARD
------------------------------------------------------- */

function OverviewCard({ icon, label, value, tone }) {
  return (
    <div className="overview-card">
      <span className={`overview-icon ${tone || ""}`}>
        {icon}
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

function DashboardHome({
  user,
  history,
  backendOnline,
  setPage,
  onReset,
}) {
  return (
    <>
      <Topbar
        title="Student Performance Prediction"
        backendOnline={backendOnline}
      />

      <section className="hero-card">
        <div>
          <span className="eyebrow hero-eyebrow">
            SMART ACADEMIC INSIGHTS
          </span>

          <h2>
            Understand performance.
            <br />
            Improve outcomes.
          </h2>

          <p>
            Enter academic, study and lifestyle information to
            generate a performance prediction and a personalized
            improvement plan.
          </p>

          <button
            className="hero-button"
            onClick={() => {
              onReset();
              setPage("prediction");
            }}
          >
            Start a new prediction <span>→</span>
          </button>
        </div>

        <div className="hero-orbit">
          <div>✦</div>
        </div>
      </section>

      <div className="overview-grid">
        <OverviewCard
          icon="◇"
          label="Input variables"
          value="18"
          tone="purple"
        />

        <OverviewCard
          icon="✓"
          label="Minimum required"
          value={`${MIN_FIELDS} fields`}
          tone="blue"
        />

        <OverviewCard
          icon="⚡"
          label="Model"
          value="XGBoost"
          tone="green"
        />

        <OverviewCard
          icon="◎"
          label="Classes"
          value="3 categories"
          tone="amber"
        />
      </div>

      <section className="dashboard-grid">
        <div className="content-card how-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SYSTEM WORKFLOW</span>
              <h2>How StudentAI works</h2>
            </div>

            <span className="soft-badge">5 steps</span>
          </div>

          <div className="workflow">
            {[
              [
                "01",
                "Enter data",
                "Academic, study and lifestyle inputs",
              ],
              [
                "02",
                "Preprocess",
                "Clean and transform the submitted profile",
              ],
              [
                "03",
                "Classify",
                "Run the saved XGBoost model",
              ],
              [
                "04",
                "Predict",
                "Compare Good, Average and At-Risk probabilities",
              ],
              [
                "05",
                "Guide",
                "Generate benchmark-based improvement feedback",
              ],
            ].map(([n, t, d]) => (
              <div className="workflow-step" key={n}>
                <span>{n}</span>

                <div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card status-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MODEL STATUS</span>
              <h2>Prediction engine</h2>
            </div>

            <span
              className={`status-label ${
                backendOnline ? "online" : "offline"
              }`}
            >
              {backendOnline ? "Online" : "Offline"}
            </span>
          </div>

          <div className="model-hero">
            <div className="model-icon">⚡</div>

            <div>
              <strong>XGBoost Classifier</strong>
              <p>18 input features · 3 performance classes</p>
            </div>
          </div>

          <div className="class-chips">
            <span className="chip good">Good</span>
            <span className="chip average">Average</span>
            <span className="chip risk">At-Risk</span>
          </div>

          <button
            className="outline-button"
            onClick={() => setPage("prediction")}
          >
            Open prediction form →
          </button>
        </div>
      </section>

      <section className="content-card recent-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ACTIVITY</span>
            <h2>Recent predictions</h2>
          </div>

          {history.length > 0 && (
            <span className="soft-badge">
              Last {history.length}
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <div>◫</div>

            <strong>No predictions yet</strong>

            <p>
              Your latest predictions will appear here after you
              run the model.
            </p>

            <button
              className="outline-button"
              onClick={() => setPage("prediction")}
            >
              Make your first prediction
            </button>
          </div>
        ) : (
          <div className="history-table">
            {history.map((item, i) => (
              <div
                className="history-row"
                key={`${item.name}-${i}`}
              >
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.time}</small>
                </div>

                <span
                  className={`tag ${CLASS_STYLE[item.label]}`}
                >
                  {item.label}
                </span>

                <span className="history-confidence">
                  {item.confidence}% confidence
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* -------------------------------------------------------
   INPUT FIELD
------------------------------------------------------- */

function FieldCard({
  field,
  value,
  onChange,
  invalid,
}) {
  return (
    <div
      className={`field-card ${
        invalid ? "invalid" : ""
      }`}
    >
      <label>
        <span className="field-title">
          <span>{field.icon}</span>
          {field.label}
        </span>

        {field.hint && (
          <span className="field-hint">
            {field.hint}
          </span>
        )}
      </label>

      {field.type === "select" ? (
        <select
          value={value ?? ""}
          onChange={(e) =>
            onChange(field.key, e.target.value)
          }
        >
          <option value="">Select…</option>

          {field.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value ?? ""}
          placeholder="—"
          onChange={(e) =>
            onChange(field.key, e.target.value)
          }
        />
      )}

      {invalid && (
        <small className="field-error">
          Value must be between {field.min} and{" "}
          {field.max}.
        </small>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   PREDICTION RESULT
------------------------------------------------------- */

function PredictionResult({
  result,
  onFeedback,
  onNew,
}) {
  const probabilities = Object.entries(
    result.probabilities || {}
  );

  const confidence = (
    (result.probabilities?.[result.label] || 0) * 100
  ).toFixed(1);

  return (
    <div
      className={`result-card ${
        CLASS_STYLE[result.label]
      }`}
    >
      <div className="prediction-kicker">
        PREDICTED PERFORMANCE
      </div>

      <div className="result-badge">
        {result.label}
      </div>

      <p>Based on the submitted student profile</p>

      <div className="result-divider" />

      <div className="confidence-row">
        <span>Prediction confidence</span>
        <strong>{confidence}%</strong>
      </div>

      <div className="probability-list">
        {probabilities.map(([cls, probability]) => (
          <div className="probability" key={cls}>
            <div className="probability-head">
              <span>{cls}</span>

              <strong>
                {(probability * 100).toFixed(1)}%
              </strong>
            </div>

            <div className="probability-track">
              <div
                className={`probability-fill ${
                  CLASS_STYLE[cls]
                }`}
                style={{
                  width: `${probability * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="result-actions">
        <button
          className="outline-button"
          onClick={onFeedback}
        >
          🧭 View personalized improvement plan
          <span>↓</span>
        </button>

        <button
          className="text-button"
          onClick={onNew}
        >
          ← New prediction
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   FEEDBACK
------------------------------------------------------- */

function FeedbackSection({
  feedback,
  name,
}) {
  if (!feedback) {
    return (
      <div className="content-card">
        <strong>Prediction received.</strong>

        <p className="muted">
          No feedback payload was returned by the backend.
        </p>
      </div>
    );
  }

  const {
    weak_areas = [],
    on_track_count = 0,
    not_provided = [],
  } = feedback;

  const high = weak_areas.filter(
    (x) => x.severity === "High"
  ).length;

  const medium = weak_areas.filter(
    (x) => x.severity === "Medium"
  ).length;

  const low = weak_areas.filter(
    (x) => x.severity === "Low"
  ).length;

  return (
    <section
      className="feedback-section"
      id="feedback"
    >
      <div className="feedback-heading">
        <span className="eyebrow">
          PERSONALIZED GUIDANCE
        </span>

        <h2>Improvement Plan</h2>

        <p>
          Practical recommendations based on the information
          provided for{" "}
          <strong>
            {name || "this student"}
          </strong>
          .
        </p>
      </div>

      <div className="feedback-stats">
        <div>
          <strong>{high}</strong>
          <span>🔴 High priority</span>
        </div>

        <div>
          <strong>{medium}</strong>
          <span>🟠 Medium priority</span>
        </div>

        <div>
          <strong>{low}</strong>
          <span>🟡 Low priority</span>
        </div>

        <div>
          <strong>{on_track_count}</strong>
          <span>✓ Areas on track</span>
        </div>
      </div>

      {weak_areas.length === 0 ? (
        <div className="success-box">
          🎉 No weak areas were found among the fields you
          provided. Keep it up!
        </div>
      ) : (
        <>
          <div className="feedback-subhead">
            <div>
              <h3>Areas that need attention</h3>

              <p>
                {weak_areas.length} area
                {weak_areas.length !== 1 ? "s" : ""} need
                improvement, ordered by priority.
              </p>
            </div>
          </div>

          <div className="feedback-grid">
            {weak_areas.map((w) => (
              <article
                className={`feedback-card ${
                  w.severity.toLowerCase()
                }`}
                key={w.feature}
              >
                <div className="feedback-card-head">
                  <strong>
                    {SEV_ICON[w.severity]} {w.label}
                  </strong>

                  <span>
                    {w.severity} priority
                  </span>
                </div>

                <h4>{w.improvement}</h4>

                <p>💡 {w.tip}</p>
              </article>
            ))}
          </div>
        </>
      )}

      {not_provided.length > 0 && (
        <p className="feedback-note">
          Not assessed because they were left blank:{" "}
          {not_provided.join(", ")}.
        </p>
      )}

      <p className="feedback-note">
        Targets are guidance based on benchmark profiles in
        the project dataset; they are not strict rules or
        guarantees of improved performance.
      </p>
    </section>
  );
}

/* -------------------------------------------------------
   REVIEW & PREDICT CARD
------------------------------------------------------- */

function PredictionActionCard({
  filled,
  progress,
  loading,
  backendOnline,
  error,
  onPredict,
  onReset,
}) {
  const canPredict =
    filled >= MIN_FIELDS &&
    !loading &&
    backendOnline;

  return (
    <section
      className="prediction-action-section"
      id="review-predict"
    >
      <div className="prediction-action-card">
        <div className="prediction-action-icon">
          🔮
        </div>

        <div className="prediction-action-content">
          <span className="eyebrow">
            FINAL STEP
          </span>

          <h2>Review your profile & predict</h2>

          <p>
            You have completed{" "}
            <strong>{filled}</strong> of{" "}
            <strong>{ALL_FIELDS.length}</strong> profile
            variables. Review your information above, then
            run the trained XGBoost classifier.
          </p>

          <div className="review-progress">
            <div className="review-progress-top">
              <span>Profile completion</span>
              <strong>{Math.round(progress)}%</strong>
            </div>

            <div className="review-progress-track">
              <div
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div className="prediction-action-meta">
            <span>
              ✓ {filled} / {ALL_FIELDS.length} fields completed
            </span>

            <span>
              ✓ Minimum {MIN_FIELDS} required
            </span>

            <span>
              {backendOnline
                ? "✓ Prediction engine online"
                : "⚠ Backend unavailable"}
            </span>
          </div>

          {error && (
            <div className="api-error">
              {error}
            </div>
          )}

          <div className="final-action-buttons">
            <button
              className="primary-button final-predict-button"
              onClick={onPredict}
              disabled={!canPredict}
            >
              {loading
                ? "Analyzing profile…"
                : "🔮 Predict Student Performance"}
            </button>

            <button
              className="secondary-button"
              onClick={onReset}
              disabled={loading}
            >
              Reset form
            </button>
          </div>

          {!backendOnline && (
            <p className="backend-warning">
              Start the Flask backend on port 5000 before
              running a prediction.
            </p>
          )}

          {backendOnline && filled < MIN_FIELDS && (
            <p className="backend-warning">
              Please complete at least {MIN_FIELDS} fields
              before running the prediction.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------
   PREDICTION PAGE
------------------------------------------------------- */

function PredictionPage({
  name,
  setName,
  values,
  setValues,
  result,
  loading,
  error,
  onPredict,
  onReset,
  onFeedback,
  invalidFields,
  backendOnline,
}) {
  const filled = ALL_FIELDS.filter(
    (f) =>
      values[f.key] !== undefined &&
      values[f.key] !== ""
  ).length;

  const progress =
    (filled / ALL_FIELDS.length) * 100;

  return (
    <>
      <Topbar
        title="Prediction workspace"
        backendOnline={backendOnline}
      />

      {/* PAGE INTRO */}
      <div className="prediction-header">
        <div>
          <span className="eyebrow">
            STUDENT PROFILE
          </span>

          <h2>Performance assessment</h2>

          <p>
            Complete the student profile below. Provide as much
            information as available for a more informative
            prediction.
          </p>
        </div>

        <div className="completion-pill">
          <strong>
            {filled}/{ALL_FIELDS.length}
          </strong>

          <span>fields completed</span>
        </div>
      </div>

      {/* STUDENT IDENTITY */}
      <div className="profile-card">
        <div className="profile-title">
          <div className="section-icon">
            👤
          </div>

          <div>
            <span className="eyebrow">
              IDENTITY
            </span>

            <h3>Student information</h3>
          </div>

          <span className="optional">
            OPTIONAL
          </span>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter student name or ID"
        />
      </div>

      {/* OVERALL PROGRESS */}
      <div className="progress-card">
        <div>
          <strong>Profile completion</strong>

          <span>
            {filled} of {ALL_FIELDS.length} variables
          </span>
        </div>

        <div className="big-progress">
          <div
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <small>
          You need at least {MIN_FIELDS} fields for a
          prediction.
        </small>
      </div>

      {/* SECTION NAVIGATION */}
      <div className="section-tabs">
        {SECTIONS.map((section) => {
          const sectionFilled =
            section.fields.filter(
              (f) =>
                values[f.key] !== undefined &&
                values[f.key] !== ""
            ).length;

          const sectionId = section.title
            .toLowerCase()
            .replaceAll(" ", "-");

          return (
            <a
              href={`#${sectionId}`}
              key={section.title}
            >
              <span>{section.icon}</span>

              {section.title}

              <b>
                {sectionFilled}/
                {section.fields.length}
              </b>
            </a>
          );
        })}
      </div>

      {/* ------------------------------------------------
          THE COMPLETE APPLICATION FORM
      ------------------------------------------------ */}

      <div className="full-form-area">
        {SECTIONS.map((section) => {
          const sectionId = section.title
            .toLowerCase()
            .replaceAll(" ", "-");

          return (
            <section
              className="input-section"
              id={sectionId}
              key={section.title}
            >
              <div className="input-section-heading">
                <div className="section-icon">
                  {section.icon}
                </div>

                <div>
                  <span className="eyebrow">
                    {section.title.toUpperCase()}
                  </span>

                  <h2>{section.title}</h2>

                  <p>
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="fields-grid">
                {section.fields.map((field) => (
                  <FieldCard
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    onChange={(key, value) =>
                      setValues((prev) => ({
                        ...prev,
                        [key]: value,
                      }))
                    }
                    invalid={invalidFields.includes(
                      field.key
                    )}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ------------------------------------------------
          RUN PREDICTION — NOW AFTER ALL 18 INPUTS
      ------------------------------------------------ */}

      <PredictionActionCard
        filled={filled}
        progress={progress}
        loading={loading}
        backendOnline={backendOnline}
        error={error}
        onPredict={onPredict}
        onReset={onReset}
      />

      {/* RESULT */}
      {result && (
        <section
          className="result-section"
          id="prediction-result"
        >
          <div className="result-section-heading">
            <span className="eyebrow">
              MODEL OUTPUT
            </span>

            <h2>Prediction result</h2>

            <p className="muted">
              The class with the highest model probability is
              displayed as the final prediction.
            </p>
          </div>

          <PredictionResult
            result={result}
            onFeedback={onFeedback}
            onNew={onReset}
          />
        </section>
      )}

      {/* FEEDBACK */}
      {result && (
        <FeedbackSection
          feedback={result.feedback}
          name={name}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------
   MAIN APP
------------------------------------------------------- */

export default function App() {
  const [user, setUser] = useState(getStoredUser);

  const [page, setPage] = useState("dashboard");

  const [name, setName] = useState("");

  const [values, setValues] = useState({});

  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [backendOnline, setBackendOnline] =
    useState(false);

  const [invalidFields, setInvalidFields] =
    useState([]);

  /* ---------------------------------------------------
     LOAD USER HISTORY
  --------------------------------------------------- */

  useEffect(() => {
    if (!user) return;

    try {
      setHistory(
        JSON.parse(
          localStorage.getItem(
            `studentai_history_${user.email}`
          ) || "[]"
        )
      );
    } catch {
      setHistory([]);
    }
  }, [user]);

  /* ---------------------------------------------------
     BACKEND HEALTH CHECK
  --------------------------------------------------- */

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch(HEALTH_URL);

        setBackendOnline(response.ok);
      } catch {
        setBackendOnline(false);
      }
    };

    check();

    const timer = setInterval(check, 15000);

    return () => clearInterval(timer);
  }, []);

  /* ---------------------------------------------------
     RESET
  --------------------------------------------------- */

  const resetForm = () => {
    setName("");
    setValues({});
    setResult(null);
    setError("");
    setInvalidFields([]);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ---------------------------------------------------
     LOGOUT
  --------------------------------------------------- */

  const logout = () => {
    localStorage.removeItem("studentai_session");

    setUser(null);

    resetForm();

    setPage("dashboard");
  };

  /* ---------------------------------------------------
     VALIDATION
  --------------------------------------------------- */

  const filled = useMemo(
    () =>
      ALL_FIELDS.filter(
        (f) =>
          values[f.key] !== undefined &&
          values[f.key] !== ""
      ).length,
    [values]
  );

  const validate = () => {
    const invalid = [];

    for (const field of ALL_FIELDS) {
      const raw = values[field.key];

      if (
        raw === undefined ||
        raw === "" ||
        field.type === "select"
      ) {
        continue;
      }

      const number = Number(raw);

      if (
        !Number.isFinite(number) ||
        number < field.min ||
        number > field.max
      ) {
        invalid.push(field.key);
      }
    }

    setInvalidFields(invalid);

    if (invalid.length) {
      setError(
        "Please correct the highlighted values before predicting."
      );

      return false;
    }

    if (filled < MIN_FIELDS) {
      setError(
        `Please fill at least ${MIN_FIELDS} fields.`
      );

      return false;
    }

    return true;
  };

  /* ---------------------------------------------------
     PREDICT
  --------------------------------------------------- */

  const predict = async () => {
    if (!validate()) return;

    setLoading(true);
    setError("");
    setResult(null);

    const payload = {};

    ALL_FIELDS.forEach((field) => {
      const value = values[field.key];

      payload[field.key] =
        value === undefined || value === ""
          ? null
          : field.type === "select"
          ? value
          : Number(value);
    });

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Server error (${response.status})`
        );
      }

      setResult(data);

      const confidence = (
        (data.probabilities?.[data.label] || 0) *
        100
      ).toFixed(1);

      const item = {
        name:
          name.trim() || "Unnamed student",
        label: data.label,
        confidence,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setHistory((previous) => {
        const next = [item, ...previous].slice(0, 8);

        localStorage.setItem(
          `studentai_history_${user.email}`,
          JSON.stringify(next)
        );

        return next;
      });

      setTimeout(() => {
        document
          .getElementById("prediction-result")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 150);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Could not reach the prediction server. Make sure Flask is running on port 5000."
          : e.message
      );

      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------
     FEEDBACK SCROLL
  --------------------------------------------------- */

  const scrollFeedback = () => {
    setTimeout(() => {
      document
        .getElementById("feedback")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  };

  /* ---------------------------------------------------
     AUTH GATE
  --------------------------------------------------- */

  if (!user) {
    return (
      <AuthPage
        onLogin={(session) => {
          setUser(session);
          setPage("dashboard");
        }}
      />
    );
  }

  /* ---------------------------------------------------
     APPLICATION
  --------------------------------------------------- */

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        user={user}
        onLogout={logout}
        backendOnline={backendOnline}
      />

      <main className="main-content">
        {page === "dashboard" ? (
          <DashboardHome
            user={user}
            history={history}
            backendOnline={backendOnline}
            setPage={setPage}
            onReset={resetForm}
          />
        ) : (
          <PredictionPage
            name={name}
            setName={setName}
            values={values}
            setValues={setValues}
            result={result}
            loading={loading}
            error={error}
            onPredict={predict}
            onReset={resetForm}
            onFeedback={scrollFeedback}
            invalidFields={invalidFields}
            backendOnline={backendOnline}
          />
        )}

        <footer className="footer">
          <strong>StudentAI</strong>

          <span>
            AI-Based Student Performance Prediction System
          </span>

          <span>
            React · Flask · XGBoost
          </span>

          <span>© 2026</span>
        </footer>

        <p className="disclaimer">
          Predictions are decision-support outputs from the
          trained model. They should not be treated as a
          definitive assessment of a student's academic
          ability.
        </p>
      </main>
    </div>
  );
}