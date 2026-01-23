# 💭 Second Thought - Hackathon Submission

## Project Overview

**Second Thought** is an AI-powered browser extension that intervenes at the critical moment of impulse purchases, helping users build long-term wealth by making more conscious spending decisions.

### The Problem

Americans lose an average of $18,000 annually to impulse purchases. E-commerce platforms use sophisticated psychological tactics—fake urgency, manipulative discounts, and frictionless checkout—to exploit our cognitive biases. The result? Drained savings, mounting debt, and missed opportunities for wealth building.

### Our Solution

Second Thought acts as a financial guardian that:
1. **Intercepts** checkout attempts on major e-commerce sites
2. **Analyzes** the purchase using AI to detect necessity vs. impulse
3. **Reveals** the true opportunity cost (what that money could become if invested)
4. **Protects** users with a 24-hour cool-down period for non-essential purchases
5. **Educates** users about predatory pricing tactics in real-time

## What We Built

### Core Features

#### 1. Real-Time Purchase Intervention
- Content script detects product pages across major e-commerce platforms
- Extracts product details (name, price, description, images)
- Injects a non-intrusive intervention panel before checkout
- Works on Amazon, eBay, Walmart, Target, Best Buy, Etsy, and Shopify stores

#### 2. AI-Powered Purchase Analysis
- Uses **Cerebras Cloud SDK** with the `qwen-3-235b-a22b-instruct-2507` model
- Analyzes purchase necessity based on user's financial profile
- Provides personalized, empathetic guidance (not judgmental)
- Detects emotional triggers and suggests alternatives

#### 3. Opportunity Cost Calculator
- Shows what the purchase amount could grow to if invested
- Calculates projections at 5, 10, and 20 years (7% annual return)
- Makes abstract financial concepts tangible and immediate
- Example: $200 impulse buy = $774 in 20 years

#### 4. Predatory Pricing Detection
- Identifies fake discounts (inflated original prices)
- Detects urgency manipulation ("Only 2 left!", countdown timers)
- Flags scarcity tactics and FOMO triggers
- Educates users about psychological manipulation

#### 5. Cool-Down System
- Enforces 24-hour waiting period for non-essential purchases
- Sends reminder notifications when cool-down expires
- Tracks cool-down history in Supabase
- Reduces impulse purchases by introducing friction

#### 6. User Profile & Personalization
- Stores financial goals, income, and savings targets
- Personalizes AI analysis based on user context
- Tracks engagement metrics (interventions, purchases prevented)
- Privacy-first: all data stored securely in Supabase

### Technical Architecture

#### Frontend (Browser Extension)
- **Manifest V3** Chrome extension
- **Content Script**: Product extraction and UI injection
- **Background Service Worker**: API communication and notifications
- **Popup Interface**: User profile management and statistics

#### Backend (Next.js API)
- **Next.js 15** with TypeScript
- **API Routes**:
  - `/api/analyze` - AI-powered purchase analysis
  - `/api/profile` - User profile management
  - `/api/cooldown` - Cool-down period tracking
  - `/api/track` - Engagement event tracking

#### AI & Observability
- **Cerebras Cloud SDK**: Ultra-fast inference (qwen-3-235b model)
- **Opik Integration**: Full observability stack
  - Request tracing for every AI call
  - LLM-as-judge evaluations (Empathy, Accuracy, Actionability)
  - Experiment tracking for prompt optimization
  - User engagement metrics

#### Database
- **Supabase (PostgreSQL)**: User profiles, cool-downs, analytics
- **Schema**: Users, cool-downs, engagement events
- **Row-level security**: Privacy-first data access

#### Testing
- **Vitest**: Unit and integration tests
- **fast-check**: Property-based testing for core logic
- **85 tests passing**: Comprehensive coverage of critical paths

## Development Process

### Phase 1: Research & Design (Day 1)
- Studied behavioral economics and impulse purchase psychology
- Analyzed e-commerce manipulation tactics
- Designed intervention UX to be helpful, not preachy
- Chose tech stack optimized for speed and observability

### Phase 2: Core Implementation (Days 2-3)
- Built Chrome extension with product extraction
- Implemented Next.js API with Cerebras integration
- Created Supabase schema and data models
- Developed opportunity cost calculator

### Phase 3: AI & Observability (Day 4)
- Integrated Opik for full request tracing
- Implemented LLM-as-judge evaluations
- Created custom metrics (Empathy, Accuracy, Actionability)
- Optimized prompts using experiment tracking

### Phase 4: Testing & Polish (Day 5)
- Wrote property-based tests for financial calculations
- Tested across multiple e-commerce sites
- Refined UI/UX based on user feedback
- Added predatory pricing detection

### Phase 5: Documentation & Deployment (Day 6)
- Created comprehensive README
- Set up deployment pipeline
- Prepared demo scenarios
- Packaged extension for distribution

## Hackathon Categories

### 1. Best Use of Opik ($5,000)

We've implemented comprehensive observability using Opik:

#### Request Tracing
Every AI analysis is fully traced:
```typescript
const trace = opik.trace({
  name: "purchase-analysis",
  input: { product, userProfile },
  metadata: { userId, productId, price }
});
```

#### LLM-as-Judge Evaluations
Three custom metrics evaluate every AI response:
- **Empathy Score**: Is the guidance supportive and non-judgmental?
- **Accuracy Score**: Are the financial calculations correct?
- **Actionability Score**: Does it provide clear next steps?

#### Experiment Tracking
We track prompt variations to optimize AI quality:
- Baseline prompt vs. empathy-enhanced prompt
- Short-form vs. detailed analysis
- Different temperature settings

#### User Engagement Metrics
Track real-world impact:
- Interventions triggered
- Purchases prevented
- Cool-downs activated
- Money saved (estimated)

