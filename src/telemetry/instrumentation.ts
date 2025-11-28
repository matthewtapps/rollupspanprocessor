import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SqlRollupSpanProcessor } from "./sql-span-rollup-processor.js";
import dotenv from "dotenv";

dotenv.config();

const honeycombApiKey = process.env.HONEYCOMB_API_KEY;

if (!honeycombApiKey) {
  console.error("HONEYCOMB_API_KEY environment variable is required");
  process.exit(1);
}

const exporter = new OTLPTraceExporter({
  url: "https://api.honeycomb.io/v1/traces",
  headers: {
    "x-honeycomb-team": honeycombApiKey,
  },
});

const batchProcessor = new BatchSpanProcessor(exporter);
export const rollupProcessor = new SqlRollupSpanProcessor(batchProcessor);

const sdk = new NodeSDK({
  serviceName: "rollup-processor-demo",
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "rollup-processor-demo",
  }),
  spanProcessors: [rollupProcessor],
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized with auto-instrumentation");

export function setRollupEnabled(enabled: boolean): void {
  if (rollupProcessor) {
    rollupProcessor.enabled = enabled;
  }
}
