// Core types for Second Thought

export interface ProductInfo {
    name: string;
    price: number;
    currency: string;
    originalPrice?: number;
    category?: string;
    url: string;
    imageUrl?: string;
    seller?: string;
    urgencyIndicators: string[];
}

export interface OpportunityCost {
    amount: number;
    projections: {
        years5: number;
        years10: number;
        years20: number;
    };
    comparisonText: string;
}

export interface PricingWarning {
    type: 'fake_discount' | 'urgency_manipulation' | 'inflated_price';
    confidence: number;
    explanation: string;
}

export interface AnalysisResult {
    isEssential: boolean;
    essentialityScore: number;
    reasoning: string;
    warnings: PricingWarning[];
    opportunityCost: OpportunityCost;
    personalizedMessage: string;
    suggestedAction: 'proceed' | 'cooldown' | 'skip';
}

export interface UserProfile {
    id: string;
    savingsGoal?: number;
    monthlyBudget?: number;
    financialGoals: string[];
    spendingThreshold: number;
    coolDownEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CoolDown {
    id: string;
    userId: string;
    productUrl: string;
    productInfo: ProductInfo;
    analysisResult: AnalysisResult;
    startedAt: Date;
    expiresAt: Date;
    status: 'active' | 'expired' | 'cancelled';
}

export interface TraceMetadata {
    userId: string;
    sessionId: string;
    latencyMs: number;
    modelVersion: string;
    promptVersion: string;
}

export interface EvaluationResult {
    empathyScore: number;
    accuracyScore: number;
    relevanceScore: number;
    actionabilityScore: number;
}

export interface Intervention {
    id: string;
    userId: string;
    productInfo: ProductInfo;
    analysisResult: AnalysisResult;
    userAction?: 'dismissed' | 'cooldown_started' | 'proceeded';
    createdAt: Date;
}
