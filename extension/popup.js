// Second Thought - Popup Script

const API_BASE_URL = 'https://second-thought-azure.vercel.app/api';

// DOM Elements
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Stats elements
const interventionsCount = document.getElementById('interventions-count');
const savedAmount = document.getElementById('saved-amount');
const cooldownsCount = document.getElementById('cooldowns-count');
const dailyInsight = document.getElementById('daily-insight');

// Settings elements
const savingsGoalInput = document.getElementById('savings-goal');
const monthlyBudgetInput = document.getElementById('monthly-budget');
const spendingThresholdInput = document.getElementById('spending-threshold');
const thresholdDisplay = document.getElementById('threshold-display');
const financialGoalsInput = document.getElementById('financial-goals');
const cooldownEnabledInput = document.getElementById('cooldown-enabled');
const saveSettingsBtn = document.getElementById('save-settings');

// Cool-downs list
const cooldownsList = document.getElementById('cooldowns-list');

// Insights for rotation
const insights = [
    'Every purchase you pause is a chance to invest in your future.',
    'Small savings today compound into significant wealth tomorrow.',
    'The best purchase is often the one you didn\'t make.',
    'Your future self will thank you for thinking twice.',
    'Impulse purchases are the enemy of financial freedom.',
    'Waiting 24 hours can save you from buyer\'s remorse.',
    'Building wealth is about consistent small decisions.',
];

// Tab Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');

        if (tabId === 'cooldowns') {
            loadCooldowns();
        }
    });
});

// Get user ID
async function getUserId() {
    const result = await chrome.storage.local.get(['userId']);
    return result.userId || null;
}

// Load stats
async function loadStats() {
    const stats = await chrome.storage.local.get([
        'interventionsCount',
        'potentialSavings',
    ]);

    interventionsCount.textContent = stats.interventionsCount || 0;
    savedAmount.textContent = formatCurrency(stats.potentialSavings || 0);

    // Random insight
    dailyInsight.textContent = insights[Math.floor(Math.random() * insights.length)];
}

// Load cool-downs
async function loadCooldowns() {
    const userId = await getUserId();
    if (!userId) {
        renderEmptyCooldowns();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cooldown?userId=${userId}`);
        const data = await response.json();

        if (data.coolDowns && data.coolDowns.length > 0) {
            const activeCooldowns = data.coolDowns.filter(cd => cd.status === 'active');
            cooldownsCount.textContent = activeCooldowns.length;
            renderCooldowns(activeCooldowns);
        } else {
            cooldownsCount.textContent = 0;
            renderEmptyCooldowns();
        }
    } catch (error) {
        console.error('Failed to load cooldowns:', error);
        renderEmptyCooldowns();
    }
}

// Render cool-downs
function renderCooldowns(cooldowns) {
    if (cooldowns.length === 0) {
        renderEmptyCooldowns();
        return;
    }

    cooldownsList.innerHTML = cooldowns.map(cd => {
        const remaining = getRemainingTime(cd.expiresAt);
        return `
            <div class="cooldown-item" data-id="${cd.id}">
                <div class="cooldown-info">
                    <h4>${escapeHtml(cd.productInfo.name)}</h4>
                    <span class="price">${formatCurrency(cd.productInfo.price, cd.productInfo.currency)}</span>
                </div>
                <div class="cooldown-timer">
                    <div class="timer-value">${remaining}</div>
                    <div class="timer-label">remaining</div>
                    <button class="cancel-btn" data-id="${cd.id}">Cancel</button>
                </div>
            </div>
        `;
    }).join('');

    // Add cancel handlers
    cooldownsList.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => cancelCooldown(btn.dataset.id));
    });
}

// Render empty state
function renderEmptyCooldowns() {
    cooldownsList.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">⏰</span>
            <p>No active cool-downs</p>
            <small>When you start a cool-down, it will appear here</small>
        </div>
    `;
}

// Cancel cool-down
async function cancelCooldown(id) {
    const userId = await getUserId();
    if (!userId) return;

    try {
        await fetch(`${API_BASE_URL}/cooldown?userId=${userId}&cooldownId=${id}`, {
            method: 'DELETE',
        });
        showToast('Cool-down cancelled');
        loadCooldowns();
    } catch (error) {
        console.error('Failed to cancel cooldown:', error);
        showToast('Failed to cancel');
    }
}

// Load settings
async function loadSettings() {
    const settings = await chrome.storage.local.get([
        'savingsGoal',
        'monthlyBudget',
        'spendingThreshold',
        'financialGoals',
        'cooldownEnabled',
    ]);

    if (settings.savingsGoal) savingsGoalInput.value = settings.savingsGoal;
    if (settings.monthlyBudget) monthlyBudgetInput.value = settings.monthlyBudget;
    if (settings.spendingThreshold) {
        spendingThresholdInput.value = settings.spendingThreshold;
        thresholdDisplay.textContent = `$${settings.spendingThreshold}`;
    }
    if (settings.financialGoals) financialGoalsInput.value = settings.financialGoals;
    cooldownEnabledInput.checked = settings.cooldownEnabled !== false;
}

// Save settings
async function saveSettings() {
    const settings = {
        savingsGoal: parseInt(savingsGoalInput.value) || 0,
        monthlyBudget: parseInt(monthlyBudgetInput.value) || 0,
        spendingThreshold: parseInt(spendingThresholdInput.value) || 20,
        financialGoals: financialGoalsInput.value,
        cooldownEnabled: cooldownEnabledInput.checked,
    };

    await chrome.storage.local.set(settings);

    // Sync to backend
    const userId = await getUserId();
    if (userId) {
        try {
            await fetch(`${API_BASE_URL}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    savingsGoal: settings.savingsGoal,
                    monthlyBudget: settings.monthlyBudget,
                    spendingThreshold: settings.spendingThreshold,
                    financialGoals: settings.financialGoals.split(',').map(g => g.trim()).filter(Boolean),
                    coolDownEnabled: settings.cooldownEnabled,
                }),
            });
        } catch (error) {
            console.error('Failed to sync settings:', error);
        }
    }

    showToast('Settings saved!');
}

// Threshold slider update
spendingThresholdInput.addEventListener('input', () => {
    thresholdDisplay.textContent = `$${spendingThresholdInput.value}`;
});

// Save button
saveSettingsBtn.addEventListener('click', saveSettings);

// Utility functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function getRemainingTime(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadSettings();
    loadCooldowns();
});
