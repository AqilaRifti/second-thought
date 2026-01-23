// Product Extractor - Server-side version for testing
// This mirrors the logic in extension/content.js

export interface ExtractedProduct {
    name: string;
    price: number;
    currency: string;
    originalPrice?: number;
    url: string;
    urgencyIndicators: string[];
}

export interface ExtractionPatterns {
    name: string;
    price: string;
    originalPrice: string;
    urgency: string;
}

export const EXTRACTION_PATTERNS: Record<string, ExtractionPatterns> = {
    amazon: {
        name: '#productTitle, #title',
        price: '.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole',
        originalPrice: '.a-text-price .a-offscreen, #priceblock_ourprice_lbl + .a-text-price',
        urgency: '.a-color-price, #availability, .a-declarative[data-action="a-modal"]',
    },
    ebay: {
        name: '.x-item-title__mainTitle',
        price: '.x-price-primary .ux-textspans',
        originalPrice: '.x-price-primary .ux-textspans--STRIKETHROUGH',
        urgency: '.d-urgency-message, .vi-notify-new-bg-dBtm',
    },
    generic: {
        name: 'h1, [itemprop="name"], .product-title, .product-name',
        price: '[itemprop="price"], .price, .product-price, .current-price',
        originalPrice: '.original-price, .was-price, .compare-price, del',
        urgency: '.urgency, .limited, .stock-warning, .countdown',
    },
};

// Detect site from hostname
export function detectSite(hostname: string): string {
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('ebay')) return 'ebay';
    return 'generic';
}

// Parse price from text
export function parsePrice(text: string | null): number | null {
    if (!text) return null;
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
        return parseFloat(match[0].replace(/,/g, ''));
    }
    return null;
}

// Parse currency from text
export function parseCurrency(text: string | null): string {
    if (!text) return 'USD';
    if (text.includes('$')) return 'USD';
    if (text.includes('€')) return 'EUR';
    if (text.includes('£')) return 'GBP';
    if (text.includes('¥')) return 'JPY';
    if (text.includes('₹')) return 'INR';
    return 'USD';
}

// Urgency patterns for detection
export const URGENCY_PATTERNS = [
    /only \d+ left/i,
    /limited/i,
    /sale ends/i,
    /hurry/i,
    /last chance/i,
    /selling fast/i,
    /\d+ (people|others)/i,
    /flash sale/i,
    /ends in/i,
    /while supplies last/i,
];

// Check if text contains urgency indicator
export function containsUrgencyIndicator(text: string): boolean {
    return URGENCY_PATTERNS.some(pattern => pattern.test(text));
}

// Validate extracted product
export function validateProduct(product: Partial<ExtractedProduct>): product is ExtractedProduct {
    return (
        typeof product.name === 'string' &&
        product.name.length > 0 &&
        typeof product.price === 'number' &&
        product.price > 0 &&
        typeof product.currency === 'string' &&
        product.currency.length === 3 &&
        typeof product.url === 'string' &&
        Array.isArray(product.urgencyIndicators)
    );
}

// Normalize product name (trim, limit length)
export function normalizeProductName(name: string): string {
    return name.trim().substring(0, 200);
}

// Calculate discount percentage
export function calculateDiscountPercentage(
    currentPrice: number,
    originalPrice: number | undefined
): number | null {
    if (!originalPrice || originalPrice <= currentPrice) return null;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

// Check if discount seems fake (too high)
export function isSuspiciousDiscount(
    currentPrice: number,
    originalPrice: number | undefined
): boolean {
    const discount = calculateDiscountPercentage(currentPrice, originalPrice);
    if (discount === null) return false;
    // Discounts over 80% are suspicious
    return discount > 80;
}

// Extract product from mock DOM data (for testing)
export function extractProductFromData(data: {
    name?: string;
    priceText?: string;
    originalPriceText?: string;
    urgencyTexts?: string[];
    url: string;
}): ExtractedProduct | null {
    const name = data.name?.trim();
    const price = parsePrice(data.priceText || null);
    const originalPrice = parsePrice(data.originalPriceText || null);
    const currency = parseCurrency(data.priceText || null);

    if (!name || !price) {
        return null;
    }

    const urgencyIndicators = (data.urgencyTexts || [])
        .filter(text => containsUrgencyIndicator(text))
        .map(text => text.substring(0, 100))
        .slice(0, 5);

    return {
        name: normalizeProductName(name),
        price,
        currency,
        originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
        url: data.url,
        urgencyIndicators,
    };
}
