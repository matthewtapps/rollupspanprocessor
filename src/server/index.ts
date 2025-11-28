import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { trace } from "@opentelemetry/api";
import {
  initializeTelemetry,
  rollupProcessor,
  setRollupEnabled,
} from "../telemetry/instrumentation.js";
import { dbClient, queries } from "./database.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let honeycombApiKey = process.env.HONEYCOMB_API_KEY || "";
let isConfigured = false;

if (honeycombApiKey) {
  initializeTelemetry(honeycombApiKey);
  isConfigured = true;
}

app.post("/api/config", (req, res) => {
  const { honeycombApiKey: apiKey } = req.body;

  if (isConfigured) {
    return res
      .status(400)
      .json({ error: "Already configured. Restart server to reconfigure." });
  }

  if (!apiKey) {
    return res.status(400).json({ error: "API key required" });
  }

  honeycombApiKey = apiKey;
  initializeTelemetry(honeycombApiKey);
  isConfigured = true;

  res.json({ success: true });
});

app.get('/api/status', (_req, res) => {
  res.json({ 
    configured: isConfigured,
    rollupEnabled: rollupProcessor?.enabled ?? true
  });
});

app.post("/api/generate", async (req, res) => {
  const { numQueries, queryDurationMs, enableRollup = true } = req.body;

  if (!honeycombApiKey) {
    return res.status(400).json({ error: "Set HONEYCOMB_API_KEY in .env" });
  }

  setRollupEnabled(enableRollup);

  const tracer = trace.getTracer("span-rollup-demo");

  await tracer.startActiveSpan("Generate Trace", async (rootSpan) => {
    for (let i = 0; i < numQueries; i++) {
      const queryType = Math.floor(Math.random() * 5);
      const randomId = Math.floor(Math.random() * 10) + 1;

      switch (queryType) {
        case 0:
          await dbClient.query(queries.selectUser, [randomId]);
          break;
        case 1:
          await dbClient.query(queries.selectPosts, [randomId]);
          break;
        case 2:
          await dbClient.query(queries.selectComments, [randomId]);
          break;
        case 3:
          await dbClient.query(queries.countUsers, [randomId]);
          break;
        case 4:
          await dbClient.query(queries.joinPostsComments, [randomId]);
          break;
      }

      if (queryDurationMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, queryDurationMs));
      }
    }
    rootSpan.end();
  });

  res.json({ success: true, queriesGenerated: numQueries });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
