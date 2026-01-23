// Predatory Pricing Detection
// Detects fake discounts, urgency manipulation, and inflated prices

import type { ProductInfo, PricingWarning } from './types';

// Common urgency manipulation patterns
const URGENCY_PATTERNS = [
    /only \d+ left/i,
    /limited (time|stock|quantity)/i,
    /sale ends (in|soon|today)/i,
    /hurry/i,
    /don't miss/i,
    /last chance/i,
    /selling fast/i,
    /\d+ (people|others) (are )?(viewing|watching)/i,
    /\d+ sold in (the )?last/i,
    /flash sale/i,
    /deal of the day/i,
    /expires? (in|soon)/i,
    /countdown/i,
    /timer/i,
];

// Suspicious discount thresholds
const SUSPICIOUS_DISCOUNT_THRESHOLD = 0.5; // 50% or more
const EXTREME_DISCOUNT_THRESHOLD = 0.7; // 70% or more

export function detectFakeDiscount(product: ProductInfo): PricingWarning | null {
    if (!product.originalPrice || product.originalPrice <= product.price) {
        return null;
    }

    const discountPercent = (product.originalPrice - product.price) / product.originalPrice;

    if (discountPercent >= EXTREME_DISCOUNT_THRESHOLD) {
        return {
            type: 'fake_discount',
            confidence: 0.9,
            explanation: `This ${Math.round(discountPercent * 100)}% discount seems too good to be true. The "original" price may be artificially inflated.`,
        };
    }

    if (discountPercent >= SUSPICIOUS_DISCOUNT_THRESHOLD) {
        return {
            type: 'fake_discount',
            confidence: 0.6,
            explanation: `A ${Math.round(discountPercent * 100)}% discount is significant. Consider checking if this price is typical for similar products.`,
        };
    }

    return null;
}

export function detectUrgencyManipulation(product: ProductInfo): PricingWarning | null {
    if (!product.urgencyIndicators || product.urgencyIndicators.length === 0) {
        return null;
    }

    const matchedPatterns: string[] = [];

    for (const indicator of product.urgencyIndicators) {
        for (const pattern of URGENCY_PATTERNS) {
            if (pattern.test(indicator)) {
                matchedPatterns.push(indicator);
                break;
            }
        }
    }

    if (matchedPatterns.length === 0) {
        return null;
    }

    // More patterns = higher confidence of manipulation
    const confidence = Math.min(0.9, 0.5 + matchedPatterns.length * 0.15);

    return {
        type: 'urgency_manipulation',
        confidence,
        explanation: `Urgency tactics detected: "${matchedPatterns.slice(0, 2).join('", "')}". These are common techniques to pressure quick decisions.`,
    };
}

export function detectInflatedPrice(product: ProductInfo): PricingWarning | null {
    // This would ideally compare against historical prices or competitor prices
    // For now, we flag if there's both a large discount AND urgency indicators

    if (!product.originalPrice || product.urgencyIndicators?.length === 0) {
        return null;
    }

    const discountPercent = (product.originalPrice - product.price) / product.originalPrice;
    const hasUrgency = product.urgencyIndicators && product.urgencyIndicators.length > 0;

    if (discountPercent >= SUSPICIOUS_DISCOUNT_THRESHOLD && hasUrgency) {
        return {
            type: 'inflated_price',
            confidence: 0.7,
            explanation: 'Combination of large discount and urgency tactics suggests the original price may have been inflated to make the deal seem better.',
        };
    }

    return null;
}

export function analyzePricing(product: ProductInfo): PricingWarning[] {
    const warnings: PricingWarning[] = [];

    const fakeDiscount = detectFakeDiscount(product);
    if (fakeDiscount) warnings.push(fakeDiscount);

    const urgencyManipulation = detectUrgencyManipulation(product);
    if (urgencyManipulation) warnings.push(urgencyManipulation);

    const inflatedPrice = detectInflatedPrice(product);
    if (inflatedPrice) warnings.push(inflatedPrice);

    return warnings;
}

export { URGENCY_PATTERNS, SUSPICIOUS_DISCOUNT_THRESHOLD, EXTREME_DISCOUNT_THRESHOLD };
