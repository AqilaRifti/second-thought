// LLM-as-Judge Evaluations for Second Thought
// Evaluates intervention quality using Opik metrics

import { AnswerRelevance, Usefulness, BaseMetric } from 'opik';
import type { EvaluationScoreResult } from 'opik';
import { z } from 'zod';
import type { ProductInfo, AnalysisResult, UserProfile, EvaluationResult } from './types';

// Custom Empathy Metric
const empathySchema = z.object({
    userGoals: z.string(),
    productName: z.string(),
    price: z.number(),
    personalizedMessage: z.string(),
});

type EmpathyInput = z.infer<typeof empathySchema>;

class EmpathyMetric extends BaseMetric<typeof empathySchema> {
    public validationSchema = empathySchema;

    constructor(name = 'empathy', trackMetric = true) {
        super(name, trackMetric);
    }

    async score(input: EmpathyInput): Promise<EvaluationScoreResult> {
        // This would use an LLM to evaluate empathy
        // For now, we use heuristics as a placeholder
        const message = input.personalizedMessage.toLowerCase();

        let score = 0.5; // Base score

        // Positive indicators
        if (message.includes('understand') || message.includes('know')) score += 0.1;
        if (message.includes('goal') || message.includes('dream')) score += 0.1;
        if (message.includes('help') || message.includes('support')) score += 0.1;
        if (message.includes('consider') || message.includes('think')) score += 0.1;

        // Negative indicators
        if (message.includes('must') || message.includes('should not')) score -= 0.1;
        if (message.includes('wrong') || message.includes('bad')) score -= 0.1;

        score = Math.max(0, Math.min(1, score));

        return {
            name: this.name,
            value: score,
            reason: `Empathy score based on message tone and supportiveness`,
        };
    }
}

// Custom Accuracy Metric
const accuracySchema = z.object({
    productPrice: z.number(),
    opportunityCost20yr: z.number(),
    isEssential: z.boolean(),
    category: z.string().optional(),
});

type AccuracyInput = z.infer<typeof accuracySchema>;

class AccuracyMetric extends BaseMetric<typeof accuracySchema> {
    public validationSchema = accuracySchema;

    constructor(name = 'accuracy', trackMetric = true) {
        super(name, trackMetric);
    }

    async score(input: AccuracyInput): Promise<EvaluationScoreResult> {
        let score = 1.0;
        const reasons: string[] = [];

        // Verify opportunity cost calculation (7% annual growth for 20 years)
        const expectedCost = input.productPrice * Math.pow(1.07, 20);
        const costError = Math.abs(input.opportunityCost20yr - expectedCost) / expectedCost;

        if (costError > 0.01) {
            score -= 0.3;
            reasons.push('Opportunity cost calculation may be inaccurate');
        }

        // Check essentiality classification makes sense
        const essentialCategories = ['food', 'medicine', 'health', 'utilities', 'housing'];
        const nonEssentialCategories = ['luxury', 'entertainment', 'fashion', 'gadgets'];

        if (input.category) {
            const categoryLower = input.category.toLowerCase();
            const isEssentialCategory = essentialCategories.some(c => categoryLower.includes(c));
            const isNonEssentialCategory = nonEssentialCategories.some(c => categoryLower.includes(c));

            if (isEssentialCategory && !input.isEssential) {
                score -= 0.2;
                reasons.push('Essential category marked as non-essential');
            }
            if (isNonEssentialCategory && input.isEssential) {
                score -= 0.2;
                reasons.push('Non-essential category marked as essential');
            }
        }

        return {
            name: this.name,
            value: Math.max(0, score),
            reason: reasons.length > 0 ? reasons.join('; ') : 'Analysis appears accurate',
        };
    }
}

// Custom Actionability Metric
const actionabilitySchema = z.object({
    suggestedAction: z.enum(['proceed', 'cooldown', 'skip']),
    reasoning: z.string(),
    warningCount: z.number(),
});

type ActionabilityInput = z.infer<typeof actionabilitySchema>;

class ActionabilityMetric extends BaseMetric<typeof actionabilitySchema> {
    public validationSchema = actionabilitySchema;

    constructor(name = 'actionability', trackMetric = true) {
        super(name, trackMetric);
    }

    async score(input: ActionabilityInput): Promise<EvaluationScoreResult> {
        let score = 0.5;
        const reasons: string[] = [];

        // Clear action provided
        if (['proceed', 'cooldown', 'skip'].includes(input.suggestedAction)) {
            score += 0.2;
            reasons.push('Clear action suggested');
        }

        // Reasoning provided
        if (input.reasoning && input.reasoning.length > 20) {
            score += 0.2;
            reasons.push('Detailed reasoning provided');
        }

        // Warnings align with action
        if (input.warningCount > 0 && input.suggestedAction !== 'proceed') {
            score += 0.1;
            reasons.push('Action aligns with warnings');
        }

        return {
            name: this.name,
            value: Math.min(1, score),
            reason: reasons.join('; '),
        };
    }
}

// Evaluate an intervention
export async function evaluateIntervention(
    product: ProductInfo,
    analysis: AnalysisResult,
    userProfile?: UserProfile
): Promise<EvaluationResult> {
    const empathyMetric = new EmpathyMetric();
    const accuracyMetric = new AccuracyMetric();
    const actionabilityMetric = new ActionabilityMetric();

    // Evaluate empathy
    const empathyResult = await empathyMetric.score({
        userGoals: userProfile?.financialGoals?.join(', ') || 'Not specified',
        productName: product.name,
        price: product.price,
        personalizedMessage: analysis.personalizedMessage,
    });

    // Evaluate accuracy
    const accuracyResult = await accuracyMetric.score({
        productPrice: product.price,
        opportunityCost20yr: analysis.opportunityCost.projections.years20,
        isEssential: analysis.isEssential,
        category: product.category,
    });

    // Evaluate actionability
    const actionabilityResult = await actionabilityMetric.score({
        suggestedAction: analysis.suggestedAction,
        reasoning: analysis.reasoning,
        warningCount: analysis.warnings.length,
    });

    // Use Opik's built-in relevance metric for overall relevance
    const relevanceMetric = new AnswerRelevance();
    let relevanceScore = 0.7; // Default if evaluation fails

    try {
        const relevanceResult = await relevanceMetric.score({
            input: `Should I buy ${product.name} for ${product.currency} ${product.price}?`,
            output: analysis.personalizedMessage,
        });
        relevanceScore = relevanceResult.value;
    } catch {
        // Use default score if relevance evaluation fails
    }

    return {
        empathyScore: empathyResult.value,
        accuracyScore: accuracyResult.value,
        relevanceScore,
        actionabilityScore: actionabilityResult.value,
    };
}

export { EmpathyMetric, AccuracyMetric, ActionabilityMetric };
