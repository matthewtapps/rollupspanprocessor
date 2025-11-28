import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SqlRollupSpanProcessor } from "./sql-span-rollup-processor";

let rollupProcessor: SqlRollupSpanProcessor | null = null;

export function initializeTelemetry(honeycombApiKey: string): void {
  const exporter = new OTLPTraceExporter({
    url: "https://api.honeycomb.io/v1/traces",
    headers: {
      "x-honeycomb-team": honeycombApiKey,
    },
  });

  const batchProcessor = new BatchSpanProcessor(exporter);
  rollupProcessor = new SqlRollupSpanProcessor(batchProcessor);

  const sdk = new NodeSDK({
    serviceName: "rollup-processor-demo",
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "rollup-processor-demo",
    }),
    spanProcessors: [rollupProcessor],
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    sdk.start();
  } catch (e) {
    console.error(e);
  }
}

export function setRollupEnabled(enabled: boolean): void {
  if (rollupProcessor) {
    rollupProcessor.enabled = enabled;
  }
}
