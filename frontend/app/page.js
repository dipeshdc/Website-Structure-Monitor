"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_API = "http://localhost:8000";

export default function Home() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState("");
  const [interval, setInterval] = useState(60);
  const [monitors, setMonitors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API;
  }, []);

  useEffect(() => {
    fetchMonitors();
  }, []);

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
    <main className="page">
      <section className="hero">
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
    </main>
  );
}
