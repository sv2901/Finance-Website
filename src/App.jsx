import { useMemo, useState } from "react";

const SAMPLE_QUESTIONS = [
  {
    id: "gmat-01",
    title: "GMAT Quant: Data Sufficiency - Rates",
    source: "Modeled after Manhattan Prep",
    difficulty: "Medium",
    topic: "Work & Rates",
    prompt:
      "A project takes 12 days with Team A and 18 days with Team B. How long will it take if both teams work together?"
  },
  {
    id: "cat-01",
    title: "CAT VARC: Critical Reasoning",
    source: "Inspired by TIME/IMS",
    difficulty: "Hard",
    topic: "Assumptions",
    prompt:
      "Identify the assumption in the argument about renewable energy subsidies and industrial growth."
  },
  {
    id: "gmat-02",
    title: "GMAT Integrated Reasoning",
    source: "Inspired by GMAT Club",
    difficulty: "Medium",
    topic: "Multi-Source Reasoning",
    prompt:
      "Evaluate which investment option meets the portfolio constraints based on the exhibits."
  }
];

const SAMPLE_BLOGS = [
  {
    id: "cfa-01",
    title: "CFA Equity Valuation: From FCFF to Price Targets",
    source: "Case style seen on Wall Street Prep",
    readTime: "6 min read",
    summary:
      "Walk through a compact FCFF model, build the bridge to equity value, and map it to a target price."
  },
  {
    id: "cfa-02",
    title: "Fixed Income Curve Strategies for Level II",
    source: "Adapted from Kaplan-style notes",
    readTime: "8 min read",
    summary:
      "Compare bullet, barbell, and ladder strategies with a CFA-style scenario table."
  },
  {
    id: "mba-01",
    title: "MBA Finance Insight: Deal Structuring Cheat Sheet",
    source: "Inspired by MBB interview prep blogs",
    readTime: "5 min read",
    summary:
      "A one-page breakdown of purchase price allocation, earn-outs, and sensitivity levers."
  }
];

const highlights = [
  {
    label: "Question Bank",
    value: "450+",
    detail: "GMAT/CAT quant + verbal sets"
  },
  {
    label: "CFA Insight Notes",
    value: "120",
    detail: "Level I-III study guides"
  },
  {
    label: "Mock Scores",
    value: "94th %ile",
    detail: "Top percentile targets"
  }
];