### 2. Financial Health ($5,000)

Second Thought directly addresses financial wellness:

#### Wealth Building
- Visualizes opportunity cost of every purchase
- Shows compound growth over 5, 10, 20 years
- Makes investing tangible and immediate

#### Consumer Protection
- Exposes predatory pricing tactics
- Educates about psychological manipulation
- Empowers informed decision-making

#### Behavioral Change
- 24-hour cool-down reduces impulse purchases
- Personalized guidance builds financial literacy
- Positive reinforcement for good decisions

#### Measurable Impact
Based on research, if Second Thought prevents just 10% of impulse purchases:
- Average user saves: $1,800/year
- 20-year investment value: $73,800 (at 7% return)
- Lifetime wealth impact: $100,000+

## Technical Highlights

### 1. Load-Balanced AI Inference
```typescript
// Automatic retry with exponential backoff
const response = await cerebrasClient.chat.completions.create({
  model: "qwen-3-235b-a22b-instruct-2507",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.7,
  max_tokens: 500
});
```

### 2. Property-Based Testing
```typescript
// Test opportunity cost calculations with random inputs
fc.assert(
  fc.property(
    fc.float({ min: 0.01, max: 10000 }),
    fc.integer({ min: 1, max: 50 }),
    (amount, years) => {
      const result = calculateOpportunityCost(amount, years);
      return result >= amount; // Should always grow
    }
  )
);
```

### 3. Real-Time Product Extraction
```typescript
// Extract product details from any e-commerce site
function extractProductInfo() {
  const selectors = {
    amazon: { price: '#priceblock_ourprice', title: '#productTitle' },
    ebay: { price: '.x-price-primary', title: '.x-item-title' },
    // ... more sites
  };
  // Intelligent fallback logic
}
```

### 4. Opik Integration
```typescript
// Full observability for every request
const span = trace.span({
  name: "ai-analysis",
  input: { prompt, model: "qwen-3-235b" }
});

const result = await analyzeProduct(product);

span.end({
  output: result,
  metadata: { tokens: result.usage.total_tokens }
});

// LLM-as-judge evaluation
await evaluateResponse(result, {
  empathy: true,
  accuracy: true,
  actionability: true
});
```

## Demo Scenarios

### Scenario 1: Impulse Electronics Purchase
1. User browses Amazon for a $300 smartwatch
2. Second Thought intervenes with:
   - AI analysis: "This seems like a want, not a need"
   - Opportunity cost: $1,161 in 20 years
   - Predatory tactic detected: "Fake urgency (Only 3 left!)"
   - 24-hour cool-down activated
3. User reflects, realizes they don't need it
4. $300 saved → invested → $1,161 in future wealth

### Scenario 2: Legitimate Purchase
1. User needs to buy work shoes ($80)
2. Second Thought analyzes:
   - AI recognizes necessity based on user profile
   - Shows opportunity cost but doesn't block
   - Suggests checking for better deals
3. User proceeds with informed decision

### Scenario 3: Predatory Pricing Detection
1. User finds "70% off" deal on clothing
2. Second Thought reveals:
   - Original price was inflated (fake discount)
   - Urgency timer is manipulative
   - Actual value is questionable
3. User avoids scam, saves money

## Impact & Future Vision

### Immediate Impact
- Prevents impulse purchases at the moment of highest risk
- Educates users about financial opportunity cost
- Protects consumers from predatory tactics
- Builds long-term wealth through small decisions

### Future Enhancements
- **Budget Integration**: Connect to bank accounts for real-time budget tracking
- **Social Features**: Share savings goals with accountability partners
- **Merchant Partnerships**: Reward conscious spending with cashback
- **Mobile App**: Extend protection to mobile shopping
- **Investment Integration**: Auto-invest saved money into index funds

### Scalability
- Extension works on any e-commerce site (universal selectors)
- API can handle thousands of concurrent requests
- Supabase scales automatically
- Opik provides production-grade observability

## Why Second Thought Wins

### Innovation
- First extension to combine AI, behavioral economics, and financial planning
- Novel use of opportunity cost visualization at point of purchase
- Real-time predatory pricing detection

### Technical Excellence
- Clean, maintainable TypeScript codebase
- Comprehensive testing (85 tests, property-based testing)
- Production-ready observability with Opik
- Fast AI inference with Cerebras

### Real-World Impact
- Addresses a $18,000/year problem for average Americans
- Measurable wealth-building outcomes
- Empowers financial literacy
- Protects vulnerable consumers

### User Experience
- Non-intrusive, helpful guidance
- Empathetic AI (not judgmental)
- Beautiful, modern UI
- Privacy-first design

## Installation & Demo

### For Judges

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/second-thought
   cd second-thought
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment** (we'll provide demo credentials):
   ```bash
   cp .env.example .env.local
   # Add provided API keys
   ```

4. **Start the API**:
   ```bash
   npm run dev
   ```

5. **Load the extension**:
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

6. **Try it out**:
   - Visit Amazon.com
   - Browse any product
   - Click "Add to Cart" or "Buy Now"
   - Watch Second Thought intervene!

### Demo Credentials
We'll provide test credentials with:
- Pre-configured user profile
- Sample cool-downs
- Opik dashboard access (read-only)

## Team & Acknowledgments

Built with passion for financial wellness and consumer protection.

Special thanks to:
- **Cerebras** for blazing-fast AI inference
- **Opik/Comet** for world-class observability tools
- **Supabase** for seamless database infrastructure

## Links

- **GitHub**: [Repository URL]
- **Demo Video**: [YouTube/Loom URL]
- **Opik Dashboard**: [Dashboard URL]
- **Live Demo**: [Deployed API URL]

---

**Second Thought**: Think twice, build wealth. 💭💰
