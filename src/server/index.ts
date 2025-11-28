// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
//
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

import {
  rollupProcessor,
  setRollupEnabled,
  setHoneycombApiKey,
  hasEnvApiKey,
} from "../telemetry/instrumentation";

import express from "express";
import cors from "cors";
import { dbClient, queries } from "./database";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/status", (_req, res) => {
  res.json({
    hasEnvApiKey,
    rollupEnabled: rollupProcessor?.enabled ?? true,
  });

  console.log(
    `Received request to /api/status, hasEnvApiKey: ${hasEnvApiKey}, rollupEnabled: ${rollupProcessor.enabled}`,
  );
});

app.post("/api/generate", async (req, res) => {
  const {
    numQueries,
    queryDurationMs,
    enableRollup = true,
    honeycombApiKey,
  } = req.body;

  console.log(
    `Received request to /api/generate, numQueries: ${numQueries}, queryDurationMs: ${queryDurationMs}, enableRollup: ${enableRollup}, honeycombApiKey: ${honeycombApiKey}`,
  );

  if (!hasEnvApiKey && !honeycombApiKey) {
    return res.status(400).json({
      error:
        "No Honeycomb API key configured. Please provide one in the request or set HONEYCOMB_API_KEY environment variable.",
    });
  }

  if (honeycombApiKey && typeof honeycombApiKey === "string") {
    setHoneycombApiKey(honeycombApiKey);
  }

  setRollupEnabled(enableRollup);

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

  res.json({ success: true, queriesGenerated: numQueries });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
