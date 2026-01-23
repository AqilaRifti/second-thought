// Opik Observability Integration
// Comprehensive tracing and evaluation for AI interactions

import { Opik } from 'opik';
import type { ProductInfo, AnalysisResult, UserProfile, TraceMetadata } from './types';

// Initialize Opik client
const opikClient = new Opik({
    apiKey: process.env.OPIK_API_KEY,
    projectName: process.env.OPIK_PROJECT_NAME || 'second-thought',
    workspaceName: process.env.OPIK_WORKSPACE_NAME,
});

export interface TraceContext {
    traceId: string;
    startTime: number;
}

export class OpikTracker {
    private client: Opik;

    constructor() {
        this.client = opikClient;
    }

    // Start a new trace for purchase analysis
    startAnalysisTrace(
        product: ProductInfo,
        userId: string,
        sessionId: string
    ): TraceContext {
        const startTime = Date.now();

        const trace = this.client.trace({
            name: 'purchase-analysis',
            input: {
                product: {
                    name: product.name,
                    price: product.price,
                    currency: product.currency,
                    category: product.category,
                    hasDiscount: !!product.originalPrice,
                    urgencyIndicatorCount: product.urgencyIndicators?.length || 0,
                },
            },
            metadata: {
                userId,
                sessionId,
                productUrl: product.url,
                promptVersion: 'v1.0',
            },
        });

        // Generate a trace ID (Opik trace doesn't expose id directly)
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
            traceId,
            startTime,
        };
    }

    // Complete the analysis trace with results
    async completeAnalysisTrace(
        context: TraceContext,
        analysis: AnalysisResult,
        metadata: Partial<TraceMetadata>
    ): Promise<void> {
        const latencyMs = Date.now() - context.startTime;

        // Log the trace completion
        const trace = this.client.trace({
            name: 'purchase-analysis-complete',
            input: { traceId: context.traceId },
            output: {
                isEssential: analysis.isEssential,
                essentialityScore: analysis.essentialityScore,
                suggestedAction: analysis.suggestedAction,
                warningCount: analysis.warnings.length,
                opportunityCost20yr: analysis.opportunityCost.projections.years20,
            },
            metadata: {
                ...metadata,
                latencyMs,
                modelVersion: 'qwen-3-235b-a22b-instruct-2507',
            },
        });

        trace.end();
        await this.client.flush();
    }

    // Log user engagement with intervention
    async logUserEngagement(
        userId: string,
        sessionId: string,
        action: 'dismissed' | 'cooldown_started' | 'proceeded',
        product?: ProductInfo,
        analysis?: AnalysisResult
    ): Promise<void> {
        const trace = this.client.trace({
            name: 'user-engagement',
            input: {
                productName: product?.name || 'unknown',
                productPrice: product?.price || 0,
                suggestedAction: analysis?.suggestedAction || 'unknown',
            },
            output: {
                userAction: action,
                followedAdvice: analysis ? (
                    (analysis.suggestedAction === 'cooldown' && action === 'cooldown_started') ||
                    (analysis.suggestedAction === 'skip' && action === 'dismissed') ||
                    (analysis.suggestedAction === 'proceed' && action === 'proceeded')
                ) : false,
            },
            metadata: {
                userId,
                sessionId,
                essentialityScore: analysis?.essentialityScore || 0,
                warningCount: analysis?.warnings?.length || 0,
            },
        });

        trace.end();
        await this.client.flush();
    }

    // Log cool-down events
    async logCooldownEvent(
        userId: string,
        eventType: 'started' | 'checked' | 'expired' | 'cancelled',
        productUrl: string,
        remainingTimeMs?: number
    ): Promise<void> {
        const trace = this.client.trace({
            name: 'cooldown-event',
            input: {
                eventType,
                productUrl,
            },
            output: {
                remainingTimeMs,
                remainingHours: remainingTimeMs ? Math.round(remainingTimeMs / (1000 * 60 * 60) * 10) / 10 : 0,
            },
            metadata: {
                userId,
            },
        });

        trace.end();
        await this.client.flush();
    }

    // Log profile updates
    async logProfileUpdate(
        userId: string,
        updatedFields: string[]
    ): Promise<void> {
        const trace = this.client.trace({
            name: 'profile-update',
            input: {
                updatedFields,
            },
            metadata: {
                userId,
            },
        });

        trace.end();
        await this.client.flush();
    }

    // Create a span for sub-operations
    createSpan(
        traceId: string,
        name: string,
        type: 'llm' | 'tool' | 'general',
        input: Record<string, unknown>
    ) {
        const trace = this.client.trace({
            name: `${traceId}-${name}`,
            input,
            metadata: { spanType: type },
        });

        return {
            end: (output: Record<string, unknown>) => {
                // Update trace with output
                this.client.trace({
                    name: `${traceId}-${name}-complete`,
                    input: { traceId },
                    output,
                });
            },
        };
    }

    // Flush all pending traces
    async flush(): Promise<void> {
        await this.client.flush();
    }
}

// Singleton instance
export const opikTracker = new OpikTracker();

// Export client for advanced usage
export { opikClient };
