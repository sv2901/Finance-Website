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
    solutionText:
      "Combine the team rates (1/12 + 1/18 = 5/36) to get a total rate of 5/36 per day, so the job finishes in 36/5 ≈ 7.2 days.",
    solutionImage:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
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
    solutionText:
      "Focus on the missing link: the argument assumes subsidy-driven cost reductions translate directly into private investment and job growth.",
    solutionImage:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
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
    solutionText:
      "Rank each option by return, then eliminate those breaching the volatility cap. The remaining option meets the liquidity and duration targets.",
    solutionImage:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
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
    solutionText:
      "The solution builds FCFF from EBITDA, subtracts capex and working capital, discounts at WACC, and then bridges to equity by subtracting net debt.",
    solutionImage:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/watch?v=QuMZw2m7A1g"
  },
  {
    id: "cfa-02",
    title: "Fixed Income Curve Strategies for Level II",
    source: "Adapted from Kaplan-style notes",
    readTime: "8 min read",
    summary:
      "Compare bullet, barbell, and ladder strategies with a CFA-style scenario table.",
    solutionText:
      "Use the scenario matrix: barbell outperforms in volatile curves, ladder provides steady reinvestment, and bullet aligns with a single liability date.",
    solutionImage:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/watch?v=dm8kKVOwL1g"
  },
  {
    id: "mba-01",
    title: "MBA Finance Insight: Deal Structuring Cheat Sheet",
    source: "Inspired by MBB interview prep blogs",
    readTime: "5 min read",
    summary:
      "A one-page breakdown of purchase price allocation, earn-outs, and sensitivity levers.",
    solutionText:
      "Start with headline value, adjust for working capital, then layer earn-out triggers and define downside protections through escrow or seller notes.",
    solutionImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
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

const createEmptyQuestionForm = () => ({
  title: "",
  topic: "",
  difficulty: "",
  prompt: "",
  solutionText: "",
  solutionImage: "",
  videoUrl: ""
});

const createEmptyBlogForm = () => ({
  title: "",
  summary: "",
  readTime: "",
  solutionText: "",
  solutionImage: "",
  videoUrl: ""
});

export default function App() {
  const [adminId, setAdminId] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [questionList, setQuestionList] = useState(SAMPLE_QUESTIONS);
  const [blogList, setBlogList] = useState(SAMPLE_BLOGS);
  const [questionForm, setQuestionForm] = useState(createEmptyQuestionForm());
  const [blogForm, setBlogForm] = useState(createEmptyBlogForm());
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [solutionView, setSolutionView] = useState(null);
  const [showSolutionDetail, setShowSolutionDetail] = useState(false);
  const [questionStartIndex, setQuestionStartIndex] = useState(0);
  const [blogStartIndex, setBlogStartIndex] = useState(0);

  const adminEmail = "svgupta4@gmail.com";
  const adminPassword = "JMg9Yd@2";

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
    if (adminId.trim() === adminEmail && adminPin === adminPassword) {
      setIsAdmin(true);
      setLoginError("");
    } else {
      setIsAdmin(false);
      setLoginError("Access denied. Please check the admin email and password.");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setAdminId("");
    setAdminPin("");
    setLoginError("");
    setEditingQuestionId(null);
    setEditingBlogId(null);
  };

  const handleQuestionChange = (event) => {
    const { name, value } = event.target;
    setQuestionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlogChange = (event) => {
    const { name, value } = event.target;
    setBlogForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetQuestionForm = () => {
    setQuestionForm(createEmptyQuestionForm());
    setEditingQuestionId(null);
  };

  const resetBlogForm = () => {
    setBlogForm(createEmptyBlogForm());
    setEditingBlogId(null);
  };

  const handleQuestionSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = questionForm.title.trim();
    if (!trimmedTitle) return;
    const payload = {
      id: editingQuestionId ?? `custom-${Date.now()}`,
      title: trimmedTitle,
      topic: questionForm.topic || "General",
      difficulty: questionForm.difficulty || "Mixed",
      prompt: questionForm.prompt || "",
      source: "Complexity:",
      solutionText: questionForm.solutionText || "",
      solutionImage: normalizeUrl(questionForm.solutionImage),
      videoUrl: normalizeUrl(questionForm.videoUrl)
    };
    if (editingQuestionId) {
      setQuestionList((prev) => prev.map((item) => (item.id === editingQuestionId ? payload : item)));
    } else {
      setQuestionList((prev) => [payload, ...prev]);
    }
    resetQuestionForm();
  };

  const handleBlogSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = blogForm.title.trim();
    if (!trimmedTitle) return;
    const payload = {
      id: editingBlogId ?? `blog-${Date.now()}`,
      title: trimmedTitle,
      summary: blogForm.summary || "",
      readTime: blogForm.readTime || "5 min read",
      source: "Admin upload",
      solutionText: blogForm.solutionText || "",
      solutionImage: normalizeUrl(blogForm.solutionImage),
      videoUrl: normalizeUrl(blogForm.videoUrl)
    };
    if (editingBlogId) {
      setBlogList((prev) => prev.map((item) => (item.id === editingBlogId ? payload : item)));
    } else {
      setBlogList((prev) => [payload, ...prev]);
    }
    resetBlogForm();
  };

  const handleEditQuestion = (question) => {
    setEditingQuestionId(question.id);
    setQuestionForm({
      title: question.title,
      topic: question.topic,
      difficulty: question.difficulty,
      prompt: question.prompt,
      solutionText: question.solutionText || "",
      solutionImage: question.solutionImage || "",
      videoUrl: question.videoUrl || ""
    });
  };

  const handleEditBlog = (blog) => {
    setEditingBlogId(blog.id);
    setBlogForm({
      title: blog.title,
      summary: blog.summary,
      readTime: blog.readTime,
      solutionText: blog.solutionText || "",
      solutionImage: blog.solutionImage || "",
      videoUrl: blog.videoUrl || ""
    });
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestionList((prev) => prev.filter((item) => item.id !== questionId));
  };

  const handleDeleteBlog = (blogId) => {
    setBlogList((prev) => prev.filter((item) => item.id !== blogId));
  };

  const handleOpenSolution = (item, type) => {
    setSolutionView({ ...item, type });
    setShowSolutionDetail(false);
  };

  const handleCloseSolution = () => {
    setSolutionView(null);
    setShowSolutionDetail(false);
  };

  const visibleCards = 3;
  const questionSlice = questionList.slice(
    questionStartIndex,
    questionStartIndex + visibleCards
  );
  const blogSlice = blogList.slice(blogStartIndex, blogStartIndex + visibleCards);

  const canScrollQuestionsLeft = questionStartIndex > 0;
  const canScrollQuestionsRight = questionStartIndex + visibleCards < questionList.length;
  const canScrollBlogsLeft = blogStartIndex > 0;
  const canScrollBlogsRight = blogStartIndex + visibleCards < blogList.length;

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

          <div className="carousel">
            <button
              className="carousel-btn"
              type="button"
              onClick={() =>
                setQuestionStartIndex((prev) => Math.max(prev - visibleCards, 0))
              }
              disabled={!canScrollQuestionsLeft}
            >
              ◀
            </button>
            <div className="carousel-track">
              {questionSlice.map((question) => (
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
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => handleOpenSolution(question, "question")}
                    >
                      Read article
                    </button>
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
                    {isAdmin && (
                      <div className="admin-actions">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => handleEditQuestion(question)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn ghost danger"
                          type="button"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <button
              className="carousel-btn"
              type="button"
              onClick={() =>
                setQuestionStartIndex((prev) =>
                  Math.min(prev + visibleCards, Math.max(questionList.length - visibleCards, 0))
                )
              }
              disabled={!canScrollQuestionsRight}
            >
              ▶
            </button>
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

          <div className="carousel">
            <button
              className="carousel-btn"
              type="button"
              onClick={() => setBlogStartIndex((prev) => Math.max(prev - visibleCards, 0))}
              disabled={!canScrollBlogsLeft}
            >
              ◀
            </button>
            <div className="carousel-track">
              {blogSlice.map((blog) => (
                <article key={blog.id} className="card blog">
                  <header>
                    <h3>{blog.title}</h3>
                    <p className="card-meta">
                      {blog.source} • {blog.readTime}
                    </p>
                  </header>
                  <p className="card-body">{blog.summary}</p>
                  <div className="card-actions">
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => handleOpenSolution(blog, "blog")}
                    >
                      Read article
                    </button>
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
                    {isAdmin && (
                      <div className="admin-actions">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => handleEditBlog(blog)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn ghost danger"
                          type="button"
                          onClick={() => handleDeleteBlog(blog.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <button
              className="carousel-btn"
              type="button"
              onClick={() =>
                setBlogStartIndex((prev) =>
                  Math.min(prev + visibleCards, Math.max(blogList.length - visibleCards, 0))
                )
              }
              disabled={!canScrollBlogsRight}
            >
              ▶
            </button>
          </div>
        </section>

        {solutionView && (
          <section className="section solution">
            <div className="solution-header">
              <div>
                <p className="eyebrow">Solution Workspace</p>
                <h2>{solutionView.title}</h2>
                <p className="section-subtitle">
                  {solutionView.type === "question" ? solutionView.prompt : solutionView.summary}
                </p>
              </div>
              <button className="btn ghost" type="button" onClick={handleCloseSolution}>
                Close
              </button>
            </div>
            <div className="solution-card">
              <p className="card-body">
                {solutionView.type === "question" ? "Question" : "Insight"} overview above.
              </p>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setShowSolutionDetail((prev) => !prev)}
              >
                {showSolutionDetail ? "Hide solution" : "See solution"}
              </button>
              {showSolutionDetail && (
                <div className="solution-detail">
                  {solutionView.solutionImage && (
                    <img
                      src={solutionView.solutionImage}
                      alt="Solution illustration"
                      className="solution-image"
                    />
                  )}
                  <p className="card-body">{solutionView.solutionText || "Add solution notes."}</p>
                  {solutionView.videoUrl && (
                    <a
                      className="btn ghost"
                      href={solutionView.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch video solution
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

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
              {loginError && <p className="login-error">{loginError}</p>}
              <button className="btn primary" type="submit" disabled={!canLogin}>
                Enable admin mode
              </button>
            </form>

            <form className="card" onSubmit={handleQuestionSubmit}>
              <div className="card-header-row">
                <h3>{editingQuestionId ? "Edit Question" : "Upload Question"}</h3>
                {editingQuestionId && (
                  <button className="btn ghost" type="button" onClick={resetQuestionForm}>
                    Cancel edit
                  </button>
                )}
              </div>
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
                Solution text
                <textarea
                  name="solutionText"
                  value={questionForm.solutionText}
                  onChange={handleQuestionChange}
                  placeholder="Write the solution steps..."
                  rows={4}
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Solution image URL (optional)
                <input
                  type="text"
                  name="solutionImage"
                  value={questionForm.solutionImage}
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
              <button className="btn secondary" type="submit" disabled={!isAdmin}>
                {editingQuestionId ? "Save changes" : "Publish question"}
              </button>
            </form>

            <form className="card" onSubmit={handleBlogSubmit}>
              <div className="card-header-row">
                <h3>{editingBlogId ? "Edit Finance Blog / CFA Insight" : "Upload Finance Blog / CFA Insight"}</h3>
                {editingBlogId && (
                  <button className="btn ghost" type="button" onClick={resetBlogForm}>
                    Cancel edit
                  </button>
                )}
              </div>
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
                Solution text
                <textarea
                  name="solutionText"
                  value={blogForm.solutionText}
                  onChange={handleBlogChange}
                  placeholder="Write the key takeaways..."
                  rows={4}
                  disabled={!isAdmin}
                />
              </label>
              <label>
                Solution image URL (optional)
                <input
                  type="text"
                  name="solutionImage"
                  value={blogForm.solutionImage}
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
              <button className="btn secondary" type="submit" disabled={!isAdmin}>
                {editingBlogId ? "Save changes" : "Publish insight"}
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
          <p>Email: svgupta4@gmail.com</p>
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
