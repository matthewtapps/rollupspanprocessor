import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SqlRollupSpanProcessor } from "./sql-span-rollup-processor";
import { DynamicHeaderExporter } from "./dynamic-header-exporter";
import dotenv from "dotenv";

dotenv.config();

const honeycombApiKey = process.env.HONEYCOMB_API_KEY;
export const hasEnvApiKey = !!honeycombApiKey;

const exporter = new DynamicHeaderExporter({
  url: "https://api.honeycomb.io/v1/traces",
  headers: honeycombApiKey ? {
    "x-honeycomb-team": honeycombApiKey,
  } : {},
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

export function setHoneycombApiKey(apiKey: string): void {
  exporter.setHeader("x-honeycomb-team", apiKey);
}
