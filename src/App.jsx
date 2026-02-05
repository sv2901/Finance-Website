import { useEffect, useMemo, useState } from "react";

const SAMPLE_QUESTIONS = [
  {
    id: "gmat-01",
    title: "CASE 01 — Rate Optimization",
    source: "Complexity:",
    difficulty: "Moderate",
    topic: "CASE STUDY",
    prompt:
      "Two teams operating at different execution speeds must be deployed efficiently to minimize total project time.",
    articleUrl: "https://gmatclub.com/forum/",
    videoUrl: "https://www.youtube.com/watch?v=H14bBuluwB8"
  },
  {
    id: "cat-01",
    title: "CASE 02 — Argument Deconstruction",
    source: "Complexity:",
    difficulty: "Advanced",
    topic: "CASE STUDY",
    prompt:
      "Identify the assumption in the argument about renewable energy subsidies and industrial growth.",
    articleUrl: "https://www.mba.com/exams/gmat-focus",
    videoUrl: "https://www.youtube.com/watch?v=3PjE9b0gQKk"
  },
  {
    id: "gmat-02",
    title: "CASE 03 — Portfolio Decision Framework",
    source: "Complexity:",
    difficulty: "Moderate",
    topic: "CASE STUDY",
    prompt:
      "Evaluate which investment option meets the portfolio constraints based on the exhibits.",
    articleUrl: "https://www.imsindia.com/blog/cat/",
    videoUrl: "https://www.youtube.com/watch?v=1M7S7t5b1AI"
  }
];

const SAMPLE_BLOGS = [
  {
    id: "cfa-01",
    title: "CFA Equity Valuation: From FCFF to Price Targets",
    source: "Case style seen on Wall Street Prep",
    readTime: "6 min read",
    summary:
      "Walk through a compact FCFF model, build the bridge to equity value, and map it to a target price.",
    articleUrl: "https://www.cfainstitute.org/en/programs/cfa/curriculum",
    videoUrl: "https://www.youtube.com/watch?v=QuMZw2m7A1g"
  },
  {
    id: "cfa-02",
    title: "Fixed Income Curve Strategies for Level II",
    source: "Adapted from Kaplan-style notes",
    readTime: "8 min read",
    summary:
      "Compare bullet, barbell, and ladder strategies with a CFA-style scenario table.",
    articleUrl: "https://www.cfainstitute.org/en/programs/cfa/exam",
    videoUrl: "https://www.youtube.com/watch?v=dm8kKVOwL1g"
  },
  {
    id: "mba-01",
    title: "MBA Finance Insight: Deal Structuring Cheat Sheet",
    source: "Inspired by MBB interview prep blogs",
    readTime: "5 min read",
    summary:
      "A one-page breakdown of purchase price allocation, earn-outs, and sensitivity levers.",
    articleUrl: "https://www.wallstreetprep.com/blog/",
    videoUrl: "https://www.youtube.com/watch?v=Q7U5I1qI_9o"
  }
];

const highlights = [
  {
    label: "Daily Learnings",
    value: "GMAT + CFA",
    detail:
      "Structured preparation and concept reinforcement. Clear explanations designed for deep understanding"
  },
  {
    label: "Finance Projects",
    value: "DCF • Valuation • Modeling",
    detail: "Practical work showcasing real financial skills"
  },
  {
    label: "B-School Research",
    value: "Strategic Targeting",
    detail: "Insights on programs, scores, and career paths"
  },
  {
    label: "Personal Finance",
    value: "Wealth Thinking",
    detail: "Frameworks for long-term financial intelligence"
  }
];

const STORAGE_KEY = "finance-mba-content";

