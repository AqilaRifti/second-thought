# 🏗️ Second Thought - Architecture

## System Overview

Second Thought is a full-stack application consisting of a Chrome browser extension (frontend) and a Next.js API (backend), with AI-powered analysis via Cerebras, data persistence via Supabase, and comprehensive observability via Opik.

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Extension                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Content    │  │  Background  │  │    Popup     │      │
│  │   Script     │  │   Service    │  │  Interface   │      │
│  │              │  │   Worker     │  │              │      │
│  │ • Extract    │  │ • API calls  │  │ • Profile    │      │
│  │ • Inject UI  │  │ • Messaging  │  │ • Settings   │      │
│  │ • Events     │  │ • Storage    │  │ • Stats      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                  │                                 │
└─────────┼──────────────────┼─────────────────────────────────┘
          │                  │
          │    HTTPS API     │
          │                  │
┌─────────▼──────────────────▼─────────────────────────────────┐
│                      Next.js API Server                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    API Routes                         │   │
│  │  /api/analyze  /api/profile  /api/cooldown  /api/track│  │
│  └────┬──────────────┬──────────────┬──────────────┬────┘   │
│       │              │              │              │         │
│  ┌────▼────┐    ┌────▼────┐   ┌────▼────┐    ┌────▼────┐   │
│  │Cerebras │    │  Opik   │   │Supabase │    │ Pricing │   │
│  │  Client │    │ Tracker │   │ Client  │    │Analyzer │   │
│  └─────────┘    └─────────┘   └─────────┘    └─────────┘   │
└───────┬──────────────┬──────────────┬──────────────────────┘
        │              │              │
        │              │              │
┌───────▼────┐   ┌─────▼─────┐  ┌────▼──────┐
│  Cerebras  │   │   Opik    │  │ Supabase  │
│   Cloud    │   │  Platform │  │ Postgres  │
│            │   │           │  │           │
│ • AI Model │   │ • Traces  │  │ • Users   │
│ • Inference│   │ • Evals   │  │ • Cooldown│
└────────────┘   │ • Metrics │  │ • Events  │
                 └───────────┘  └───────────┘
```

## Component Architecture

### 1. Browser Extension (Frontend)

#### Content Script (`extension/content.js`)
**Responsibility**: Product detection, data extraction, UI injection

**Key Functions**:
- `detectSite()` - Identifies e-commerce platform (Amazon, eBay, generic)
- `isProductPage()` - Determines if current page is a product page
- `extractProductInfo()` - Extracts product name, price, currency, urgency indicators
- `createPanel()` - Injects intervention UI into the page
- `updatePanelWithAnalysis()` - Displays AI analysis results

**Extraction Patterns**:
```javascript
const EXTRACTION_PATTERNS = {
  amazon: {
    name: '#productTitle, #title',
    price: '.a-price .a-offscreen, #priceblock_ourprice',
    originalPrice: '.a-text-price .a-offscreen',
    urgency: '.a-color-price, #availability'
  },
  ebay: { /* ... */ },
  generic: { /* ... */ }
};
```

**UI Injection**:
- Non-intrusive overlay panel
- Animated entrance/exit
- Responsive design
- Accessibility compliant

#### Background Service Worker (`extension/background.js`)
**Responsibility**: API communication, message routing, notifications

**Key Functions**:
- `handleAnalyzeProduct()` - Sends product to API for analysis
- `handleStartCooldown()` - Creates cool-down period
- `handleCheckCooldown()` - Checks for existing cool-downs
- `handleTrackEngagement()` - Logs user actions

**Message Flow**:
```
Content Script → Background Worker → API Server
                      ↓
                  Chrome Storage
                      ↓
                  Notifications
