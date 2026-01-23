// Second Thought - Content Script
// Extracts product data and displays intervention panel

(function () {
  'use strict';

  // Store current product and analysis for tracking
  let currentProduct = null;
  let currentAnalysis = null;

  // Product extraction patterns for different e-commerce sites
  const EXTRACTION_PATTERNS = {
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

  // Detect which site we're on
  function detectSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('ebay')) return 'ebay';
    return 'generic';
  }

  // Extract text from element
  function extractText(selector) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent?.trim();
      if (text) return text;
    }
    return null;
  }

  // Extract price from text
  function parsePrice(text) {
    if (!text) return null;
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return null;
  }

  // Extract currency from text
  function parseCurrency(text) {
    if (!text) return 'USD';
    if (text.includes('$')) return 'USD';
    if (text.includes('€')) return 'EUR';
    if (text.includes('£')) return 'GBP';
    return 'USD';
  }

  // Extract urgency indicators
  function extractUrgencyIndicators(selector) {
    const indicators = [];
    const elements = document.querySelectorAll(selector);

    const urgencyPatterns = [
      /only \d+ left/i,
      /limited/i,
      /sale ends/i,
      /hurry/i,
      /last chance/i,
      /selling fast/i,
      /\d+ (people|others)/i,
      /flash sale/i,
    ];

    for (const el of elements) {
      const text = el.textContent?.trim();
      if (text) {
        for (const pattern of urgencyPatterns) {
          if (pattern.test(text)) {
            indicators.push(text.substring(0, 100));
            break;
          }
        }
      }
    }

    return [...new Set(indicators)].slice(0, 5);
  }

  // Check if this is a product page
  function isProductPage() {
    const site = detectSite();
    const patterns = EXTRACTION_PATTERNS[site];

    const hasName = !!extractText(patterns.name);
    const hasPrice = !!extractText(patterns.price);

    return hasName && hasPrice;
  }

  // Extract product information
  function extractProductInfo() {
    const site = detectSite();
    const patterns = EXTRACTION_PATTERNS[site];

    const name = extractText(patterns.name);
    const priceText = extractText(patterns.price);
    const originalPriceText = extractText(patterns.originalPrice);
    const urgencyIndicators = extractUrgencyIndicators(patterns.urgency);

    if (!name || !priceText) {
      return null;
    }

    const price = parsePrice(priceText);
    const originalPrice = parsePrice(originalPriceText);
    const currency = parseCurrency(priceText);

    if (!price) {
      return null;
    }

    return {
      name: name.substring(0, 200),
      price,
      currency,
      originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
      url: window.location.href,
      urgencyIndicators,
    };
  }

  // Create intervention panel
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'second-thought-panel';
    panel.innerHTML = `
      <div class="st-header">
        <h2>💭 Second Thought</h2>
        <button class="st-close-btn" aria-label="Close">×</button>
      </div>
      <div class="st-content">
        <div class="st-loading">
          <div class="st-spinner"></div>
          <div class="st-loading-text">Analyzing this purchase...</div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Close button handler
    panel.querySelector('.st-close-btn').addEventListener('click', () => {
      hidePanel();
      // Track dismissal with product/analysis data
      chrome.runtime.sendMessage({
        type: 'TRACK_ENGAGEMENT',
        action: 'dismissed',
        product: currentProduct,
        analysis: currentAnalysis,
      });
    });

    return panel;
  }

  // Show panel with animation
  function showPanel() {
    let panel = document.getElementById('second-thought-panel');
    if (!panel) {
      panel = createPanel();
    }
    requestAnimationFrame(() => {
      panel.classList.add('visible');
    });
  }

  // Hide panel with animation
  function hidePanel() {
    const panel = document.getElementById('second-thought-panel');
    if (panel) {
      panel.classList.remove('visible');
    }
  }

  // Format currency
  function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  }

  // Update panel with analysis results
  function updatePanelWithAnalysis(analysis, product) {
    // Store for tracking
    currentProduct = product;
    currentAnalysis = analysis;

    const panel = document.getElementById('second-thought-panel');
    if (!panel) return;

    const content = panel.querySelector('.st-content');

    let warningsHtml = '';
    if (analysis.warnings && analysis.warnings.length > 0) {
      warningsHtml = `
        <div class="st-section">
          <div class="st-section-title">⚠️ Warnings</div>
          <div class="st-warnings">
            ${analysis.warnings.map(w => `
              <div class="st-warning">
                <span class="st-warning-icon">⚠️</span>
                <span class="st-warning-text">${w.explanation}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="st-section">
        <div class="st-section-title">💬 Our Take</div>
        <div class="st-message">${analysis.personalizedMessage}</div>
      </div>

      <div class="st-section">
        <div class="st-section-title">📈 Opportunity Cost</div>
        <div class="st-opportunity-cost">
          <h3>If you invested ${formatCurrency(product.price, product.currency)} instead:</h3>
          <div class="st-projections">
            <div class="st-projection">
              <div class="st-projection-value">${formatCurrency(analysis.opportunityCost.projections.years5, product.currency)}</div>
              <div class="st-projection-label">in 5 years</div>
            </div>
            <div class="st-projection">
              <div class="st-projection-value">${formatCurrency(analysis.opportunityCost.projections.years10, product.currency)}</div>
              <div class="st-projection-label">in 10 years</div>
            </div>
            <div class="st-projection">
              <div class="st-projection-value">${formatCurrency(analysis.opportunityCost.projections.years20, product.currency)}</div>
              <div class="st-projection-label">in 20 years</div>
            </div>
          </div>
        </div>
      </div>

      ${warningsHtml}

      <div class="st-actions">
        <button class="st-btn st-btn-primary" id="st-cooldown-btn">
          ⏰ Start 24h Cool-Down
        </button>
        <button class="st-btn st-btn-secondary" id="st-proceed-btn">
          Continue
        </button>
      </div>
    `;

    // Cool-down button handler
    document.getElementById('st-cooldown-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'START_COOLDOWN',
        product,
        analysis,
      });
      showCooldownStarted();
    });

    // Proceed button handler
    document.getElementById('st-proceed-btn').addEventListener('click', () => {
      hidePanel();
      chrome.runtime.sendMessage({
        type: 'TRACK_ENGAGEMENT',
        action: 'proceeded',
        product: currentProduct,
        analysis: currentAnalysis,
      });
    });
  }

  // Show cool-down started message
  function showCooldownStarted() {
    const panel = document.getElementById('second-thought-panel');
    if (!panel) return;

    const content = panel.querySelector('.st-content');
    content.innerHTML = `
      <div class="st-section">
        <div class="st-cooldown-timer">
          <h3>✅ Cool-Down Started!</h3>
          <div class="st-timer-value">24h 0m</div>
          <p style="margin-top: 12px; color: #5b21b6; font-size: 14px;">
            We'll remind you when it's time to reconsider.
          </p>
        </div>
      </div>
      <div class="st-actions">
        <button class="st-btn st-btn-secondary" id="st-close-final">Got it!</button>
      </div>
    `;

    document.getElementById('st-close-final').addEventListener('click', hidePanel);
  }

  // Show existing cool-down
  function showExistingCooldown(cooldown) {
    const panel = document.getElementById('second-thought-panel');
    if (!panel) return;

    const content = panel.querySelector('.st-content');
    content.innerHTML = `
      <div class="st-section">
        <div class="st-cooldown-timer">
          <h3>⏰ Cool-Down Active</h3>
          <div class="st-timer-value">${cooldown.formattedTime}</div>
          <p style="margin-top: 12px; color: #5b21b6; font-size: 14px;">
            You started a cool-down for this item. Take your time!
          </p>
        </div>
      </div>
      <div class="st-section">
        <div class="st-section-title">💬 Original Analysis</div>
        <div class="st-message">${cooldown.analysisResult?.personalizedMessage || 'Consider if you really need this.'}</div>
      </div>
      <div class="st-actions">
        <button class="st-btn st-btn-secondary" id="st-close-cooldown">Close</button>
      </div>
    `;

    document.getElementById('st-close-cooldown').addEventListener('click', hidePanel);
  }

  // Main initialization
  async function init() {
    // Wait for page to load
    if (document.readyState !== 'complete') {
      await new Promise(resolve => window.addEventListener('load', resolve));
    }

    // Check if this is a product page
    if (!isProductPage()) {
      return;
    }

    // Extract product info
    const product = extractProductInfo();
    if (!product) {
      return;
    }

    // Check minimum price threshold (default $20)
    const settings = await chrome.storage.local.get(['spendingThreshold']);
    const threshold = settings.spendingThreshold || 20;

    if (product.price < threshold) {
      return;
    }

    // Show panel
    showPanel();

    // Check for existing cool-down
    chrome.runtime.sendMessage({
      type: 'CHECK_COOLDOWN',
      productUrl: product.url,
    }, (response) => {
      if (response?.cooldown) {
        showExistingCooldown(response.cooldown);
      } else {
        // Request analysis
        chrome.runtime.sendMessage({
          type: 'ANALYZE_PRODUCT',
          product,
        }, (analysisResponse) => {
          if (analysisResponse?.analysis) {
            updatePanelWithAnalysis(analysisResponse.analysis, product);
          }
        });
      }
    });
  }

  // Run initialization
  init();

  // Listen for URL changes (SPA navigation)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      hidePanel();
      setTimeout(init, 1000);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
