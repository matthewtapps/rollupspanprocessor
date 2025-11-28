import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { OTLPExporterConfigBase } from "@opentelemetry/otlp-exporter-base";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export interface DynamicHeaderExporterConfig extends Omit<OTLPExporterConfigBase, 'headers'> {
  headers?: Record<string, string>;
}

export class DynamicHeaderExporter implements SpanExporter {
  private exporter: OTLPTraceExporter;
  private config: DynamicHeaderExporterConfig;
  private dynamicHeaders: Record<string, string>;

  constructor(config: DynamicHeaderExporterConfig) {
    this.config = config;
    this.dynamicHeaders = { ...config.headers };
    this.exporter = this.createExporter();
  }

  private createExporter(): OTLPTraceExporter {
    return new OTLPTraceExporter({
      ...this.config,
      headers: this.dynamicHeaders,
    });
  }

  /**
   * Update headers dynamically and recreate the exporter
   */
  setHeaders(headers: Record<string, string>): void {
    this.dynamicHeaders = { ...this.config.headers, ...headers };
    
    // Shutdown old exporter and create new one with updated headers
    this.exporter.shutdown().then(() => {
      this.exporter = this.createExporter();
    });
  }

  /**
   * Set a single header value
   */
  setHeader(key: string, value: string): void {
    this.setHeaders({ [key]: value });
  }

  export(spans: ReadableSpan[], resultCallback: (result: any) => void): void {
    this.exporter.export(spans, resultCallback);
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.exporter.forceFlush?.() ?? Promise.resolve();
  }
}
