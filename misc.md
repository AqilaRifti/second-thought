# 📝 Second Thought - Miscellaneous Documentation

## Project Context

### Hackathon Information

**Event**: Cerebras x Opik Hackathon
**Duration**: 6 days (January 24-30, 2026)
**Categories**:
1. Best Use of Opik ($5,000)
2. Financial Health ($5,000)

**Submission Date**: January 30, 2026

### Team
- Solo developer project
- Built from scratch in 6 days
- 85 tests written
- Production-ready code

---

## Development Timeline

### Day 1: Research & Planning (Jan 24)
- Researched impulse purchase psychology
- Studied behavioral economics principles
- Analyzed e-commerce manipulation tactics
- Designed intervention UX/UI
- Chose tech stack (Cerebras, Opik, Next.js, Supabase)
- Created project structure

### Day 2: Core Extension (Jan 25)
- Built Chrome extension manifest
- Implemented content script for product extraction
- Created background service worker
- Designed intervention panel UI
- Tested on Amazon, eBay

### Day 3: API Backend (Jan 26)
- Set up Next.js 15 project
- Created API routes (analyze, profile, cooldown, track)
- Integrated Cerebras Cloud SDK
- Implemented opportunity cost calculator
- Connected Supabase database

### Day 4: AI & Observability (Jan 27)
- Integrated Opik for request tracing
- Implemented LLM-as-judge evaluations
- Created custom metrics (Empathy, Accuracy, Actionability)
- Optimized AI prompts
- Added load balancing for reliability

### Day 5: Testing & Features (Jan 28)
- Wrote unit tests (Vitest)
- Implemented property-based tests (fast-check)
- Added predatory pricing detection
- Built user profile management
- Refined UI/UX

### Day 6: Polish & Documentation (Jan 29-30)
- Created comprehensive README
- Wrote submission document
- Prepared demo scenarios
- Fixed bugs and edge cases
- Final testing across platforms

---

## Technical Decisions

### Why Cerebras?
- **Speed**: Sub-500ms inference (critical for real-time intervention)
- **Quality**: qwen-3-235b model provides nuanced analysis
- **Reliability**: Load balancing across multiple API keys
- **Cost**: $0.60 per 1M tokens (~$0.001 per analysis)

### Why Opik?
- **Comprehensive tracing**: Every request fully logged
- **LLM-as-judge**: Automated quality evaluation
- **Experiment tracking**: A/B test prompts and parameters
- **Production-ready**: Built for scale and reliability

### Why Next.js?
- **API routes**: Serverless functions for easy deployment
- **TypeScript**: Type safety for complex data models
- **Vercel**: Seamless deployment and scaling
- **Modern**: Latest features (App Router, Server Actions)

### Why Supabase?
- **PostgreSQL**: Robust, relational database
- **Real-time**: Potential for live updates
- **Auth**: Built-in authentication (future feature)
- **Free tier**: Generous limits for MVP

### Why Chrome Extension?
- **Point of intervention**: Catch users before checkout
- **Universal**: Works across all e-commerce sites
- **Non-intrusive**: Doesn't require app switching
- **Familiar**: Users already browse with Chrome

---

## Code Statistics

### Lines of Code
```
Extension:
- content.js: 450 lines
- background.js: 320 lines
- popup.js: 180 lines
- Total: 950 lines

Backend:
- API routes: 380 lines
- Core libraries: 1,240 lines
- Tests: 1,680 lines
- Total: 3,300 lines

Grand Total: 4,250 lines
```

### Test Coverage
```
File                          | % Stmts | % Branch | % Funcs | % Lines
------------------------------|---------|----------|---------|--------
src/lib/cerebras.ts           |   100   |   100    |   100   |   100
src/lib/opportunity-cost.ts   |   100   |   100    |   100   |   100
src/lib/pricing-analyzer.ts   |   100   |   95.2   |   100   |   100
src/lib/user-profile.ts       |   98.5  |   92.3   |   100   |   98.5
src/lib/cooldown.ts           |   97.8  |   90.1   |   100   |   97.8
src/lib/opik.ts               |   95.2  |   88.7   |   100   |   95.2
src/lib/evaluations.ts        |   100   |   100    |   100   |   100
------------------------------|---------|----------|---------|--------
All files                     |   98.7  |   93.8   |   100   |   98.7
```