```

#### Popup Interface (`extension/popup.html/js`)
**Responsibility**: User profile management, settings, statistics

**Features**:
- Financial goals input
- Monthly budget configuration
- Spending threshold settings
- Engagement statistics
- Cool-down history

### 2. Next.js API Server (Backend)

#### API Routes

##### `/api/analyze` (POST)
**Purpose**: Analyze a product and return purchase insights

**Request**:
```typescript
{
  product: ProductInfo,
  userId?: string
}
```

**Response**:
```typescript
{
  success: boolean,
  analysis: AnalysisResult,
  metadata: {
    latencyMs: number,
    hasUserProfile: boolean
  }
}
```

**Flow**:
1. Validate product data
2. Fetch user profile (if userId provided)
3. Analyze pricing patterns (rule-based)
4. Get AI analysis (Cerebras)
5. Merge warnings
6. Track with Opik
7. Return results

##### `/api/profile` (GET/POST)
**Purpose**: Manage user financial profiles

**GET Request**: `?userId=xxx`
**POST Request**:
```typescript
{
  userId: string,
  financialGoals?: string[],
  monthlyBudget?: number,
  savingsGoal?: number
}
```

**Database Schema**:
```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  financial_goals TEXT[],
  monthly_budget DECIMAL,
  savings_goal DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

##### `/api/cooldown` (GET/POST/DELETE)
**Purpose**: Manage 24-hour cool-down periods

**POST Request**:
```typescript
{
  userId: string,
  productUrl: string,
  productName: string,
  productPrice: number,
  analysisResult: AnalysisResult
}
```

**Database Schema**:
```sql
CREATE TABLE cooldowns (
  id UUID PRIMARY KEY,
  user_id TEXT,
  product_url TEXT,
  product_name TEXT,
  product_price DECIMAL,
  analysis_result JSONB,
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  status TEXT
);
```

##### `/api/track` (POST)
**Purpose**: Track user engagement events

**Request**:
```typescript
{
  userId: string,
  eventType: 'intervention' | 'cooldown_started' | 'purchase_prevented',
  metadata: Record<string, any>
}
```

### 3. Core Libraries

#### Cerebras Client (`src/lib/cerebras.ts`)
**Purpose**: AI-powered purchase analysis

**Key Components**:
- `analyzePurchase()` - Main analysis function
- `buildPrompt()` - Constructs AI prompt with user context
- `parseAIResponse()` - Extracts structured data from AI response
- Load balancer integration for reliability

**AI Model**: `qwen-3-235b-a22b-instruct-2507`
**Parameters**:
- Temperature: 0.6 (balanced creativity/consistency)
- Max tokens: 4096
- Top-p: 0.95

**Prompt Structure**:
```
System: You are a financial wellness assistant...

User: Analyze this purchase:
- Product: [name]
- Price: [amount]
- User Goals: [goals]
- Urgency Indicators: [indicators]

Respond in JSON format with:
- isEssential: boolean
- essentialityScore: 0-1
- reasoning: string
- warnings: array
- personalizedMessage: string
- suggestedAction: proceed|cooldown|skip
```

#### Opik Tracker (`src/lib/opik.ts`)
**Purpose**: Comprehensive observability and evaluation

**Key Functions**:
- `startAnalysisTrace()` - Begin request tracing
- `completeAnalysisTrace()` - End trace with results
- `logUserEngagement()` - Track user actions
- `logCooldownEvent()` - Track cool-down lifecycle
- `logProfileUpdate()` - Track profile changes

**Trace Structure**:
```typescript
{
  name: 'purchase-analysis',
  input: { product, userProfile },
  output: { analysis, warnings },
  metadata: {
    userId,
    sessionId,
    latencyMs,
    modelVersion,
    promptVersion
  }
}
```

**LLM-as-Judge Evaluations** (in `src/lib/evaluations.ts`):
- **Empathy Score**: Is the message supportive and non-judgmental?
- **Accuracy Score**: Are financial calculations correct?
- **Actionability Score**: Does it provide clear next steps?

#### Opportunity Cost Calculator (`src/lib/opportunity-cost.ts`)
**Purpose**: Calculate investment projections

**Formula**: `FV = PV × (1 + r)^t`
- PV = Present Value (purchase amount)
- r = Annual return rate (7%)
- t = Time period (5, 10, 20 years)

**Example**:
```typescript
calculateOpportunityCost(200, 'USD')
// Returns:
{
  amount: 200,
  projections: {
    years5: 280.51,
    years10: 393.43,
    years20: 774.00
  },
  comparisonText: "In 20 years, this could be $774.00"
}
```

#### Pricing Analyzer (`src/lib/pricing-analyzer.ts`)
**Purpose**: Detect predatory pricing tactics

**Detection Rules**:
1. **Fake Discount**: Original price > 2× current price
2. **Urgency Manipulation**: Countdown timers, "Only X left"
3. **Inflated Price**: Price significantly above market average

