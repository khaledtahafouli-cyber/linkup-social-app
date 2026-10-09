# LinkUp — Social App Starter

A mobile-friendly friends and real-time messaging web app built with React, Vite, Supabase, and Vercel.

## Features in this starter

- Email/password sign-up and sign-in
- User profiles with unique usernames
- Search for other registered users
- Send, accept, and decline friend requests
- Private one-to-one chat after a friendship is accepted
- Real-time incoming messages
- Responsive desktop and mobile layouts
- Row Level Security policies in Supabase

## Important status

This is a functional starter project, not a fully production-audited social network. It does not yet include group chats, media uploads, push notifications, blocking/reporting, message editing/deletion, rate limiting, or end-to-end encryption. Do not promise end-to-end encryption. Before public launch, add abuse reporting, blocking, rate limits, stronger account recovery, and test the RLS policies carefully.

## 1. Requirements

- Node.js 20 or newer
- A free Supabase project
- A GitHub account (for deployment)
- A Vercel account (for deployment)

## 2. Set up Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, copy all of it, paste it into SQL Editor, and run it.
4. Open **Project Settings → API** (or the Connect panel) and copy the Project URL and the publishable/anon key.
5. In **Authentication → URL Configuration**, add your local URL `http://localhost:5173` to the allowed redirect/site URLs. Later, add your Vercel production URL too.
6. For easiest first testing, you can turn off email confirmation in Auth settings; for a public app, keep email confirmation enabled and configure email delivery properly.

## 3. Run locally

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## 4. Test the friend/chat flow

1. Register account A with a username.
2. Open a private/incognito browser window and register account B with a different email and username.
3. In account A, open **Find people** and send a friend request to account B.
4. In account B, open **Friends** and accept the request.
5. Return to account A, open **Messages**, select the friend, and send a message.
6. Keep both sessions open to test realtime updates.

## 5. Deploy to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework should be detected as **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. In Vercel Project Settings → Environment Variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Add the final `https://your-project.vercel.app` URL to Supabase Authentication URL Configuration.
6. Redeploy after changing environment variables.

## Security notes

- Only use the Supabase publishable/anon key in the frontend, never the service-role key.
- RLS is enabled in the provided schema. Review and test it before inviting real users.
- This starter allows authenticated users to discover usernames. Do not store sensitive private information in public profile fields.
- Messaging is not end-to-end encrypted. Supabase and project operators may technically access stored data according to their platform permissions.
- Add blocking, reporting, anti-spam controls, rate limiting, and a privacy policy before a broad public release.