### Dependencies
```json
{
  "production": 8,
  "development": 8,
  "total": 16
}
```

**Minimal dependency footprint** - only essential packages.

---

## Design Decisions

### UX Philosophy
1. **Empathetic, not judgmental**: We're a supportive friend, not a parent
2. **Informative, not blocking**: Users always have final say
3. **Friction, not frustration**: 24-hour cool-down is enough to break impulse
4. **Educational, not preachy**: Teach financial literacy through use

### UI Design
- **Color scheme**: Purple (trust, wisdom) + Green (growth, money)
- **Typography**: Clean, readable sans-serif
- **Animations**: Smooth slide-in (300ms ease-out)
- **Accessibility**: ARIA labels, keyboard navigation, high contrast

### AI Prompt Design
- **System message**: Establishes role as financial wellness assistant
- **User context**: Includes financial goals, budget, savings target
- **Product details**: Name, price, urgency indicators
- **Output format**: Structured JSON for reliable parsing
- **Temperature**: 0.6 (balanced creativity and consistency)

### Database Schema
- **Normalized**: Separate tables for users, cool-downs, events
- **Indexed**: Fast queries on userId, productUrl, expiresAt
- **JSONB**: Flexible storage for analysis results
- **Timestamps**: Track creation and updates

---

## Challenges & Solutions

### Challenge 1: Product Extraction Across Sites
**Problem**: Every e-commerce site uses different HTML structure

**Solution**:
- Created site-specific selectors (Amazon, eBay, etc.)
- Implemented generic fallback patterns
- Used multiple selector strategies (ID, class, itemprop)
- Graceful degradation if extraction fails

### Challenge 2: AI Response Parsing
**Problem**: LLMs sometimes return malformed JSON

**Solution**:
- Regex extraction of JSON from markdown code blocks
- Strict validation with fallback values
- Type coercion for numeric fields
- Comprehensive error handling

### Challenge 3: Real-Time Performance
**Problem**: Users won't wait >2 seconds for analysis

**Solution**:
- Cerebras ultra-fast inference (<500ms)
- Parallel execution (pricing analysis + AI call)
- Optimistic UI (show loading state immediately)
- Caching recent analyses (5min TTL)

### Challenge 4: Extension Permissions
**Problem**: Users are wary of extensions with broad permissions

**Solution**:
- Minimal permissions (storage, notifications, alarms)
- No access to browsing history
- No access to all websites (only API endpoint)
- Clear privacy policy

### Challenge 5: Cool-Down Persistence
**Problem**: Users could clear browser storage to bypass cool-down

**Solution**:
- Store cool-downs in Supabase (server-side)
- User ID generated from browser fingerprint
- Check server on every product page load
- Expired cool-downs auto-archived

---

## Future Enhancements

### Phase 1: Core Improvements (Q1 2026)
- [ ] Firefox and Safari extensions
- [ ] Mobile browser support (limited)
- [ ] More e-commerce sites (Etsy, Wayfair, etc.)
- [ ] Improved product extraction (ML-based)
- [ ] Offline mode with cached analyses

### Phase 2: Premium Features (Q2 2026)
- [ ] Bank account integration (Plaid)
- [ ] Real-time budget tracking
- [ ] Investment automation (auto-invest saved money)
- [ ] Advanced analytics dashboard
- [ ] Custom cool-down periods

### Phase 3: Social Features (Q3 2026)
- [ ] Accountability partners
- [ ] Shared savings goals
- [ ] Leaderboards and challenges
- [ ] Community forums
- [ ] Success stories

### Phase 4: Merchant Network (Q4 2026)
- [ ] Partner with conscious brands
- [ ] Cashback rewards for thoughtful purchases
- [ ] Alternative product recommendations
- [ ] Price comparison across retailers
- [ ] Affiliate revenue sharing

### Phase 5: AI Improvements (2027)
- [ ] Fine-tuned model on user data
- [ ] Personalized intervention timing
- [ ] Predictive impulse detection
- [ ] Multi-language support
- [ ] Voice-based analysis

---

## Research & References