**Output**:
```typescript
{
  type: 'fake_discount' | 'urgency_manipulation' | 'inflated_price',
  confidence: 0-1,
  explanation: string
}
```

#### User Profile Manager (`src/lib/user-profile.ts`)
**Purpose**: Manage user financial profiles

**Key Functions**:
- `get(userId)` - Fetch profile from Supabase
- `create(userId, data)` - Create new profile
- `update(userId, data)` - Update existing profile
- `delete(userId)` - Remove profile

#### Cool-down Manager (`src/lib/cooldown.ts`)
**Purpose**: Manage 24-hour waiting periods

**Key Functions**:
- `create(userId, product, analysis)` - Start cool-down
- `get(userId, productUrl)` - Check for active cool-down
- `cancel(cooldownId)` - User cancels cool-down
- `checkExpired()` - Cleanup expired cool-downs

**Cool-down Lifecycle**:
```
Created → Active (24h) → Expired → Archived
              ↓
          Cancelled
```

#### Load Balancer (`src/lib/load-balancer.ts`)
**Purpose**: Distribute API requests across multiple keys

**Features**:
- Round-robin key selection
- Error tracking and backoff
- Automatic retry with different key
- Health monitoring

**Algorithm**:
```typescript
class LoadBalancer {
  private keys: string[];
  private currentIndex: number;
  private errorCounts: Map<string, number>;

  getNextKey(): string {
    // Skip keys with high error rates
    // Return next healthy key
  }

  reportError(key: string): void {
    // Increment error count
    // Temporarily disable if threshold exceeded
  }

  reportSuccess(key: string): void {
    // Reset error count
  }
}
```

### 4. Data Models

#### ProductInfo
```typescript
interface ProductInfo {
  name: string;
  price: number;
  currency: string;
  originalPrice?: number;
  url: string;
  category?: string;
  urgencyIndicators?: string[];
}
```

#### AnalysisResult
```typescript
interface AnalysisResult {
  isEssential: boolean;
  essentialityScore: number; // 0-1
  reasoning: string;
  warnings: PricingWarning[];
  opportunityCost: OpportunityCost;
  personalizedMessage: string;
  suggestedAction: 'proceed' | 'cooldown' | 'skip';
}
```

#### UserProfile
```typescript
interface UserProfile {
  userId: string;
  financialGoals?: string[];
  monthlyBudget?: number;
  savingsGoal?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Cooldown
```typescript
interface Cooldown {
  id: string;
  userId: string;
  productUrl: string;
  productName: string;
  productPrice: number;
  analysisResult: AnalysisResult;
  startedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'cancelled';
}
```

## Data Flow

### Purchase Analysis Flow

```
1. User visits product page
   ↓
2. Content script detects product
   ↓
3. Extract product info (name, price, urgency)
   ↓
4. Check spending threshold (default $20)
   ↓
5. Show intervention panel (loading state)
   ↓
6. Background worker sends to API
   ↓
7. API fetches user profile (Supabase)
   ↓
8. API analyzes pricing (rule-based)
   ↓
9. API calls Cerebras AI
   ↓
10. Opik traces request
   ↓
11. Calculate opportunity cost
   ↓
12. Merge warnings
   ↓
13. Return analysis to extension
   ↓
14. Update panel with results
   ↓
15. User takes action (cooldown/proceed/dismiss)
   ↓
16. Track engagement (Opik)
```

### Cool-down Flow

```
1. User clicks "Start 24h Cool-Down"
   ↓
2. Background worker calls /api/cooldown (POST)
   ↓
3. API creates cooldown record (Supabase)
   ↓
4. Set expiration time (now + 24h)
   ↓
5. Opik logs cooldown_started event
   ↓
6. Return success to extension
   ↓
7. Show confirmation message
   ↓
8. Schedule notification (24h later)
   ↓
9. User revisits product page
   ↓
10. Check for active cooldown
   ↓
11. Show cooldown status (time remaining)
   ↓
12. After 24h: notification sent
   ↓
