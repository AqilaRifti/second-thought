# Deployment Checklist

## ✅ What You've Done

1. **Deployed API to Vercel**: `https://second-thought-azure.vercel.app`
2. **Updated Extension URLs**: Changed from `localhost:3000` to your Vercel URL

## 🔧 What You Need to Do Now

### 1. Verify Environment Variables on Vercel

Go to your Vercel dashboard and make sure these environment variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
OPIK_API_KEY=your_opik_key
OPIK_WORKSPACE_NAME=your_workspace
CEREBRAS_API_KEY_1=your_cerebras_key
# Add more Cerebras keys if you have them for load balancing
```

**Important**: 
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Other variables are server-side only
- After adding/changing variables, you need to redeploy

### 2. Reload the Extension

Since you changed the manifest and JavaScript files:

1. Go to `chrome://extensions/`
2. Find "Second Thought"
3. Click the **Reload** button (circular arrow icon)
4. Or remove and re-add the extension:
   - Click "Remove"
   - Click "Load unpacked"
   - Select the `extension/` folder

### 3. Test the Deployment

**Test API Endpoints**:

```bash
# Test analyze endpoint
curl -X POST https://second-thought-azure.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "name": "Test Product",
      "price": 100,
      "currency": "USD",
      "url": "https://example.com/product"
    },
    "userId": "test-user-123"
  }'

# Test profile endpoint
curl https://second-thought-azure.vercel.app/api/profile?userId=test-user-123

# Test cooldown endpoint
curl https://second-thought-azure.vercel.app/api/cooldown?userId=test-user-123
```

**Test Extension**:

1. Visit Amazon.com or any product page
2. Open browser console (F12)
3. Look for any errors
4. The intervention panel should appear
5. Try starting a cooldown
6. Check Supabase to verify data was saved

### 4. Check CORS Settings

If you get CORS errors, you may need to configure Next.js to allow requests from the extension.

Create or update `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

Then redeploy to Vercel.

### 5. Monitor Logs

**Vercel Logs**:
- Go to Vercel Dashboard → Your Project → Logs
- Watch for errors when testing the extension

**Browser Console**:
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab to see API requests

**Supabase Logs**:
- Go to Supabase Dashboard → Logs
- Check for database errors

## 🚨 Common Issues

### Issue: "Failed to fetch" errors

**Cause**: CORS not configured or API not accessible

**Solution**:
1. Add CORS headers to `next.config.ts` (see above)
2. Redeploy to Vercel
3. Reload extension

### Issue: "User not found" or foreign key errors

**Cause**: Database migration not run

**Solution**:
1. Go to Supabase SQL Editor
2. Run `supabase/migration_fix_user_id.sql`
3. Verify with: `SELECT * FROM user_profiles LIMIT 5;`

### Issue: Extension doesn't load

**Cause**: Manifest changes not applied

**Solution**:
1. Go to `chrome://extensions/`
2. Click "Reload" on Second Thought
3. Or remove and re-add the extension

### Issue: API returns 500 errors

**Cause**: Missing environment variables or database connection issues

**Solution**:
1. Check Vercel environment variables
2. Test Supabase connection
3. Check Vercel logs for specific error

## 📊 Verification Steps

After deployment, verify everything works:

- [ ] API is accessible at `https://second-thought-azure.vercel.app`
- [ ] Environment variables are set in Vercel
- [ ] Database migration has been run
- [ ] Extension loads without errors
- [ ] Product pages show intervention panel
- [ ] AI analysis works (check response in console)
- [ ] Cooldowns can be created
- [ ] Cooldowns appear in extension popup
- [ ] Data is saved in Supabase
- [ ] Opik is receiving traces (check Opik dashboard)

## 🎯 Production Readiness

Before sharing with others:

### Security
- [ ] Remove any test/debug console.log statements
- [ ] Ensure API keys are in environment variables (not hardcoded)
- [ ] Enable Supabase Row Level Security (RLS) policies
- [ ] Add rate limiting to API endpoints

### Performance
- [ ] Test with slow network (Chrome DevTools → Network → Slow 3G)
- [ ] Verify API responses are under 1 second
- [ ] Check Vercel function execution time

### User Experience
- [ ] Test on multiple e-commerce sites
- [ ] Verify intervention panel looks good on different screen sizes
- [ ] Test cooldown notifications
- [ ] Ensure error messages are user-friendly

### Monitoring
- [ ] Set up Vercel alerts for errors
- [ ] Monitor Opik dashboard for AI quality
- [ ] Check Supabase usage/limits

## 🔄 Development vs Production

For local development, you can switch back to localhost:

**Option 1: Environment-based URL**

Create `extension/config.js`:
```javascript
const API_BASE_URL = 
  window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://second-thought-azure.vercel.app/api';
```

**Option 2: Build script**

Create separate builds for dev and prod with different API URLs.

## 📝 Next Steps

1. **Test thoroughly** with the deployed API
2. **Monitor logs** for any errors
3. **Update documentation** with the production URL
4. **Prepare for Chrome Web Store** submission (if planning to publish)
5. **Set up analytics** to track usage

## 🎉 Success Indicators

You'll know it's working when:

✅ Extension loads without errors
✅ Product pages show intervention panel
✅ AI analysis completes in <1 second
✅ Cooldowns are created and persist
✅ Data appears in Supabase
✅ Opik shows traces in dashboard
✅ No CORS errors in console
✅ API responds to all endpoints

---

**Current Status**: Extension configured for production! 🚀

**API URL**: `https://second-thought-azure.vercel.app`

**Next**: Reload extension and test on a product page!
