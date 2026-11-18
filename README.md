s# Chow — food, found around the corner

A mobile-first food delivery marketplace concept for Lagos, built with Expo and React Native. Explore neighborhood restaurants, save favorites, add meals to a persistent bag, and follow the order from kitchen to courier. The same project includes courier and admin workspaces backed by Supabase, live order updates, and Paystack checkout.

**Project format:** interactive portfolio / course-project submission. The app opens in a customer-only sample-data mode. Courier and admin workspaces require an account with the matching role in Supabase; customers cannot open the admin dashboard. The app runs on iOS, Android, and in a desktop or mobile web browser. Connect the services below to enable real accounts and orders.

## Project showcase

- **Customer experience:** searchable restaurant discovery, cuisine filters, saved restaurants, restaurant menus, a persisted cart, delivery checkout, and a Lagos restaurant map.
- **Demo catalogue:** 10 fictional Lagos-style restaurants with distinct cuisines, delivery fees, ratings, map locations, and sample menus. Replace these listings with real partner data before production.
- **Courier experience:** assigned order previews, foreground-only location sharing, pickup/delivery status updates, and customer-visible realtime tracking.
- **Operations experience:** protected order overview, order status controls, courier assignment, and payment-aware delivery metrics.
- **Backend:** Supabase authentication, Postgres schema and row-level security, Edge Functions, Realtime subscriptions, Expo push notifications, and Paystack payment initialization and verification.

### Quick demo

1. Install and start the project using the steps below.
2. Open **Saved** to see an empty state; tap a heart on a restaurant, then revisit the filter. Favorites and your bag persist between launches.
3. Search a dish or restaurant and switch cuisine filters.
4. Open a restaurant, add a dish, adjust its quantity in the bag, and preview checkout.
5. Tap the delivery preview card to inspect the sample order timeline.

The demo walkthrough never pretends sample operations or payment data are real. Admin and courier accounts are provisioned separately; there is no customer-facing role switch.

## Stack

- Expo + React Native + TypeScript
- Expo Router and Zustand
- Supabase Auth, Postgres, Row Level Security, Edge Functions, and Realtime
- `react-native-maps` Google provider with a custom map style
- Expo Location, Notifications, and Web Browser
- Paystack hosted checkout (the secret key stays on the server)
- EAS Build

## Project layout

```text
app.config.ts
src/
  app/              Expo Router pages, layouts, and typed navigation
  components/       Reusable buttons, saved restaurant cards, delivery map
  config/           Theme and Google Maps styling
  data/             Local browsing preview data
  lib/              Supabase client
  screens/          Customer, auth, courier, tracking, and admin screens
  services/         Auth, orders, payments, notifications, and location
  store/            Persistent Zustand cart, saved restaurants, and preview state
  types/            Shared application types
supabase/
  migrations/       Schema, row-level policies, indexes, and seed listings
  functions/        Order creation, Paystack verification, and push/payment webhooks
```

## Requirements and local setup

- Node.js LTS and npm
- A web browser for the web preview; Expo Go for basic native UI previews; a development or EAS native build is required to validate Google Maps, push notifications, and native integrations
- A Supabase project, Google Maps Platform project, Paystack account, and Expo/EAS account for production features
- Local iOS builds require macOS; from Windows, use an EAS cloud build to produce an iOS app.

1. Install packages:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` and set the Supabase project URL, **publishable/anon client key**, and Google Maps API key. Never put a Supabase `service_role` or Paystack secret in an `EXPO_PUBLIC_` variable or mobile app.

3. Start the app:

   ```powershell
   npx expo start
   ```

   The restaurant list, menu, saved favorites, bag, and sample delivery timeline work without backend credentials. Sign-in, real checkout, courier actions, and live tracking require a configured backend and an authenticated account. The admin screen is unavailable until Supabase is configured and the signed-in account has been explicitly promoted to `admin`.

### Credential safety

The checked-in `.env.example` is only a placeholder template. If you previously used real credentials in that file, treat the Supabase secret key and Google Maps key as exposed: rotate them in their provider dashboards, update your local/EAS configuration and Supabase function secrets, and restrict the replacement Maps key. A Supabase publishable/anon key is intended for client use, but it must only be used with correct Row Level Security policies. Never put a Supabase secret/service-role key or Paystack secret in the app environment.

### Run in a web browser

Start the browser version with:

```powershell
npm run web
```

Or run `npx expo start --web`. The browser preview supports restaurant browsing, saved favorites, the bag, and sample tracking. Native Google Maps and push notifications are only available in the iOS and Android apps; the web map preview links restaurant locations to Google Maps.

## Step-by-step: customer and admin accounts

1. **Create your Supabase project.** Save its project URL and publishable/anon key. Never use the service-role key in the mobile app.
2. **Configure the app environment.** In PowerShell, run `Copy-Item .env.example .env`, then set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`. Add the Google Maps key if you want the map to render.
3. **Apply the database schema.** Install the Supabase CLI, then run:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

