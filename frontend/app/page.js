"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_API = "http://localhost:8000";
const TARGET_URL = "http://localhost:3000";

export default function Home() {
  const [testPanelVisible, setTestPanelVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    const cookie = document.cookie.split("; ").find(c => c.startsWith("hidePanelTest="));
    return !cookie;
  });

  const [testContentVisible, setTestContentVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    const cookie = document.cookie.split("; ").find(c => c.startsWith("hideContentTest="));
    return !cookie;
  });

  const [status, setStatus] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API;
  }, []);

  useEffect(() => {
    const panelCookie = document.cookie.split("; ").find(c => c.startsWith("hidePanelTest="));
    const contentCookie = document.cookie.split("; ").find(c => c.startsWith("hideContentTest="));
    setTestPanelVisible(!panelCookie);
    setTestContentVisible(!contentCookie);
  }, []);

  async function checkStructure() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: TARGET_URL,
          selector: ".test-content"
        })
      });

      if (!response.ok) {
        throw new Error("Check failed");
      }

      const data = await response.json();
      setStatus(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError("Failed to check structure");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStructure();
    const interval = setInterval(checkStructure, 60000);
    return () => clearInterval(interval);
  }, []);

  function setCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
  }

  function toggleTestPanel() {
    const newState = !testPanelVisible;
    if (newState) {
      document.cookie = "hidePanelTest=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    } else {
      setCookie("hidePanelTest", "true");
    }
    setTestPanelVisible(newState);
  }

  function toggleTestContent() {
    const newState = !testContentVisible;
    if (newState) {
      document.cookie = "hideContentTest=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    } else {
      setCookie("hideContentTest", "true");
    }
    setTestContentVisible(newState);
  }

  function resetTestPanel() {
    document.cookie = "hidePanelTest=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    document.cookie = "hideContentTest=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    setTestPanelVisible(true);
    setTestContentVisible(true);
  }

  return (
    <main className="page simple">
      <section className="status-section">
        <div className="status-card">
          <h1>Structure Monitor</h1>
          <p className="target">Monitoring: <code>{TARGET_URL}</code></p>

          <div className="status-display">
            {status ? (
              <>
                <div className={`status-badge ${status.changed ? "changed" : "stable"}`}>
                  {status.changed ? "⚠️ CHANGED" : "✓ STABLE"}
                </div>
                <p className="status-message">{status.message}</p>
                <div className="status-details">
                  <div>
                    <span>Current Hash:</span>
                    <code>{status.current_hash?.slice(0, 12)}...</code>
                  </div>
                  <div>
                    <span>Last Checked:</span>
                    <span>{lastChecked}</span>
                  </div>
                </div>
              </>
            ) : (
              <p>Loading initial check...</p>
            )}
          </div>

          <button 
            onClick={checkStructure} 
            disabled={loading}
            className="check-btn"
          >
            {loading ? "Checking..." : "Check Now"}
          </button>

          {error && <p className="error">{error}</p>}
        </div>
      </section>

      <section className="test-section">
        <div className="test-card">
          <h2>🧪 Test Controls</h2>
          <p>Toggle elements below to change the DOM structure.</p>
          <p className="auto-check">Auto-checks every 60 seconds</p>

          <div className="test-controls">
            <button 
              type="button" 
              className={testPanelVisible ? "test-btn active" : "test-btn"}
              onClick={toggleTestPanel}
            >
              {testPanelVisible ? "✓" : "✗"} Panel Visible
            </button>
            <button 
              type="button" 
              className={testContentVisible ? "test-btn active" : "test-btn"}
              onClick={toggleTestContent}
            >
              {testContentVisible ? "✓" : "✗"} Content Visible
            </button>
            <button 
              type="button" 
              className="test-btn reset"
              onClick={resetTestPanel}
            >
              Reset All
            </button>
          </div>

          {testPanelVisible && (
            <div className="test-content">
              <div className="test-section-item">
                <h3>Test Section A</h3>
                <p>Always visible test element.</p>
              </div>
              {testContentVisible && (
                <div className="test-section-item">
                  <h3>Test Section B</h3>
                  <p>Toggle "Content Visible" to hide/show this section.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
