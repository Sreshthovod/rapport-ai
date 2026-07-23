import { ProviderMetrics } from '@rapport/shared';

export class MetricsTracker {
  private static instance: MetricsTracker | null = null;
  private readonly metrics: ProviderMetrics[] = [];
  private readonly maxEntries = 100;

  public static getInstance(): MetricsTracker {
    if (!MetricsTracker.instance) {
      MetricsTracker.instance = new MetricsTracker();
    }
    return MetricsTracker.instance;
  }

  public record(metric: ProviderMetrics): void {
    if (this.metrics.length >= this.maxEntries) {
      this.metrics.shift();
    }
    this.metrics.push(metric);
  }

  public getMetrics(providerId?: string): ProviderMetrics[] {
    if (providerId) {
      return this.metrics.filter((m) => m.providerId === providerId);
    }
    return [...this.metrics];
  }

  public getSummary(providerId: string): {
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
  } {
    const providerMetrics = this.getMetrics(providerId);
    if (providerMetrics.length === 0) {
      return { totalRequests: 0, successRate: 1.0, avgLatencyMs: 0 };
    }

    const successes = providerMetrics.filter((m) => m.success).length;
    const totalLatency = providerMetrics.reduce((sum, m) => sum + m.latencyMs, 0);

    return {
      totalRequests: providerMetrics.length,
      successRate: parseFloat((successes / providerMetrics.length).toFixed(2)),
      avgLatencyMs: Math.round(totalLatency / providerMetrics.length),
    };
  }

  public clear(): void {
    this.metrics.length = 0;
  }
}