4. **Enable sign-in.** In Supabase, open **Authentication → Providers** and enable Email. Configure email confirmation and redirect URLs for your project. Enable Phone and configure an SMS provider only if you intend to use phone OTP.
5. **Start the app and create accounts.** Run `npm install` and `npx expo start`. From **Your account**, choose **New to Chow? Create an account**, then enter each person's full name and email. Create a customer account and a second, separate account for the person who will operate the admin panel. Each account starts as `customer`.
6. **Promote only the operator account.** In the Supabase SQL Editor, replace the email below and run:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id
     from auth.users
     where email = 'admin@example.com'
   );

   select id, full_name, role
   from public.profiles
   where id = (
     select id
     from auth.users
     where email = 'admin@example.com'
   );
   ```

   Confirm that the query shows `admin`. The target user must sign up and have a profile before you run this SQL.
7. **Sign in as the operator.** In the app, open **Your account**, tap **Sign out**, then sign in using the promoted admin credentials. The **Admin dashboard** link appears on the home screen only for the promoted admin account.
8. **Verify customer isolation.** Sign out and sign in with the customer account. The customer home has no admin entry point. If a customer manually opens `/admin`, the app shows an access-denied screen; Supabase row-level security also blocks admin data and actions.

To add a courier, create another account, then run the same profile update with `role = 'driver'`. Do not promote accounts from client code. The app's role checks are for navigation and UX; Supabase Row Level Security is the data-access boundary.

## Supabase setup

Install the Supabase CLI and sign in, then link and deploy:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set PAYSTACK_SECRET_KEY=YOUR_PAYSTACK_SECRET_KEY
supabase secrets set PAYSTACK_CALLBACK_URL=https://YOUR_PUBLIC_CALLBACK_URL
supabase functions deploy create-order
supabase functions deploy initialize-payment
supabase functions deploy verify-payment
supabase functions deploy paystack-webhook
supabase functions deploy send-order-notification
```

For a smooth and safer setup:

1. Use a separate Supabase project for development and production, and choose the closest available region to your customers. Keep the sample restaurant/menu rows for development only; replace them with verified partner data before launch.
2. Apply schema changes through the checked-in migrations (`supabase db push`) rather than making untracked production-only table changes. The migrations enable Row Level Security and add `orders` and `driver_locations` to Realtime.
3. Configure Authentication → URL Configuration with the real app/site redirect URLs. Enable Email; configure an SMS provider before enabling phone sign-in. Test email confirmation and password recovery using the URLs your app actually handles.
4. Deploy the Edge Functions and set only server-side values as function secrets: Paystack test credentials and callback URL, plus a strong random `ORDER_WEBHOOK_SECRET`. Supabase supplies its project URL and server keys to Edge Functions. Keep those server keys out of `.env`, EAS client variables, and source control.
5. Add the Paystack `orders` update webhook described below. Test a new customer order, status update, payment success/failure, and notification with test accounts and Paystack test mode.
6. Verify Row Level Security using separate customer, driver, and admin accounts: customers should only see their own orders, drivers only assigned orders, and only trusted operators should have the admin role. Do not rely on hiding screens as an access control.
7. Before production, enable an appropriate backup/PITR plan, monitor database and Edge Function logs/usage, configure budget alerts, and test restore and payment reconciliation. Review Auth rate limits and project quotas as real traffic grows.

Set the Paystack webhook URL in the Paystack dashboard to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

The webhook function has JWT verification disabled in `supabase/config.toml` because Paystack signs requests; it verifies the `x-paystack-signature` HMAC before changing payment state. All other functions require a signed-in user. Test the complete payment flow with Paystack test credentials and webhook events before enabling live keys.

