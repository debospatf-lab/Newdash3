# Horizia (MVP)

Horizia is a lightweight, role-aware dashboard that unifies Jira, GitHub, and Slack insights. This MVP uses only vanilla HTML, CSS, and JavaScript with Supabase for authentication and a simple schema for profiles, projects, issues, integrations, and audit logs.

## Tech Stack
- HTML, CSS, JavaScript (no frameworks)
- Supabase (Auth + Postgres)

## Folder Structure
```
public/
  index.html          # Landing page
  login.html          # Sign in / Sign up
  dashboard.html      # Common + personal dashboards
  styles.css          # Theme and UI
  app.js              # Auth, dashboard logic, Ask Pulse, export
  assets/             # Place logo.png and background.png here
sql/
  schema.sql          # Database schema
functions/
  oauth-exchange.ts   # Edge function stub for OAuth code exchange
  ask-pulse.ts        # Edge function stub for AI-like responses
README.md
```

## Setup
1. Create a new Supabase project.
2. Run the SQL in `sql/schema.sql` in the Supabase SQL editor.
3. In `public/app.js`, set your Supabase project details:
   ```js
   const SUPABASE_URL = 'https://YOUR-SUPABASE-URL.supabase.co';
   const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
4. Place `logo.png` and `background.png` in `public/assets/`.
5. Open `public/index.html` and try the flow locally (via a static server or Browser).

## Roles
- Admin
- Team Lead
- Project Manager
- Product Owner
- Engineering Manager

Profiles store a `role` value. Personal dashboards display content tailored to the role.

## OAuth Setup (Notes)
- Use the `functions/oauth-exchange.ts` stub as a starting point to exchange provider auth codes and store tokens in the `integrations` table.
- Providers: Jira, GitHub, Slack. Each needs Client ID/Secret and redirect URL.
- Store tokens in `public.integrations (profile_id, provider, access_token, refresh_token, scopes, expires_at)`.

## Running
- This is a static site. Open `public/index.html` in your browser or serve the `public/` folder with any static server. After sign-in, you are redirected to `dashboard.html`.

## Future Improvements
- Replace mock dashboard data with real queries (Supabase RPC/Edge Functions).
- Build robust RLS policies for all tables.
- Implement real OAuth flows per provider.
- Add charts with Canvas/SVG.
- Add pagination and search.
- Add tests and linting.

## Quality Assurance Checklist
1. Landing loads with animations and logo.
2. "Get Started" leads to `login.html`.
3. Supabase sign-up/sign-in works.
4. `dashboard.html` loads the user role and date/time.
5. Personal dashboard toggle works.
6. Logout returns to `login.html`.
7. No console errors; transitions are smooth.
8. Export CSV produces a file for the current filter.
