# Database Fix Instructions

## Problem Summary

The cooldown feature wasn't working because of a type mismatch between the database schema and the application code:

1. **Database Schema Issue**: 
   - `user_profiles.id` was defined as `UUID` with auto-generation
   - `cooldowns.user_id` and `interventions.user_id` were `UUID` types
   - But the extension generates **string UUIDs** (like `"550e8400-e29b-41d4-a716-446655440000"`)

2. **User Registration Issue**:
   - The `/api/analyze` endpoint wasn't creating user profiles
   - Users were only created when starting a cooldown, but by then the foreign key constraint would fail

## Solution

### Step 1: Update Database Schema

Run the migration script in your Supabase SQL Editor:

```bash
# File: supabase/migration_fix_user_id.sql
```

This migration:
- Changes `user_profiles.id` from `UUID` to `TEXT`
- Changes `cooldowns.user_id` from `UUID` to `TEXT`
- Changes `interventions.user_id` from `UUID` to `TEXT`
- Removes auto-generation of UUIDs
- Maintains foreign key constraints

### Step 2: Code Changes (Already Applied)

✅ **Fixed `/api/analyze` route**: Now calls `getOrCreate(userId)` instead of just `get(userId)`
✅ **Fixed `/api/profile` route**: Now passes `id: userId` when creating profiles
✅ **Fixed `/api/cooldown` route**: Already had `getOrCreate(userId)` call

## How to Apply the Fix

1. **Backup your database** (if you have any data):
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM user_profiles;
   SELECT * FROM cooldowns;
   SELECT * FROM interventions;
   ```

2. **Run the migration**:
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `supabase/migration_fix_user_id.sql`
   - Paste and execute

3. **Restart your Next.js server**:
   ```bash
   npm run dev
   ```

4. **Test the flow**:
   - Open the extension
   - Visit a product page (e.g., Amazon)
   - Click "Start 24h Cool-Down"
   - Check Supabase to verify:
     - User was created in `user_profiles`
     - Cooldown was created in `cooldowns`

## Verification Queries

After applying the fix, run these queries in Supabase to verify:

```sql
-- Check user profiles
SELECT id, created_at FROM user_profiles ORDER BY created_at DESC LIMIT 5;

-- Check cooldowns
SELECT id, user_id, product_url, status, expires_at 
FROM cooldowns 
ORDER BY created_at DESC 
LIMIT 5;

-- Verify foreign key relationship
SELECT 
  c.id as cooldown_id,
  c.user_id,
  u.id as user_profile_id,
  c.product_url,
  c.status
FROM cooldowns c
LEFT JOIN user_profiles u ON c.user_id = u.id
ORDER BY c.created_at DESC
LIMIT 5;
```

## What Changed

### Database Schema (`supabase/schema.sql`)
```sql
-- BEFORE
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ...
);

-- AFTER
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  ...
);
```

### API Routes

**`/api/analyze`**:
```typescript
// BEFORE
userProfile = await userProfileManager.get(userId) ?? undefined;

// AFTER
userProfile = await userProfileManager.getOrCreate(userId);
```

**`/api/profile`**:
```typescript
// BEFORE
profile = await userProfileManager.create(profileData);

// AFTER
profile = await userProfileManager.create({ ...profileData, id: userId });
```

## Expected Behavior After Fix

1. User visits product page → Extension generates userId (UUID string)
2. Extension calls `/api/analyze` → User profile created automatically
3. User clicks "Start Cool-Down" → Cooldown created with valid foreign key
4. User revisits page → Cooldown is retrieved and displayed
5. Settings sync → Profile updates work correctly

## Troubleshooting

### If cooldowns still don't show:

1. **Check browser console** (F12):
   ```javascript
   // Should see userId
   chrome.storage.local.get(['userId'], (result) => console.log(result));
   ```

2. **Check API logs**:
   ```bash
   # In terminal where Next.js is running
   # Look for errors when calling /api/cooldown
   ```

3. **Check Supabase logs**:
   - Go to Supabase Dashboard → Logs
   - Look for INSERT errors on `cooldowns` table

4. **Verify foreign key constraint**:
   ```sql
   -- Should return the constraint
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE conname = 'cooldowns_user_id_fkey';
   ```

### If you get "foreign key violation" errors:

This means a cooldown is being created with a userId that doesn't exist in user_profiles.

**Solution**: Make sure the `/api/analyze` endpoint is called BEFORE `/api/cooldown`. The analyze endpoint now creates the user profile.

## Clean Slate (Optional)

If you want to start fresh:

```sql
-- Delete all data (WARNING: This deletes everything!)
TRUNCATE TABLE interventions CASCADE;
TRUNCATE TABLE cooldowns CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- Then run the migration again
```

## Success Indicators

✅ User profile created in database when first visiting a product page
✅ Cooldown created successfully when clicking "Start 24h Cool-Down"
✅ Cooldown appears in extension popup under "Cool-Downs" tab
✅ Cooldown persists across browser restarts
✅ No foreign key constraint errors in logs

---

**Status**: Ready to test after running migration! 🚀