13. User can proceed or extend cooldown
```

## Security & Privacy

### Data Protection
- **No sensitive data storage**: We don't store payment info or browsing history
- **User IDs**: Generated locally, not tied to real identity
- **Supabase RLS**: Row-level security policies
- **HTTPS only**: All API communication encrypted
- **No tracking**: We don't sell or share user data

### API Security
- **Rate limiting**: Prevent abuse
- **Input validation**: Zod schemas for all requests
- **Error handling**: No sensitive info in error messages
- **CORS**: Restricted to extension origin

### Extension Permissions
```json
{
  "permissions": [
    "storage",        // Local data storage
    "notifications",  // Cool-down reminders
    "alarms"          // Scheduled tasks
  ],
  "host_permissions": [
    "https://api.secondthought.app/*"  // API access only
  ]
}
```

## Performance Optimization

### AI Inference
- **Cerebras Cloud**: Ultra-fast inference (<500ms)
- **Load balancing**: Multiple API keys for reliability
- **Caching**: Store recent analyses (5min TTL)
- **Fallback responses**: Graceful degradation if AI fails

### Database Queries
- **Indexed columns**: userId, productUrl, expiresAt
- **Connection pooling**: Supabase handles automatically
- **Query optimization**: Select only needed columns

### Extension Performance
- **Lazy loading**: Only inject UI when needed
- **Debounced extraction**: Wait for page to stabilize
- **Minimal DOM manipulation**: Efficient UI updates
- **Background processing**: Heavy work in service worker

## Testing Strategy

### Unit Tests (Vitest)
- All core functions have unit tests
- Mock external dependencies (Cerebras, Supabase, Opik)
- Test edge cases and error handling

### Property-Based Tests (fast-check)
- Opportunity cost calculations
- Pricing analysis logic
- User profile validation
- Cool-down expiration logic

**Example**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 0.01, max: 10000 }),
    fc.integer({ min: 1, max: 50 }),
    (amount, years) => {
      const result = calculateOpportunityCost(amount, years);
      // Property: Future value should always be >= present value
      return result.projections.years20 >= amount;
    }
  )
);
```

### Integration Tests
- API endpoint tests
- Database operations
- Extension messaging

### Current Coverage
- **85 tests passing**
- **Core logic: 100% coverage**
- **API routes: 90% coverage**
- **Extension: Manual testing**

## Deployment

### API Server
- **Platform**: Vercel (Next.js optimized)
- **Region**: US-East (low latency to Cerebras)
- **Environment**: Production, Staging, Development
- **CI/CD**: GitHub Actions

### Database
- **Platform**: Supabase (managed PostgreSQL)
- **Backups**: Automatic daily backups
- **Scaling**: Auto-scaling enabled

### Extension
- **Distribution**: Chrome Web Store
- **Updates**: Automatic via Chrome
- **Versioning**: Semantic versioning (1.0.0)

### Monitoring
- **Opik**: Request tracing, evaluations, metrics
- **Vercel**: API performance, error rates
- **Supabase**: Database health, query performance

## Scalability

### Current Capacity
- **API**: 1000 req/s (Vercel serverless)
- **Database**: 10K concurrent connections
- **AI**: 100 req/s per Cerebras key

### Scaling Strategy
1. **Horizontal scaling**: Add more Cerebras API keys
2. **Caching layer**: Redis for frequent queries
3. **CDN**: Static assets via Vercel Edge
4. **Database sharding**: Partition by userId
5. **Queue system**: Bull/Redis for async tasks

### Cost Optimization
- **Cerebras**: $0.60 per 1M tokens (~$0.001 per analysis)
- **Supabase**: Free tier → $25/month → $99/month
- **Vercel**: Free tier → $20/month → $150/month
- **Opik**: Free tier → $49/month

**Estimated cost per user per month**: $0.10

## Future Architecture Enhancements

### Phase 1: Mobile Apps
- React Native apps (iOS/Android)
- In-app browser with intervention
- Push notifications for cool-downs

### Phase 2: Bank Integration
- Plaid API for transaction data
- Real-time budget tracking
- Automatic investment of saved money

### Phase 3: Social Features
- Accountability partners
- Shared savings goals
- Leaderboards and challenges

### Phase 4: Merchant Network
- API for merchant integrations
- Cashback rewards system
- Alternative product recommendations

### Phase 5: AI Improvements
- Fine-tuned model on user data
- Personalized intervention timing
- Predictive impulse detection
