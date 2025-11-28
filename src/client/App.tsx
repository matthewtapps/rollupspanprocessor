import { useEffect, useState } from "react";

export default function App() {
  const [enableRollup, setEnableRollup] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [numQueries, setNumQueries] = useState(100);
  const [queryDuration, setQueryDuration] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) {
          setConfigured(true);
          setMessage("Using API key from environment");
        }
      })
      .catch(() => {
      });
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:3001/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numQueries,
          queryDurationMs: queryDuration,
          enableRollup,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(
          `Generated trace with ${data.queriesGenerated} queries! (Rollup: ${enableRollup ? "ON" : "OFF"})`,
        );
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error: " + error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Span Rollup Demo</h1>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Generate Telemetry</h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Number of SQL Queries:
          </label>
          <input
            type="number"
            value={numQueries}
            onChange={(e) => setNumQueries(parseInt(e.target.value))}
            min="1"
            max="1000"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Query Duration (ms):
          </label>
          <input
            type="number"
            value={queryDuration}
            onChange={(e) => setQueryDuration(parseInt(e.target.value))}
            min="0"
            defaultValue={10}
            max="1000"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            <input
              type="checkbox"
              checked={enableRollup}
              onChange={(e) => setEnableRollup(e.target.checked)}
            />{" "}
            Enable Rollup Processor
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!configured || generating}
          style={{ padding: "0.5rem 1rem" }}
        >
          {generating ? "Generating..." : "Generate Trace"}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "1rem",
            background: message.includes("Error") ? "#fee" : "#efe",
            borderRadius: "4px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
