import {
  type Context,
  SpanKind,
  SpanStatusCode,
  type Span,
} from "@opentelemetry/api";
import type {
  ReadableSpan,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";

interface SummaryData {
  count: number;
  duration_total: number;
  duration_min: number;
  duration_max: number;
}

export class SqlRollupSpanProcessor implements SpanProcessor {
  private pendingChildSpans: Map<string, string[]> = new Map();
  private summaryData: Map<string, Map<string, SummaryData>> = new Map();
  private parentMap: Map<string, string> = new Map();
  private spanBuffer: Map<string, ReadableSpan> = new Map();
  private decorated: SpanProcessor;

  private readonly SLOW_QUERY_THRESHOLD_NS = 50_000_000;
  public enabled = true;

  constructor(decorated: SpanProcessor) {
    this.decorated = decorated;
  }

  onStart(span: Span & ReadableSpan, parentContext: Context): void {
    this.decorated.onStart(span, parentContext);

    if (!this.enabled) return;

    const parentSpanContext = span.parentSpanContext;
    if (parentSpanContext?.spanId) {
      this.parentMap.set(span.spanContext().spanId, parentSpanContext.spanId);
    }
  }

  onEnd(span: ReadableSpan): void {
    if (!this.enabled) {
      this.decorated.onEnd(span);
      return;
    }

    const spanId = span.spanContext().spanId;
    this.spanBuffer.set(spanId, span);

    if (this.shouldRollup(span)) {
      const parentId = this.parentMap.get(spanId);
      if (!parentId) return;

      if (!this.pendingChildSpans.has(parentId)) {
        this.pendingChildSpans.set(parentId, []);
        this.summaryData.set(parentId, new Map());
      }

      this.pendingChildSpans.get(parentId)!.push(spanId);

      if (this.shouldKeepIndividually(span)) {
        this.decorated.onEnd(span);
      }

      this.addToSummary(parentId, span);
      this.removePendingChild(parentId, spanId);
      return;
    }

    if (this.pendingChildSpans.has(spanId)) {
      this.tryEmit(spanId);
      return;
    }

    this.decorated.onEnd(span);
  }

  private shouldRollup(span: ReadableSpan): boolean {
    const name = span.name.toLowerCase();
    return (
      name.includes("sql") ||
      name.includes("query") ||
      name.includes("database")
    );
  }

  private shouldKeepIndividually(span: ReadableSpan): boolean {
    if (span.status.code === SpanStatusCode.ERROR) {
      return true;
    }

    const duration =
      span.endTime[0] * 1e9 +
      span.endTime[1] -
      (span.startTime[0] * 1e9 + span.startTime[1]);
    return duration > this.SLOW_QUERY_THRESHOLD_NS;
  }

  private addToSummary(parentId: string, span: ReadableSpan): void {
    const duration =
      span.endTime[0] * 1e9 +
      span.endTime[1] -
      (span.startTime[0] * 1e9 + span.startTime[1]);
    const query = (span.attributes["db.statement"] as string) || span.name;

    const parentSummary = this.summaryData.get(parentId)!;

    if (!parentSummary.has(query)) {
      parentSummary.set(query, {
        count: 0,
        duration_total: 0,
        duration_min: Number.MAX_SAFE_INTEGER,
        duration_max: 0,
      });
    }

    const summary = parentSummary.get(query)!;
    summary.count++;
    summary.duration_total += duration;
    summary.duration_min = Math.min(summary.duration_min, duration);
    summary.duration_max = Math.max(summary.duration_max, duration);
  }

  private removePendingChild(parentId: string, spanId: string): void {
    const pending = this.pendingChildSpans.get(parentId);
    if (pending) {
      const index = pending.indexOf(spanId);
      if (index > -1) {
        pending.splice(index, 1);
      }
    }
  }

  private tryEmit(parentId: string): void {
    const pending = this.pendingChildSpans.get(parentId);
    const parentSpan = this.spanBuffer.get(parentId);

    // Only emit if parent has ended AND all children are processed
    if (parentSpan && (!pending || pending.length === 0)) {
      this.emitRollup(parentId);
    }
  }

  private emitRollup(parentId: string): void {
    const parentSpan = this.spanBuffer.get(parentId);
    if (parentSpan) {
      this.decorated.onEnd(parentSpan);
    }

    const summary = this.summaryData.get(parentId);
    if (summary && summary.size > 0) {
      const rollupSpan = this.createRollupSpan(parentId, summary);
      this.decorated.onEnd(rollupSpan);
    }

    this.summaryData.delete(parentId);
    this.pendingChildSpans.delete(parentId);
    this.spanBuffer.delete(parentId);
  }

  private createRollupSpan(
    parentId: string,
    summaryData: Map<string, SummaryData>,
  ): ReadableSpan {
    const parentSpan = this.spanBuffer.get(parentId)!;
    if (!parentSpan) {
      throw new Error(`Parent span ${parentId} not found in buffer`);
    }

    let totalCount = 0;
    let totalDuration = 0;
    let minDuration = Number.MAX_SAFE_INTEGER;
    let maxDuration = 0;

    for (const data of summaryData.values()) {
      totalCount += data.count;
      totalDuration += data.duration_total;
      minDuration = Math.min(minDuration, data.duration_min);
      maxDuration = Math.max(maxDuration, data.duration_max);
    }

    const uniqueCount = summaryData.size;

    const toMs = (ns: number) => Math.round((ns / 1_000_000) * 1000) / 1000;
    const attributes: Record<string, string | number> = {
      "db.query.rollup.total.count": totalCount,
      "db.query.rollup.total.duration_ms": toMs(totalDuration),
      "db.query.rollup.total.duration_ms.avg": toMs(totalDuration / totalCount),
      "db.query.rollup.total.duration_ms.min": toMs(minDuration),
      "db.query.rollup.total.duration_ms.max": toMs(maxDuration),
      "db.query.rollup.unique.count": summaryData.size,
    };

    let index = 1;
    for (const [query, data] of summaryData.entries()) {
      attributes[`db.query.rollup.${index}.text`] = query;
      attributes[`db.query.rollup.${index}.count`] = data.count;
      attributes[`db.query.rollup.${index}.duration_ms.total`] = toMs(
        data.duration_total,
      );
      attributes[`db.query.rollup.${index}.duration_ms.avg`] = toMs(
        data.duration_total / data.count,
      );
      attributes[`db.query.rollup.${index}.duration_ms.min`] = toMs(
        data.duration_min,
      );
      attributes[`db.query.rollup.${index}.duration_ms.max`] = toMs(
        data.duration_max,
      );
      index++;
    }

    return {
      name: `SQL Rollup: ${totalCount} Total, ${uniqueCount} Unique`,
      kind: SpanKind.CLIENT,
      spanContext: () => ({
        traceId: parentSpan.spanContext().traceId,
        spanId: this.generateSpanId(),
        traceFlags: parentSpan.spanContext().traceFlags,
      }),
      parentSpanContext: parentSpan.spanContext(),
      startTime: parentSpan.startTime,
      endTime: parentSpan.startTime,
      status: { code: SpanStatusCode.UNSET },
      attributes,
      links: [],
      events: [],
      duration: [0, 0],
      ended: true,
      instrumentationScope: parentSpan.instrumentationScope,
      resource: parentSpan.resource,
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
    } as ReadableSpan;
  }

  private generateSpanId(): string {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");
  }

  forceFlush(): Promise<void> {
    if (this.enabled) {
      for (const parentId of this.pendingChildSpans.keys()) {
        this.emitRollup(parentId);
      }
    }
    return this.decorated.forceFlush();
  }

  shutdown(): Promise<void> {
    if (this.enabled) {
      for (const parentId of this.pendingChildSpans.keys()) {
        this.emitRollup(parentId);
      }
    }
    return this.decorated.shutdown();
  }
}