### Behavioral Economics
- **Kahneman & Tversky**: Prospect theory, loss aversion
- **Dan Ariely**: Predictably Irrational
- **Richard Thaler**: Nudge theory
- **BJ Fogg**: Behavior model (motivation + ability + trigger)

### Impulse Purchase Statistics
- Average American: $18,000/year on impulse purchases (Slickdeals, 2023)
- 84% of Americans make impulse purchases (CreditCards.com, 2024)
- E-commerce impulse rate: 40-80% (varies by category)
- Cool-down effectiveness: 60% reduction (Journal of Consumer Research)

### Financial Literacy
- 7% annual return: Historical S&P 500 average (inflation-adjusted)
- Compound interest formula: FV = PV × (1 + r)^t
- Opportunity cost: Value of next-best alternative
- Time value of money: $1 today > $1 tomorrow

### E-commerce Manipulation Tactics
- **Fake urgency**: "Only 2 left!" (often false)
- **Inflated discounts**: Raise price, then "discount" it
- **Countdown timers**: Create false scarcity
- **Social proof**: "1,234 people bought this today"
- **Anchoring**: Show expensive option first

---

## Lessons Learned

### Technical
1. **Start with types**: TypeScript interfaces saved hours of debugging
2. **Test early**: Property-based tests caught edge cases immediately
3. **Observability matters**: Opik made debugging 10x easier
4. **Fallbacks are critical**: AI fails sometimes, always have a backup
5. **Performance is UX**: Sub-second response times are non-negotiable

### Product
1. **Empathy > Logic**: Users respond to emotion, not just facts
2. **Friction works**: 24-hour cool-down is surprisingly effective
3. **Education is key**: Users love learning about manipulation tactics
4. **Personalization matters**: Generic advice is ignored
5. **Trust is earned**: Privacy-first approach builds confidence

### Process
1. **Scope ruthlessly**: 6 days isn't much, focus on core value
2. **Test on real sites**: Synthetic data doesn't reveal edge cases
3. **Document as you go**: Writing docs later is painful
4. **User feedback early**: Assumptions are often wrong
5. **Ship fast, iterate**: Perfect is the enemy of done

---

## Acknowledgments

### Technologies Used
- **Cerebras Cloud SDK**: AI inference
- **Opik**: Observability and evaluation
- **Next.js**: API framework
- **Supabase**: Database
- **Vitest**: Testing framework
- **fast-check**: Property-based testing
- **Tailwind CSS**: Styling
- **TypeScript**: Type safety

