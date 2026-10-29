# MedTrack – fresh setup (JavaScript + Admin)

## 1. Create the new Supabase project
1. supabase.com -> **New project** (save the database password).
2. **SQL Editor -> New query**, paste the whole of `supabase/fresh_database.sql`, press **Run**.
   It builds every table, the security rules, sign-up automation, the caregiver/missed-dose/edit
   functions, and the admin tools. (Safe to run twice.)
3. **Authentication -> Providers -> Email**: leave **Confirm email ON** (new members must click the link in their email first). See "Email confirmation" below – you MUST set up custom SMTP or real users will not receive the email.

## 2. Point the app at it
    copy .env.example .env        (Windows CMD)   |   cp .env.example .env
Fill in **Project URL** and the **publishable/anon key** (Project Settings -> API). Never put the
`service_role` key in the app.

    npm install
    npx expo start -c

## 2b. Find Pharmacy (Google Places API)
1. console.cloud.google.com -> create/select a project -> **Billing** must be on (Google gives a monthly free allowance).
2. **APIs & Services -> Library** -> enable **Places API (New)**.
3. **Credentials -> Create credentials -> API key**. Restrict it to **Places API (New)** and, once you
   publish, to your Android package / iOS bundle ID.
4. Put it in `.env` as `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...` and restart with `npx expo start -c`.
Without a key, Find Pharmacy still works but opens the phone's maps app instead of showing results.

## 3. Make yourself admin
Create your account in the app first, then in the SQL Editor:

    update public.profiles set role = 'admin' where email = 'you@example.com';

Sign out and in. **Profile -> Administration -> Admin Console** appears.

## 4. Optional cloud functions
    npm i -g supabase
    supabase login
    supabase link --project-ref <your-project-ref>
    supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
    supabase functions deploy dosewise-ai        # cloud AI (the assistant still answers offline without it)
    supabase functions deploy scan-prescription  # reads photos of prescriptions (Scan Prescription screen)
    supabase functions deploy admin-users        # needed only for "Delete account" in Admin

## 5. Reminders
Settings -> **Send a test reminder** / **Refresh my reminders**.
Android: allow notifications + "Alarms & reminders", set battery to Unrestricted.

## Files
- `supabase/fresh_database.sql` – everything for a NEW project (core_schema.sql + admin_setup.sql)
- `supabase/admin_setup.sql` – admin tools only, for an existing database

## Email confirmation (Confirm email = ON)
Supabase's built-in email sender only delivers to your own team's addresses and allows about
2 emails per hour, so real users would never get the confirmation link. Before sharing the app:
1. Create a free account with an SMTP email service (Brevo, Resend, SendGrid, Gmail app password...).
2. Supabase -> **Authentication -> Emails -> SMTP Settings** -> turn on **Enable custom SMTP** and
   fill in the host, port, username, password and sender email from that service. Save.
3. **Authentication -> URL Configuration -> Site URL**: set a real page (e.g. your GitHub Pages /
   a simple "Email confirmed, return to the app" page). The link confirms the account first, then
   opens this URL, so it must not be the default localhost address.
4. Test: sign up with a real address, click the link, then sign in. If the email does not arrive,
   the Login screen has a **Resend email** button.
