// Second Thought - Background Service Worker
// Handles API calls and state management

const API_BASE_URL = 'https://second-thought-azure.vercel.app/api';

// Get or create user ID
async function getUserId() {
    const result = await chrome.storage.local.get(['userId']);
    if (result.userId) {
        return result.userId;
    }

    const userId = crypto.randomUUID();
    await chrome.storage.local.set({ userId });
    return userId;
}

// Get session ID
async function getSessionId() {
    const result = await chrome.storage.session.get(['sessionId']);
    if (result.sessionId) {
        return result.sessionId;
    }

    const sessionId = crypto.randomUUID();
    await chrome.storage.session.set({ sessionId });
    return sessionId;
}

// Analyze product
async function analyzeProduct(product) {
    try {
        const userId = await getUserId();

        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product, userId }),
        });

        if (!response.ok) {
            throw new Error('Analysis failed');
        }

        const data = await response.json();
        return data.analysis;
    } catch (error) {
        console.error('Analysis error:', error);
        // Return fallback analysis
        return {
            isEssential: false,
            essentialityScore: 0.5,
            reasoning: 'Unable to analyze at this time.',
            warnings: [],
            opportunityCost: {
                amount: product.price,
                projections: {
                    years5: Math.round(product.price * 1.4),
                    years10: Math.round(product.price * 1.97),
                    years20: Math.round(product.price * 3.87),
                },
                comparisonText: `This ${product.price} could grow significantly over time.`,
            },
            personalizedMessage: 'Consider waiting 24 hours before making this purchase.',
            suggestedAction: 'cooldown',
        };
    }
}

// Check for existing cool-down
async function checkCooldown(productUrl) {
    try {
        const userId = await getUserId();

        const response = await fetch(
            `${API_BASE_URL}/cooldown?userId=${userId}&productUrl=${encodeURIComponent(productUrl)}`
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.coolDown;
    } catch (error) {
        console.error('Check cooldown error:', error);
        return null;
    }
}

// Start cool-down
async function startCooldown(product, analysis) {
    try {
        const userId = await getUserId();

        const response = await fetch(`${API_BASE_URL}/cooldown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, product, analysis }),
        });

        if (!response.ok) {
            throw new Error('Failed to start cooldown');
        }

        const data = await response.json();

        // Track engagement
        await trackEngagement('cooldown_started', product, analysis);

        return data.coolDown;
    } catch (error) {
        console.error('Start cooldown error:', error);
        return null;
    }
}

// Track user engagement
async function trackEngagement(action, product, analysis) {
    try {
        const userId = await getUserId();
        const sessionId = await getSessionId();

        await fetch(`${API_BASE_URL}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'engagement',
                userId,
                sessionId,
                data: { action, product, analysis },
            }),
        });
    } catch (error) {
        console.error('Track engagement error:', error);
    }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'ANALYZE_PRODUCT':
            analyzeProduct(message.product).then(analysis => {
                sendResponse({ analysis });
            });
            return true; // Keep channel open for async response

        case 'CHECK_COOLDOWN':
            checkCooldown(message.productUrl).then(cooldown => {
                sendResponse({ cooldown });
            });
            return true;

        case 'START_COOLDOWN':
            startCooldown(message.product, message.analysis).then(cooldown => {
                sendResponse({ cooldown });
            });
            return true;

        case 'TRACK_ENGAGEMENT':
            trackEngagement(message.action, message.product, message.analysis);
            sendResponse({ success: true });
            return false;

        default:
            sendResponse({ error: 'Unknown message type' });
            return false;
    }
});

// Check for expired cool-downs periodically
chrome.alarms.create('checkExpiredCooldowns', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkExpiredCooldowns') {
        const userId = await getUserId();

        try {
            const response = await fetch(`${API_BASE_URL}/cooldown?userId=${userId}`);
            const data = await response.json();

            // Notify about expired cool-downs
            if (data.coolDowns) {
                for (const cd of data.coolDowns) {
                    if (cd.status === 'expired') {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'icons/icon128.png',
                            title: 'Cool-Down Expired',
                            message: `Your cool-down for "${cd.productInfo.name}" has expired. Still want to buy it?`,
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Check expired cooldowns error:', error);
        }
    }
});
