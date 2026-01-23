# 💭 Second Thought

**Impulse Purchase Interceptor** - Build wealth by thinking twice before you buy.

Second Thought is a browser extension that intervenes at the moment of highest risk: the checkout button. Using AI-powered analysis, it helps you make better financial decisions by:

- 📊 Calculating opportunity costs (what your money could grow to if invested)
- ⚠️ Detecting predatory pricing tactics (fake discounts, urgency manipulation)
- ⏰ Enforcing 24-hour cool-down periods for non-essential purchases
- 🎯 Personalizing insights based on your financial goals

## Features

- **Real-time Product Analysis**: Automatically detects product pages on major e-commerce sites
- **AI-Powered Insights**: Uses Cerebras AI to analyze purchase necessity
- **Opportunity Cost Calculator**: Shows 5, 10, and 20-year investment projections at 7% growth
- **Predatory Pricing Detection**: Identifies fake discounts and urgency manipulation
- **Cool-Down System**: 24-hour waiting period with reminders
- **Opik Observability**: Full tracing and LLM-as-judge evaluations

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **AI**: Cerebras Cloud SDK (qwen-3-235b-a22b-instruct-2507)
- **Database**: Supabase (PostgreSQL)
- **Observability**: Opik (tracing, evaluations, experiments)
- **Testing**: Vitest + fast-check (property-based testing)

## Quick Start

### 1. Install Dependencies

```bash
cd second-thought
npm install
```

### 2. Set Up Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `OPIK_API_KEY` - Your Opik API key (from comet.com)
- `OPIK_WORKSPACE` - Your Opik workspace name

### 3. Set Up Supabase Database

Run the schema in your Supabase SQL editor:

```sql
-- Copy contents from supabase/schema.sql
```

### 4. Start the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

### 5. Load the Browser Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder

## Testing

Run all tests:

```bash
npm run test:run
```

Run tests in watch mode:

```bash
npm test
```

Current test coverage: **85 tests passing**

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze a product with AI |
| `/api/profile` | GET/POST | Get or update user profile |
| `/api/cooldown` | GET/POST/DELETE | Manage cool-downs |
| `/api/track` | POST | Track user engagement events |

## Project Structure

```
second-thought/
├── extension/           # Chrome extension
│   ├── manifest.json    # Extension manifest
│   ├── content.js       # Product extraction & UI injection
│   ├── content.css      # Intervention panel styles
│   ├── background.js    # API communication
│   ├── popup.html       # Extension popup
│   ├── popup.js         # Popup logic
│   └── popup.css        # Popup styles
├── src/
│   ├── app/
│   │   └── api/         # Next.js API routes
│   └── lib/
│       ├── cerebras.ts  # AI client with load balancing
│       ├── opik.ts      # Observability tracking
│       ├── evaluations.ts # LLM-as-judge metrics
│       ├── opportunity-cost.ts
│       ├── pricing-analyzer.ts
│       ├── user-profile.ts
│       ├── cooldown.ts
│       └── *.test.ts    # Property-based tests
└── supabase/
    └── schema.sql       # Database schema
```

## Hackathon Categories

This project is built for:

1. **Best Use of Opik** ($5,000) - Comprehensive observability with:
   - Full request tracing
   - LLM-as-judge evaluations (Empathy, Accuracy, Actionability)
   - Experiment tracking for prompt versions
   - User engagement metrics

2. **Financial Health** ($5,000) - Empowering better financial decisions:
   - Opportunity cost visualization
   - Predatory pricing detection
   - Cool-down periods for impulse control
   - Personalized financial goal integration

## License

MIT
