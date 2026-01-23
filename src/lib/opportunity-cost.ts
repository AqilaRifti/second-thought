// Opportunity Cost Calculator
// Calculates potential investment returns at 7% annual growth

import type { OpportunityCost } from './types';

const ANNUAL_GROWTH_RATE = 0.07;

/**
 * Calculate compound interest: P * (1 + r)^t
 */
function compoundInterest(principal: number, rate: number, years: number): number {
    return principal * Math.pow(1 + rate, years);
}

/**
 * Format currency with locale-aware notation
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
    const locale = currency === 'USD' ? 'en-US' : 'en-GB';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Calculate opportunity cost for a given price
 */
export function calculateOpportunityCost(
    price: number,
    currency: string = 'USD'
): OpportunityCost {
    if (price <= 0) {
        return {
            amount: 0,
            projections: {
                years5: 0,
                years10: 0,
                years20: 0,
            },
            comparisonText: 'Enter a valid price to see opportunity cost.',
        };
    }

    const years5 = compoundInterest(price, ANNUAL_GROWTH_RATE, 5);
    const years10 = compoundInterest(price, ANNUAL_GROWTH_RATE, 10);
    const years20 = compoundInterest(price, ANNUAL_GROWTH_RATE, 20);

    const formattedPrice = formatCurrency(price, currency);
    const formatted20yr = formatCurrency(years20, currency);

    return {
        amount: price,
        projections: {
            years5: Math.round(years5 * 100) / 100,
            years10: Math.round(years10 * 100) / 100,
            years20: Math.round(years20 * 100) / 100,
        },
        comparisonText: `Investing ${formattedPrice} today could grow to ${formatted20yr} in 20 years.`,
    };
}

/**
 * Generate a human-friendly comparison message
 */
export function generateComparisonMessage(
    price: number,
    currency: string = 'USD'
): string {
    const cost = calculateOpportunityCost(price, currency);
    const multiplier = Math.round(cost.projections.years20 / price);

    return `This ${formatCurrency(price, currency)} purchase could be worth ${formatCurrency(cost.projections.years20, currency)} in 20 years — that's ${multiplier}x your money!`;
}

export { ANNUAL_GROWTH_RATE };
