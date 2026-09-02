# Deploying carpool.guykats.com to Hostinger (hPanel shared hosting)

Same account, same conventions as home.guykats.com (see that app's
DEPLOYMENT.md for the full backstory on why this ended up webhook-based
instead of cron or direct-SSH).

## Quick reference

| What | Value |
| --- | --- |
| SSH | `ssh -p 65002 u823311221@82.198.227.90` |
| App path (git working copy) | `/home/u823311221/domains/carpool.guykats.com/app` |
| Webroot symlink | `/home/u823311221/domains/carpool.guykats.com/public_html` → `app/public` |
| PHP binary | `/opt/alt/php83/usr/bin/php` (not on `PATH` by default) |
| Composer | on `PATH` for interactive/cron shells - **confirm with `which composer`**, needed explicitly for the webhook's PHP-FPM subprocess |
| Server's checked-out branch | `deploy` (not `main`) |
| Deploy trigger | CI POSTs to `/deploy-webhook` right after pushing to `deploy` - no cron, no SSH, no manual step for normal deploys |
| DB | MySQL - create in hPanel, will be named `u823311221_something` |

## 1. One-time manual setup (SSH)

```bash
cd ~/domains/carpool.guykats.com
mkdir -p app
cd app
git clone https://github.com/YOUR_GITHUB_USERNAME/carpool-manager.git .
git checkout main
```

Point at PHP 8.3 (same alias trick as the home app):
```bash
echo 'alias php=/opt/alt/php83/usr/bin/php' >> ~/.bashrc
source ~/.bashrc
php -v   # confirm 8.3.x
which composer   # note this down - it goes into DeployWebhookController.php
```

```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

## 2. Database

hPanel → Databases → MySQL Databases → create one (e.g. `carpool`, ends
up as `u823311221_carpool`). Note the password.

## 3. `.env`

```bash
cp .env.production.example .env
nano .env
```
```
APP_URL=https://carpool.guykats.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=u823311221_carpool
DB_USERNAME=u823311221_carpool
DB_PASSWORD=your_db_password
```
```bash
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force   # creates the admin + 7 placeholder children -
                               # SAVE the admin UUID it prints, it's the only login
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 4. Symlink public_html

```bash
cd ~/domains/carpool.guykats.com
rmdir public_html   # only works while empty
ln -s app/public public_html
```

## 5. Frontend assets (no Node on the server)

Build locally and upload once for this first deploy:
```bash
npm ci
npm run build
scp -P 65002 -r public/build u823311221@82.198.227.90:~/domains/carpool.guykats.com/app/public/build
```
Every push after this is built automatically by GitHub Actions.

## 6. Verify

Visit `https://carpool.guykats.com`. If it doesn't load, check
`~/domains/carpool.guykats.com/app/storage/logs/laravel.log`.

## 7. Switch the server to track `deploy`, wire up CI

```bash
cd ~/domains/carpool.guykats.com/app
git fetch origin
git checkout -B deploy origin/deploy
```

In the GitHub repo → Settings → Secrets → Actions:
```
DEPLOY_WEBHOOK_URL=https://carpool.guykats.com/deploy-webhook
```

Push to `main` once. This first push is the bootstrap - the webhook
route needs to already be live on the server (from step 3's caches)
before CI can call it successfully.

## Notes

- `APP_DEBUG=false` in production - it's already `false` in
  `.env.production.example`.
- No queue workers needed - this app has no queued jobs.
- If `which composer` above returned something other than a bare
  `composer` resolvable via a short PATH, update the `PATH` env array
  and the composer invocation in `DeployWebhookController.php`
  accordingly (it currently assumes composer resolves via
  `/opt/alt/php83/usr/bin:/usr/local/bin:/usr/bin:/bin`).