const normalizeUrl = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
};

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
    source: "",
    articleUrl: "",
    videoUrl: ""
  });
  const [blogForm, setBlogForm] = useState({
    title: "",
    summary: "",
    readTime: "",
    source: "",
    articleUrl: "",
    videoUrl: ""
  });

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  const canLogin = useMemo(() => adminId.trim() && adminPin.trim(), [adminId, adminPin]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.questions?.length) setQuestionList(parsed.questions);
      if (parsed?.blogs?.length) setBlogList(parsed.blogs);
    } catch (error) {
      console.error("Failed to parse saved content", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        questions: questionList,
        blogs: blogList
      })
    );
  }, [questionList, blogList]);

  const handleAdminLogin = (event) => {
    event.preventDefault();
    if (!canLogin) return;
    if (adminEmail && adminPassword) {
      if (adminId.trim() === adminEmail && adminPin === adminPassword) {
        setIsAdmin(true);
      }
      return;
    }
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
        source: questionForm.source || "Admin upload",
        articleUrl: normalizeUrl(questionForm.articleUrl),
        videoUrl: normalizeUrl(questionForm.videoUrl)
      },
      ...prev
    ]);
    setQuestionForm({
      title: "",
      topic: "",
      difficulty: "",
      prompt: "",
      source: "",
      articleUrl: "",
      videoUrl: ""
    });
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
        source: blogForm.source || "Admin upload",
        articleUrl: normalizeUrl(blogForm.articleUrl),
        videoUrl: normalizeUrl(blogForm.videoUrl)
      },
      ...prev
    ]);
    setBlogForm({
      title: "",
      summary: "",
      readTime: "",
      source: "",
      articleUrl: "",
      videoUrl: ""
    });
  };

  return (
    <div className="page">
      <header className="hero">
        <nav className="nav">
          <span className="logo">Satya Varta | Finance</span>
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
            <p className="eyebrow">ENGINEER → FINANCE</p>
            <h1>Becoming a Finance Professional - One Concept at a Time.</h1>
            <p className="subtitle">
              Documenting my transition into finance through rigorous learning, CFA
              preparation, GMAT strategy, and hands-on financial projects.
            </p>

            <div className="cta-row">
              <a className="btn primary" href="#question-bank">
                Explore Case Studies
              </a>
              <a className="btn secondary" href="#insights">
                Read CFA Insights
              </a>
            </div>
          </div>
          <div className="hero-card">
            <h3>What You&apos;ll Find Here</h3>
            <div className="highlights-grid">
              {highlights.map((item) => (
                <div key={item.label} className="highlight-card">
                  <h3>{item.value}</h3>
                  <p className="label">{item.label}</p>
                  <p className="detail">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="hero-footer">
              <span className="pill">GMAT Focus</span>
              <span className="pill">CAT</span>
              <span className="pill">CFA Level I</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="question-bank" className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">APPLIED THINKING</p>
              <h2>Building Analytical Depth — One Case at a Time</h2>
              <p className="section-subtitle">
                A growing collection of quantitative, logical, and financial cases designed
                to strengthen structured thinking.
              </p>
            </div>
            <div className="tag-list">
              <span className="tag">Quantitative Reasoning</span>
              <span className="tag">Critical Reasoning</span>
              <span className="tag">Decision Making</span>
              <span className="tag">Financial Analysis</span>
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
                <div className="card-actions">
                  {question.articleUrl && (
                    <a
                      className="btn ghost"
                      href={question.articleUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read article
                    </a>
                  )}
                  {question.videoUrl && (
                    <a
                      className="btn ghost"
                      href={question.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch video
                    </a>
                  )}
                </div>
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
                <div className="card-actions">
                  {blog.articleUrl && (
                    <a
                      className="btn ghost"
                      href={blog.articleUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read article
                    </a>
                  )}
                  {blog.videoUrl && (
                    <a
                      className="btn ghost"
                      href={blog.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch video
                    </a>
                  )}
                </div>
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
                Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in .env.local to enforce
                credentials.
              </p>
            </div>
          </div>

          <div className="admin-grid">
            <form className="card" onSubmit={handleAdminLogin}>
              <h3>Admin Login</h3>
              <label>
                Admin Email
                <input
                  type="email"
                  value={adminId}
                  onChange={(event) => setAdminId(event.target.value)}
                  placeholder="e.g. you@example.com"
                />
              </label>
              <label>
                Password
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
                Article link
                <input
                  type="text"
                  name="articleUrl"
                  value={questionForm.articleUrl}
                  onChange={handleQuestionChange}
                  placeholder="https://"
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Video link (optional)
                <input
                  type="text"
                  name="videoUrl"
                  value={questionForm.videoUrl}
                  onChange={handleQuestionChange}
                  placeholder="https://"
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
                Article link
                <input
                  type="text"
                  name="articleUrl"
                  value={blogForm.articleUrl}
                  onChange={handleBlogChange}
                  placeholder="https://"
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Video link (optional)
                <input
                  type="text"
                  name="videoUrl"
                  value={blogForm.videoUrl}
                  onChange={handleBlogChange}
                  placeholder="https://"
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
          <h3>Satya Varta | Finance</h3>
          <p>A personal dashboard for journey documentation ENGINEER → FINANCE</p>
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
          <p>
            Email:{" "}
            <a href="mailto:svgupta4@gmail.com">Satya Varta</a>
          </p>
          <p>
            LinkedIn:{" "}
            <a
              href="https://www.linkedin.com/in/satya-varta-19516b214/"
              target="_blank"
              rel="noreferrer"
            >
              Satya Varta
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