For push delivery, set `ORDER_WEBHOOK_SECRET` using `supabase secrets set ORDER_WEBHOOK_SECRET=YOUR_RANDOM_SECRET`. In Supabase Database Webhooks, add an `orders` table `UPDATE` webhook targeting `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-order-notification` and include the header `x-order-webhook-secret: YOUR_RANDOM_SECRET`. The function ignores payment-only updates and sends order status notifications through Expo Push Service.

### Authentication and roles

Enable Email and Phone providers under Supabase Authentication. Configure an SMS provider and production email templates/redirect URLs in Supabase. Email-password signup and phone OTP request/verification are wired in the app.

New users default to `customer`. Promote a trusted operator or courier from the Supabase SQL editor after they create an account:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'operator@example.com');

update public.profiles
set role = 'driver'
where id = (select id from auth.users where email = 'courier@example.com');
```

The mobile Admin screen is a protected operations overview, not a standalone web console. Database policies restrict order data to its customer, assigned courier, or admins. Customer and courier role changes cannot be made from the client. Never ship the Supabase service-role key.

## Maps API key and Android SHA-1

1. In Google Cloud Console, create/select a project, enable billing, and enable **Maps SDK for Android** and **Maps SDK for iOS**. Enable **Places API** too only if you add address autocomplete.
2. Create a separate API key per environment. Restrict its APIs to the Maps SDKs your app uses. For release Android keys, restrict by the Android package `com.chow.delivery` and the SHA-1 certificate fingerprint. iOS keys should be restricted to the iOS app/bundle ID `com.chow.delivery`.
3. For the local Android debug certificate, run in PowerShell:

   ```powershell
   keytool -list -v -alias androiddebugkey -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -keypass android
   ```

   Copy the `SHA1` value. If the debug keystore does not exist yet, create an Android build first.
4. For an EAS-managed Android release key, run `eas credentials --platform android` and view the keystore certificate fingerprint. Add that SHA-1 alongside the debug fingerprint if you also use the same restricted API key for local builds. Prefer separate debug and release keys.
5. Add the appropriately restricted key to `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in your local `.env` and the matching EAS environment. The app config inserts it into Android and iOS native Maps configuration. Restart/rebuild after changing native keys.

The app's Android package and iOS bundle ID are both `com.chow.delivery`. If you change either, update the Google Cloud restrictions to match.

## EAS build and release

1. Run `npx eas-cli@latest login`, then `npx eas-cli@latest init` and set the generated project ID as `EAS_PROJECT_ID` in `.env` and the EAS build environment.
2. Add `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, and `EAS_PROJECT_ID` to your EAS `preview` and `production` environments. These app values are bundled into the client; keep server secrets in Supabase function secrets only.
3. Build:

   ```powershell
   npx eas-cli@latest build --profile development --platform android
   npx eas-cli@latest build --profile preview --platform android
   npx eas-cli@latest build --profile production --platform all
   ```

4. Set up signing credentials with EAS when prompted. Inspect the final release signing certificate fingerprint with `npx eas-cli@latest credentials --platform android` and add it to the Android Maps API restriction.
5. For store submission, configure the app identifiers, privacy disclosures, notification credentials, screenshots, and store metadata, then use `npx eas-cli@latest submit --platform android` or `npx eas-cli@latest submit --platform ios`.

The development profile uses the included Expo development client. The preview profile produces an installable Android APK for QA.

## Payments, notifications, and location

- Paystack initialization and webhook verification run in Supabase Edge Functions; mobile checkout opens the provider-hosted page. The webhook validates signature, order reference, currency, and amount before marking an order paid.
- Order status and driver locations use Supabase Realtime. Courier location sharing is foreground-only and requires location permission; the courier must keep the app open. Background tracking is intentionally not enabled.
- Push token registration requests permission only after a user taps **Enable order notifications**. Configure Expo push credentials for each EAS app and configure the Supabase Database Webhook before expecting order notifications.
- Configure and verify address geocoding, delivery zones, taxes, fees, cancellation/refund policy, restaurant availability, courier assignment, customer support, and payment reconciliation before production.

## Useful commands

```powershell
npm run start
npm run android
npm run ios
npm run web
npm run typecheck
npx expo install --check
npx expo export --platform android
```

Before sharing this as a submission, add your own screenshots or a short screen recording, test on a physical Android or iOS device, and include only credentials from your own restricted development projects. Never commit `.env` or signing keys.
