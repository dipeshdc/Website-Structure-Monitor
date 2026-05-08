"use client";

import { useMemo, useState } from "react";

const DEFAULT_API = "http://localhost:8000";

export default function Home() {
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API;
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          selector: selector.trim() === "" ? null : selector.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Monitor request failed. Check the backend and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Website Structure Monitoring Tool</p>
          <h1>Detect HTML changes before they break workflows.</h1>
          <p className="subhead">
            Playwright + BeautifulSoup checks, validation for missing data,
            and a clean audit trail.
          </p>
        </div>
        <div className="hero-card">
          <form onSubmit={handleSubmit} className="form">
            <label>
              Target URL
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                type="url"
                placeholder="https://example.com"
                required
              />
            </label>
            <label>
              Optional CSS selector
              <input
                value={selector}
                onChange={(event) => setSelector(event.target.value)}
                type="text"
                placeholder="#main-content"
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Checking..." : "Run monitor"}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
          {result ? (
            <div className="result">
              <p className={result.changed ? "status danger" : "status safe"}>
                {result.message}
              </p>
              <div className="meta">
                <div>
                  <span>Missing data</span>
                  <strong>{result.missing_data ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span>Current hash</span>
                  <strong>{result.current_hash || "n/a"}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