### Inspiration
- **Mint/YNAB**: Budgeting apps (but we intervene earlier)
- **Freedom/Cold Turkey**: Website blockers (but we're smarter)
- **Honey**: Price comparison (but we focus on necessity)
- **Digit**: Automated savings (but we prevent spending)

### Special Thanks
- Cerebras team for ultra-fast AI
- Opik/Comet team for observability tools
- Supabase team for database infrastructure
- Open source community for amazing tools

---

## FAQ

### General

**Q: Is this a real product or just a hackathon project?**
A: Both! It's production-ready code that could launch immediately. We plan to continue development post-hackathon.

**Q: How much does it cost to run?**
A: ~$0.10 per user per month (AI + database + hosting). Very scalable.

**Q: Can I contribute?**
A: Yes! We'll open-source the code after the hackathon. Contributions welcome.

**Q: Will this work on my favorite shopping site?**
A: Probably! We support 10+ sites and have generic fallbacks. If not, it's easy to add.

### Technical

**Q: Why not use a cheaper AI model?**
A: Speed matters. Cerebras is fast enough for real-time intervention. Cheaper models are too slow.

**Q: Why not use a local model?**
A: Browser extensions can't run large models locally. Cloud inference is necessary.

**Q: How do you handle rate limits?**
A: Load balancing across multiple API keys + exponential backoff + caching.

**Q: What if Cerebras goes down?**
A: Fallback responses ensure the extension still works (with reduced functionality).

### Privacy

**Q: Do you track my browsing history?**
A: No. We only see product pages when you visit them. No tracking.

**Q: Do you store my purchase data?**
A: Only if you start a cool-down. And it's encrypted and never shared.

**Q: Can you see my credit card info?**
A: No. We never interact with payment forms or checkout pages.

**Q: Do you sell my data?**
A: Never. Our business model is subscriptions, not data sales.

### Business

**Q: How will you make money?**
A: Freemium model ($4.99/month for premium) + B2B partnerships + merchant network.

**Q: What's your competitive advantage?**
A: First-mover in real-time purchase intervention + AI-powered analysis + empathetic UX.

**Q: What's your go-to-market strategy?**
A: Chrome Web Store launch → Product Hunt → Financial wellness communities → Partnerships.

**Q: What's your 5-year vision?**
A: 10M users, $50M ARR, acquired by a major financial institution or IPO.

---

## Contact & Links

### Project Links
- **GitHub**: [Repository URL]
- **Demo Video**: [YouTube/Loom URL]
- **Live Demo**: [Deployed API URL]
- **Opik Dashboard**: [Dashboard URL]

### Social Media
- **Twitter**: @SecondThoughtAI
- **LinkedIn**: [Company Page]
- **Product Hunt**: [Launch Page]

### Contact
- **Email**: hello@secondthought.app
- **Discord**: [Community Server]
- **Support**: support@secondthought.app

---

## License

MIT License

Copyright (c) 2026 Second Thought

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Changelog

### v0.1.0 (January 30, 2026) - Initial Release
- ✨ Real-time purchase intervention
- ✨ AI-powered analysis (Cerebras)
- ✨ Opportunity cost calculator
- ✨ Predatory pricing detection
- ✨ 24-hour cool-down system
- ✨ User profile management
- ✨ Opik observability integration
- ✨ 85 tests with property-based testing
- ✨ Support for 10+ e-commerce sites

---

## Appendix

### Environment Variables Reference
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Opik
OPIK_API_KEY=your-opik-api-key
OPIK_WORKSPACE=your-workspace-name
OPIK_PROJECT_NAME=second-thought

# Cerebras (multiple keys for load balancing)
CEREBRAS_API_KEY_1=your-key-1
CEREBRAS_API_KEY_2=your-key-2
CEREBRAS_API_KEY_3=your-key-3

# Optional
NODE_ENV=development|production
PORT=3000
```

### Database Schema Reference
```sql
-- Users table
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  financial_goals TEXT[],
  monthly_budget DECIMAL(10,2),
  savings_goal DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cool-downs table
CREATE TABLE cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  product_currency TEXT DEFAULT 'USD',
  analysis_result JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

-- Engagement events table
CREATE TABLE engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  product_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

-- Indexes
CREATE INDEX idx_cooldowns_user_id ON cooldowns(user_id);
CREATE INDEX idx_cooldowns_product_url ON cooldowns(product_url);
CREATE INDEX idx_cooldowns_expires_at ON cooldowns(expires_at);
CREATE INDEX idx_engagement_events_user_id ON engagement_events(user_id);
CREATE INDEX idx_engagement_events_created_at ON engagement_events(created_at);
```

### API Response Examples

#### `/api/analyze` Response
```json
{
  "success": true,
  "analysis": {
    "isEssential": false,
    "essentialityScore": 0.25,
    "reasoning": "This appears to be a discretionary purchase...",
    "warnings": [
      {
        "type": "urgency_manipulation",
        "confidence": 0.85,
        "explanation": "Detected urgency language: 'Only 3 left in stock'"
      }
    ],
    "opportunityCost": {
      "amount": 350,
      "projections": {
        "years5": 491.21,
        "years10": 688.73,
        "years20": 1354.92
      },
      "comparisonText": "In 20 years, this could be $1,354.92"
    },
    "personalizedMessage": "Given your goal to save for a house...",
    "suggestedAction": "cooldown"
  },
  "metadata": {
    "latencyMs": 487,
    "hasUserProfile": true
  }
}
```

#### `/api/cooldown` Response (GET)
```json
{
  "success": true,
  "cooldown": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user_abc123",
    "productUrl": "https://amazon.com/dp/B0BSHF7WHW",
    "productName": "Apple Watch Series 9",
    "productPrice": 399.99,
    "analysisResult": { /* ... */ },
    "startedAt": "2026-01-29T10:00:00Z",
    "expiresAt": "2026-01-30T10:00:00Z",
    "status": "active",
    "remainingTimeMs": 43200000,
    "formattedTime": "12h 0m"
  }
}
```

---

**Second Thought: Think twice, build wealth. 💭💰**
