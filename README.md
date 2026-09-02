# Carpool Manager

Carpool scheduling app for a kids' soccer club (7 children, Monday/Wednesday
practices). No accounts, no passwords - a parent picks their name and child
from a fixed list and gets an identity persisted as a UUID in LocalStorage.
See `PRD.md`-equivalent design notes in the project's Claude Project
knowledge for the full spec.

## Stack

Laravel 13 + Inertia.js + React 19 + TypeScript + Tailwind v4 + Vite.
SQLite locally, MySQL in production (Hostinger shared hosting).

## Local development

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan db:seed   # creates the admin + 7 placeholder children -
                       # prints the admin's UUID, which is its only login
php artisan serve --port=8123
npm run dev            # in a second terminal
```

Type-check before considering a frontend change done:
```bash
npx tsc --noEmit
```

To act as the seeded admin locally, put the printed UUID in LocalStorage:
```js
localStorage.setItem('carpool_parent_uuid', 'PASTE_THE_UUID_HERE')
```
then visit `/admin`.

## Deployment

See `DEPLOYMENT.md` for the full Hostinger (hPanel shared hosting)
walkthrough - webhook-based deploy triggered by `.github/workflows/deploy.yml`
on every push to `main`, no SSH/cron required for normal deploys.

## What's not built yet

- Admin UI for overriding an individual shift (assign/cancel any slot, edit
  a one-off time) - the backend routes/controller methods exist
  (`AdminController::overrideShift`, `editShiftTime`), just no button for
  them yet in `resources/js/pages/admin.tsx`.
- "Add to calendar" only offers a Google Calendar link, not an `.ics`
  download.
- No automated tests for the app-specific code (migrations, models,
  controllers, pages) - only the starter kit's own example tests remain.
