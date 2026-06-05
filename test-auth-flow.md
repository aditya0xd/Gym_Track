# Testing Login Flow

## Steps to verify the fix:

1. **Clear cookies and cache**
   - Open DevTools (F12)
   - Go to Application → Cookies → Clear All
   - Clear cache

2. **Test Owner Login**
   - Go to `/login`
   - Use test credentials (from .env):
     - Email: `seed-admin@gym.local` or `demo.manager@gym.local`
     - Password: `GymPass123!`
   - Click Login
   - Should redirect to `/owner/dashboard`

3. **Verify session in DevTools**
   - Open DevTools → Application → Cookies
   - Look for `next-auth.session-token` cookie
   - It should exist and not be expired

4. **Check middleware logs** (if needed)
   - Open DevTools → Console
   - Look for any auth-related errors
   - Check Network tab for `/api/auth/callback/credentials` response

5. **Test Superadmin Login**
   - Go to `/login`
   - Email: `superadmin@gym.local`
   - Password: `GymPass123!`
   - Should redirect to `/superadmin/gym-owners`

## If Still Not Working:

1. **Check NEXTAUTH_SECRET is loaded:**
   - The middleware.ts and auth.ts should use the same secret
   - Both should read from environment variables

2. **Verify middleware runs:**
   - Add temporary console.log in middleware.ts to debug

3. **Check token extraction:**
   - The middleware must successfully call `getToken()`
   - This requires the exact same secret used during JWT encoding

4. **Look for 401/403 errors:**
   - If middleware redirects to /login, the token wasn't recognized
   - This usually means secret mismatch or cookie not being sent