export default function App() {
  const [adminId, setAdminId] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [questionList, setQuestionList] = useState(SAMPLE_QUESTIONS);
  const [blogList, setBlogList] = useState(SAMPLE_BLOGS);
  const [questionForm, setQuestionForm] = useState({
    title: "",
    topic: "",
    difficulty: "",
    prompt: "",
    source: ""
  });
  const [blogForm, setBlogForm] = useState({
    title: "",
    summary: "",
    readTime: "",
    source: ""
  });

  const canLogin = useMemo(() => adminId.trim() && adminPin.trim(), [adminId, adminPin]);

  const handleAdminLogin = (event) => {
    event.preventDefault();
    if (!canLogin) return;
    setIsAdmin(true);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setAdminId("");
    setAdminPin("");
  };

  const handleQuestionChange = (event) => {
    const { name, value } = event.target;
    setQuestionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlogChange = (event) => {
    const { name, value } = event.target;
    setBlogForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = questionForm.title.trim();
    if (!trimmedTitle) return;
    setQuestionList((prev) => [
      {
        id: `custom-${Date.now()}`,
        title: trimmedTitle,
        topic: questionForm.topic || "General",
        difficulty: questionForm.difficulty || "Mixed",
        prompt: questionForm.prompt || "",
        source: questionForm.source || "Admin upload"
      },
      ...prev
    ]);
    setQuestionForm({ title: "", topic: "", difficulty: "", prompt: "", source: "" });
  };

  const handleBlogSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = blogForm.title.trim();
    if (!trimmedTitle) return;
    setBlogList((prev) => [
      {
        id: `blog-${Date.now()}`,
        title: trimmedTitle,
        summary: blogForm.summary || "",
        readTime: blogForm.readTime || "5 min read",
        source: blogForm.source || "Admin upload"
      },
      ...prev
    ]);
    setBlogForm({ title: "", summary: "", readTime: "", source: "" });
  };

  return (
    <div className="page">
      <header className="hero">
        <nav className="nav">
          <span className="logo">Finance MBA Prep Hub</span>
          <div className="nav-links">
            <a href="#question-bank">Question Bank</a>
            <a href="#insights">CFA Insights</a>
            <a href="#admin">Admin</a>
          </div>
          {isAdmin ? (
            <button className="btn ghost" onClick={handleLogout} type="button">
              Log out
            </button>
          ) : (
            <span className="chip">Admin mode off</span>
          )}
        </nav>

        <div className="hero-grid">
          <div>
            <p className="eyebrow">Designed for Finance MBAs</p>
            <h1>
              GMAT/CAT prep and CFA curriculum insights in one
              collaborative forum.
            </h1>
            <p className="subtitle">
              Curated question sets inspired by top prep platforms, plus weekly finance blogs,
              valuation templates, and CFA-style notes.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="#question-bank">
                Explore Question Bank
              </a>
              <a className="btn secondary" href="#insights">
                Read CFA Insights
              </a>
            </div>
          </div>
          <div className="hero-card">
            <h3>Prep Snapshot</h3>
            <ul>
              {highlights.map((item) => (
                <li key={item.label}>
                  <div>
                    <p className="metric">{item.value}</p>
                    <p className="metric-label">{item.label}</p>
                  </div>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
            <div className="hero-footer">
              <span className="pill">GMAT Focus</span>
              <span className="pill">CAT 2024</span>
              <span className="pill">CFA Level I-III</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="question-bank" className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">GMAT/CAT Question Bank</p>
              <h2>Curated sets inspired by leading prep platforms</h2>
              <p className="section-subtitle">
                Pulls inspiration from Manhattan Prep, GMAT Club, TIME/IMS and
                Magoosh-style approaches for quant, verbal, and integrated reasoning.
              </p>
            </div>
            <div className="tag-list">
              <span className="tag">Data Sufficiency</span>
              <span className="tag">VARC</span>
              <span className="tag">LRDI</span>
              <span className="tag">Integrated Reasoning</span>
            </div>
          </div>

          <div className="grid">
            {questionList.map((question) => (
              <article key={question.id} className="card">
                <header>
                  <p className="card-tag">{question.topic}</p>
                  <h3>{question.title}</h3>
                  <p className="card-meta">
                    {question.source} • {question.difficulty}
                  </p>
                </header>
                <p className="card-body">{question.prompt}</p>
                <button className="btn ghost" type="button">
                  Add to practice set
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="insights" className="section alt">
          <div className="section-header">
            <div>
              <p className="eyebrow">Finance Blogs & CFA Insights</p>
              <h2>Weekly valuation notes and CFA-style concept briefs</h2>
              <p className="section-subtitle">
                Blend MBA finance takes with structured CFA curriculum summaries.
              </p>
            </div>
            <div className="tag-list">
              <span className="tag">Equity Valuation</span>
              <span className="tag">Fixed Income</span>
              <span className="tag">Portfolio Mgmt</span>
            </div>
          </div>

          <div className="grid two-col">
            {blogList.map((blog) => (
              <article key={blog.id} className="card blog">
                <header>
                  <h3>{blog.title}</h3>
                  <p className="card-meta">
                    {blog.source} • {blog.readTime}
                  </p>
                </header>
                <p className="card-body">{blog.summary}</p>
                <button className="btn ghost" type="button">
                  Read full insight
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="admin" className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Admin Upload</p>
              <h2>Fast uploads for your personal content library</h2>
              <p className="section-subtitle">
                Use a simple admin ID to add new questions and blog insights in seconds.
              </p>
            </div>
            <div className="admin-status">
              <span className={isAdmin ? "status active" : "status"}>
                {isAdmin ? "Admin authenticated" : "Admin access required"}
              </span>
              <p className="helper">
                Demo mode: enter any admin ID + PIN to unlock uploads.
              </p>
            </div>
          </div>

          <div className="admin-grid">
            <form className="card" onSubmit={handleAdminLogin}>
              <h3>Admin Login</h3>
              <label>
                Admin ID
                <input
                  type="text"
                  value={adminId}
                  onChange={(event) => setAdminId(event.target.value)}
                  placeholder="e.g. mba-admin"
                />
              </label>
              <label>
                PIN
                <input
                  type="password"
                  value={adminPin}
                  onChange={(event) => setAdminPin(event.target.value)}
                  placeholder="••••"
                />
              </label>
              <button className="btn primary" type="submit" disabled={!canLogin}>
                Enable admin mode
              </button>
            </form>

            <form className="card" onSubmit={handleQuestionSubmit}>
              <h3>Upload GMAT/CAT Question</h3>
              <label>
                Title
                <input
                  type="text"
                  name="title"
                  value={questionForm.title}
                  onChange={handleQuestionChange}
                  placeholder="GMAT Quant: Geometry shortcut"
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Topic
                <input
                  type="text"
                  name="topic"
                  value={questionForm.topic}
                  onChange={handleQuestionChange}
                  placeholder="Geometry"
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Difficulty
                <input
                  type="text"
                  name="difficulty"
                  value={questionForm.difficulty}
                  onChange={handleQuestionChange}
                  placeholder="Easy / Medium / Hard"
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Prompt
                <textarea
                  name="prompt"
                  value={questionForm.prompt}
                  onChange={handleQuestionChange}
                  placeholder="Enter the question prompt..."
                  rows={4}
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Source Inspiration
                <input
                  type="text"
                  name="source"
                  value={questionForm.source}
                  onChange={handleQuestionChange}
                  placeholder="Inspired by Manhattan Prep"
                  disabled={!isAdmin}
                />
              </label>
              <button className="btn secondary" type="submit" disabled={!isAdmin}>
                Publish question
              </button>
            </form>

            <form className="card" onSubmit={handleBlogSubmit}>
              <h3>Upload Finance Blog / CFA Insight</h3>
              <label>
                Title
                <input
                  type="text"
                  name="title"
                  value={blogForm.title}
                  onChange={handleBlogChange}
                  placeholder="CFA Level II: Equity multipliers"
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Summary
                <textarea
                  name="summary"
                  value={blogForm.summary}
                  onChange={handleBlogChange}
                  placeholder="Quick summary to show on the card..."
                  rows={4}
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Read time
                <input
                  type="text"
                  name="readTime"
                  value={blogForm.readTime}
                  onChange={handleBlogChange}
                  placeholder="6 min read"
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Source Inspiration
                <input
                  type="text"
                  name="source"
                  value={blogForm.source}
                  onChange={handleBlogChange}
                  placeholder="Inspired by CFA curriculum"
                  disabled={!isAdmin}
                />
              </label>
              <button className="btn secondary" type="submit" disabled={!isAdmin}>
                Publish insight
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <h3>Finance MBA Prep Hub</h3>
          <p>
            A personal dashboard for MBA admissions prep, exam readiness, and CFA-aligned
            study notes.
          </p>
        </div>
        <div>
          <p className="footer-title">Quick Links</p>
          <ul>
            <li>
              <a href="#question-bank">Question Bank</a>
            </li>
            <li>
              <a href="#insights">CFA Insights</a>
            </li>
            <li>
              <a href="#admin">Admin Upload</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="footer-title">Contact</p>
          <p>Email: you@example.com</p>
          <p>LinkedIn: /in/finance-mba</p>
        </div>
      </footer>
    </div>
  );
}
