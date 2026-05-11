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

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API;
  }, []);

  useEffect(() => {
    const panelCookie = document.cookie.split("; ").find(c => c.startsWith("hidePanelTest="));
    const contentCookie = document.cookie.split("; ").find(c => c.startsWith("hideContentTest="));
    setTestPanelVisible(!panelCookie);
    setTestContentVisible(!contentCookie);
    fetchMonitors();
  }, []);

  function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/`;
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

  async function fetchMonitors() {
    try {
      const response = await fetch(`${apiBase}/monitors`);
      if (!response.ok) {
        throw new Error("Failed to load monitors");
      }
      const data = await response.json();
      setMonitors(data);
    } catch (err) {
      setError("Failed to load monitors.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/monitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url,
          selector: selector.trim() === "" ? null : selector.trim(),
          interval_minutes: Number(interval),
          enabled: true
        })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }
      setName("");
      setUrl("");
      setSelector("");
      setInterval(60);
      await fetchMonitors();
    } catch (err) {
      setError("Failed to create monitor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(monitorId, action) {
    setError("");
    try {
      const response = await fetch(`${apiBase}/monitors/${monitorId}/${action}`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Action failed");
      }
      const data = await response.json();
      setSelected(data);
      await fetchMonitors();
    } catch (err) {
      setError("Monitor action failed.");
    }
  }

  async function handleDelete(monitorId) {
    setError("");
    try {
      const response = await fetch(`${apiBase}/monitors/${monitorId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Delete failed");
      }
      setSelected(null);
      await fetchMonitors();
    } catch (err) {
      setError("Failed to delete monitor.");
    }
  }

  async function handleSelect(monitorId) {
    setError("");
    try {
      const response = await fetch(`${apiBase}/monitors/${monitorId}`);
      if (!response.ok) {
        throw new Error("Failed to load monitor");
      }
      const data = await response.json();
      setSelected(data);
    } catch (err) {
      setError("Failed to load monitor details.");
    }
  }

  async function toggleEnabled(monitor) {
    setError("");
    try {
      const response = await fetch(`${apiBase}/monitors/${monitor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !monitor.enabled })
      });
      if (!response.ok) {
        throw new Error("Update failed");
      }
      const data = await response.json();
      setSelected(data);
      await fetchMonitors();
    } catch (err) {
      setError("Failed to update monitor.");
    }
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
        <div className="hero-text">
          <p className="eyebrow">Website Structure Monitoring Tool</p>
          <h1>Structure change dashboard</h1>
          <p className="subhead">
            Create monitors, run checks, and simulate failures to validate alerts.
          </p>
        </div>
        <div className="hero-card">
          <form onSubmit={handleSubmit} className="form">
            <label>
              Monitor name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                placeholder="Homepage header"
                required
              />
            </label>
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
            <label>
              Check interval (minutes)
              <input
                value={interval}
                onChange={(event) => setInterval(event.target.value)}
                type="number"
                min="1"
                placeholder="60"
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create monitor"}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </div>
      </section>

      <section className="dashboard">
        <div className="panel">
          <h2>Active monitors</h2>
          <div className="monitor-list">
            {monitors.length === 0 ? (
              <p className="empty">No monitors yet. Add one above.</p>
            ) : (
              monitors.map((monitor) => (
                <button
                  key={monitor.id}
                  type="button"
                  className={
                    selected && selected.id === monitor.id
                      ? "monitor-row selected"
                      : "monitor-row"
                  }
                  onClick={() => handleSelect(monitor.id)}
                >
                  <div>
                    <strong>{monitor.name}</strong>
                    <span>{monitor.url}</span>
                  </div>
                  <div>
                    <span className={monitor.last_changed ? "tag danger" : "tag safe"}>
                      {monitor.last_message || "No checks yet"}
                    </span>
                    {monitor.test_mode ? <span className="tag warn">Test mode</span> : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="panel detail">
          <h2>Monitor details</h2>
          {selected ? (
            <>
              <div className="detail-header">
                <div>
                  <p className="title">{selected.name}</p>
                  <p className="muted">{selected.url}</p>
                  <p className="muted">{selected.selector || "Full page"}</p>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => handleAction(selected.id, "check")}>
                    Check now
                  </button>
                  <button type="button" onClick={() => handleAction(selected.id, "simulate")}>
                    Simulate change
                  </button>
                  <button type="button" onClick={() => handleAction(selected.id, "revert")}>
                    Revert
                  </button>
                  <button type="button" onClick={() => toggleEnabled(selected)}>
                    {selected.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(selected.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="history">
                <h3>Recent checks</h3>
                {selected.history && selected.history.length > 0 ? (
                  selected.history.map((item, index) => (
                    <div key={`${item.checked_at}-${index}`} className="history-row">
                      <span>{new Date(item.checked_at).toLocaleString()}</span>
                      <span className={item.changed ? "tag danger" : "tag safe"}>
                        {item.message}
                      </span>
                      {item.is_test ? <span className="tag warn">Test</span> : null}
                    </div>
                  ))
                ) : (
                  <p className="empty">No checks recorded yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="empty">Select a monitor to see details.</p>
          )}
        </div>
      </section>

      <section className="dashboard test-panel">
        <div className="panel full">
          <h2>🧪 Test Panel (Local)</h2>
          <p>Toggle elements below to change the DOM structure. Monitor <strong>http://localhost:3000</strong> to detect changes.</p>
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
              <div className="test-section">
                <h3>Test Section A</h3>
                <p>This is a test element that can be toggled on and off.</p>
              </div>
              {testContentVisible && (
                <div className="test-section">
                  <h3>Test Section B</h3>
                  <p>Toggle "Content Visible" to hide/show this section and detect DOM changes.</p>
                  <ul>
                    <li>Item 1</li>
                    <li>Item 2</li>
                    <li>Item 3</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="test-help">
            <strong>How to test:</strong>
            <ol>
              <li>Create a monitor with URL: <code>http://localhost:3000</code></li>
              <li>Use selector: <code>.test-content</code> or leave empty for full page</li>
              <li>Click "Check now" to establish baseline</li>
              <li>Toggle buttons above to change DOM structure</li>
              <li>Click "Check now" → Should show "Structure changed"</li>
              <li>Click same toggle to restore original</li>
              <li>Click "Check now" → Should show "No change detected"</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );

}
