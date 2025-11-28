import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { trace } from '@opentelemetry/api';
import { initializeTelemetry, setRollupEnabled } from '../telemetry/instrumentation.js';
import { createInMemoryDb, executeQuery } from './database.js';
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let honeycombApiKey = process.env.HONEYCOMB_API_KEY || '';
let isConfigured = false;

if (honeycombApiKey) {
  initializeTelemetry(honeycombApiKey);
  isConfigured = true;
}

const db = createInMemoryDb();

app.post('/api/config', (req, res) => {
  const { honeycombApiKey: apiKey } = req.body;
  
  if (isConfigured) {
    return res.status(400).json({ error: 'Already configured. Restart server to reconfigure.' });
  }
  
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }
  
  honeycombApiKey = apiKey;
  initializeTelemetry(honeycombApiKey);
  isConfigured = true;
  
  res.json({ success: true });
});

app.get('/api/status', (_req, res) => {
  res.json({ configured: isConfigured });
});

app.post('/api/generate', async (req, res) => {
  const { numQueries, queryDurationMs, enableRollup = true } = req.body;
  
  if (!honeycombApiKey) {
    return res.status(400).json({ error: 'Set HONEYCOMB_API_KEY in .env' });
  }

  setRollupEnabled(enableRollup);

  const tracer = trace.getTracer('span-rollup-demo');
  
  await tracer.startActiveSpan('Generate Trace', async (rootSpan) => {
    for (let i = 0; i < numQueries; i++) {
      await tracer.startActiveSpan(`SQL Query ${i}`, async (span) => {
        span.setAttribute('db.statement', 'SELECT * FROM users WHERE id = ?');
        executeQuery(db, 'SELECT * FROM users WHERE id = ?', [Math.floor(Math.random() * 10) + 1]);
        
        if (queryDurationMs > 0) {
          await new Promise(resolve => setTimeout(resolve, queryDurationMs));
        }
        
        span.end();
      });
    }
    rootSpan.end();
  });

  res.json({ success: true, queriesGenerated: numQueries });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
