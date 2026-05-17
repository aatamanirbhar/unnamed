# Omenly

Omenly is a decision-oracle web app: users can ask "Should I...", get a random machine sign, or create a limited anonymous voting link that closes after its response slots are claimed.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. Add your Supabase URL and anon key to `.env.local`.

4. In Supabase SQL Editor, run `supabase/schema.sql`.

5. Enable OAuth providers in Supabase Auth for Google and Discord. Instagram may require a custom OAuth/provider setup depending on your Supabase project configuration.

6. Run the app:
   ```bash
   npm run dev
   ```

## Email Results

Deploy `supabase/functions/finalize-sign` as an Edge Function and set:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
RESULTS_FROM_EMAIL="Omenly <signs@yourdomain.com>"
FINALIZE_SIGN_SECRET=...
```

The frontend calls this function when a sealed sign receives a response, and owners can also press "Send result" from the dashboard.
