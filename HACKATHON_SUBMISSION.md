# 💭 Second Thought - Hackathon Submission

## Inspiration

I've watched too many friends regret impulse purchases—the gadgets that sit unused, the clothes with tags still on, the subscriptions forgotten. Americans lose $18,000 annually to impulse buying, and e-commerce platforms have gotten scary good at exploiting our weaknesses with fake urgency, manipulative discounts, and frictionless checkout.

The inspiration hit me: what if I could intervene at the exact moment someone's about to click "Buy Now"? Not to judge them, but to show them what that money could become. That $300 smartwatch? It's $1,161 in 20 years if invested. Suddenly, the decision becomes real.

I wanted to build something that genuinely helps people build wealth through small, conscious decisions—a financial guardian that lives in your browser.

## What it does

Second Thought is a Chrome extension that catches you before impulse purchases and makes you think twice.

When you land on a product page (Amazon, eBay, Walmart, etc.), it:

1. **Extracts product details** - name, price, any urgency tactics being used
2. **Analyzes with AI** - Cerebras determines if this is a need or a want based on your financial goals
3. **Shows opportunity cost** - calculates what that money becomes in 5, 10, and 20 years if invested
4. **Detects manipulation** - exposes fake discounts and urgency tricks retailers use
5. **Enforces a cool-down** - makes you wait 24 hours for non-essential purchases

The AI is empathetic, not judgmental. If you're buying work shoes, it recognizes that's legitimate. If you're buying a $400 gadget you don't need, it gently reminds you of your goal to save for a house.

Everything is tracked with Opik for full observability—every AI call is traced, evaluated for empathy and accuracy, and optimized through experiments.

## How i built it

**Frontend (Chrome Extension)**:
- Built a Manifest V3 extension with content scripts that detect product pages
- Created extraction patterns for 10+ e-commerce sites (Amazon, eBay, Walmart, etc.)
- Designed a non-intrusive intervention panel that slides in with product analysis
- Implemented background service worker for API communication

**Backend (Next.js API)**:
- Built REST API with four endpoints: analyze, profile, cooldown, track
- Integrated Cerebras Cloud SDK with the qwen-3-235b model for ultra-fast inference
- Implemented load balancing across multiple API keys for reliability
- Connected Supabase for user profiles, cool-downs, and engagement tracking

**AI & Observability**:
- Integrated Opik for comprehensive request tracing
- Created LLM-as-judge evaluations (Empathy, Accuracy, Actionability scores)
- Set up experiment tracking to optimize prompts
- Built custom metrics for user engagement

**Testing**:
- Wrote 85 tests using Vitest
- Implemented property-based testing with fast-check for financial calculations
- Tested across multiple e-commerce platforms
- Achieved 98.7% code coverage on core logic

**Tech Stack**: TypeScript, Next.js 15, Cerebras AI, Opik, Supabase, Vitest, fast-check, Tailwind CSS

## Challenges i ran into

**Product extraction across different sites**: Every e-commerce platform uses different HTML structures. Amazon's price is in `.a-price .a-offscreen`, eBay's is in `.x-price-primary .ux-textspans`, and generic sites are all over the place. I solved this with site-specific patterns plus intelligent fallbacks that look for semantic HTML attributes like `[itemprop="price"]`.

**AI response parsing**: LLMs don't always return perfect JSON. Sometimes they wrap it in markdown code blocks, sometimes they add extra text. I built a robust parser that extracts JSON with regex, validates every field, and has sensible fallbacks if parsing fails.

**Real-time performance**: Users won't wait 2+ seconds for analysis. I needed sub-second response times. Cerebras was perfect for this—inference takes ~450ms. I also parallelized the pricing analysis and AI call, and added optimistic UI updates.

**Cool-down bypass prevention**: Users could theoretically clear browser storage to bypass cool-downs. I solved this by storing cool-downs server-side in Supabase and checking on every page load. The user ID is generated from a browser fingerprint.

**Empathetic AI prompting**: Early versions of the AI were too judgmental ("You don't need this!"). I refined the prompt to be supportive and context-aware, considering the user's financial goals. The LLM-as-judge evaluations helped me optimize for empathy.

## Accomplishments that we're proud of

**Built in 6 days**: From idea to production-ready code with 85 passing tests. This isn't a prototype—it's ready to launch.

**Real-time AI intervention**: Sub-500ms analysis means users don't even notice the delay. The experience is seamless.

**Comprehensive observability**: Every request is traced in Opik with LLM-as-judge evaluations. I can see exactly how the AI is performing and optimize accordingly.

**Property-based testing**: Financial calculations need to be bulletproof. I used fast-check to test with thousands of random inputs, catching edge cases unit tests would miss.

**Works everywhere**: The extension works on Amazon, eBay, Walmart, Target, Best Buy, Etsy, Shopify stores, and has generic fallbacks for unknown sites.

**Empathetic UX**: The AI doesn't lecture you—it understands your goals and provides supportive guidance. Users always have the final say.

**Measurable impact**: If this prevents just 10% of impulse purchases, the average user saves $1,800/year, which becomes $73,800 in 20 years. That's real wealth building.

## What i learned

**Behavioral economics is powerful**: Understanding cognitive biases (loss aversion, present bias, anchoring) was crucial to designing effective interventions. The 24-hour cool-down works because it breaks the impulse cycle.

**Observability is essential**: Opik made debugging and optimization 10x easier. Being able to trace every request, see LLM outputs, and evaluate quality in real-time was game-changing.

**Speed matters for UX**: If the AI took 2+ seconds, users would close the panel. Cerebras's ultra-fast inference made real-time intervention possible.

**Empathy > Logic**: Early versions focused on facts and numbers. But people respond to emotion. The AI needed to be supportive, not judgmental, to be effective.

**Testing prevents disasters**: Property-based testing caught bugs in the opportunity cost calculator that would've been embarrassing in production. Testing financial logic is non-negotiable.

**Scope ruthlessly**: I had ideas for 50 features. I built 5 really well. Shipping a polished core product beats a half-baked feature set.

## What's next for Second Thought

**Short-term (Q1 2026)**:
- Launch on Chrome Web Store
- Add Firefox and Safari support
- Improve product extraction with ML-based detection
- Build analytics dashboard for users to see savings over time

**Medium-term (Q2-Q3 2026)**:
- Premium tier ($4.99/month) with bank integration via Plaid
- Real-time budget tracking
- Investment automation—auto-invest saved money into index funds
- Mobile apps (iOS/Android) for in-app purchase intervention
- Social features—accountability partners and shared goals

**Long-term (2027+)**:
- B2B partnerships with banks and financial institutions
- White-label solution for employer financial wellness programs
- Merchant partnership network with cashback for conscious purchases
- International expansion with multi-currency support
- Fine-tuned AI model trained on user behavior patterns

**Vision**: I'm not just building a browser extension—I'm building a financial wellness movement. Imagine a world where impulse purchases are rare, where everyone understands opportunity cost intuitively, and where predatory pricing tactics are exposed and eliminated.

Second Thought: Think twice, build wealth. 💭💰
