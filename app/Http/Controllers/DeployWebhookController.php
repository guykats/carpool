<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Receives a plain HTTPS POST (no inbound SSH needed - see
 * stackandhostingerdeploy.md) after CI pushes built assets to the `deploy`
 * branch, and pulls the update in place.
 */
class DeployWebhookController extends Controller
{
    public function __invoke()
    {
        $lock = Cache::lock('deploy-webhook', 120);

        if (! $lock->get()) {
            return response()->json(['ok' => true, 'deployed' => false, 'reason' => 'already in progress']);
        }

        try {
            $repoPath = base_path();

            $this->run(['git', 'fetch', 'origin', 'deploy'], $repoPath);

            $localHead = trim($this->run(['git', 'rev-parse', 'HEAD'], $repoPath));
            $remoteHead = trim($this->run(['git', 'rev-parse', 'origin/deploy'], $repoPath));

            if ($localHead === $remoteHead) {
                return response()->json(['ok' => true, 'deployed' => false, 'sha' => $localHead]);
            }

            Artisan::call('down');

            $this->run(['git', 'reset', '--hard', 'origin/deploy'], $repoPath);

            // Values confirmed against the account's working home.guykats.com
            // deployment (see its DEPLOYMENT.md) - PHP is 8.3 via CloudLinux
            // alt-php and is NOT on the default PATH; composer is on PATH
            // already for interactive/cron shells, but PHP-FPM's subprocess
            // env has almost no PATH, so it's spelled out explicitly below.
            $home = '/home/u823311221';
            $env = [
                'PATH' => '/opt/alt/php83/usr/bin:/usr/local/bin:/usr/bin:/bin',
                'HOME' => $home,
                'COMPOSER_HOME' => $home . '/.composer',
                'COMPOSER_ALLOW_SUPERUSER' => '1',
            ];

            // Confirmed on this account: `which composer` -> /usr/local/bin/composer
            $this->run(
                ['/opt/alt/php83/usr/bin/php', '/usr/local/bin/composer', 'install', '--no-dev', '--optimize-autoloader', '--no-interaction'],
                $repoPath,
                $env
            );

            Artisan::call('migrate', ['--force' => true]);
            Artisan::call('config:cache');
            Artisan::call('route:cache');
            Artisan::call('view:cache');
            Artisan::call('up');

            return response()->json(['ok' => true, 'deployed' => true, 'sha' => $remoteHead]);
        } catch (\Throwable $e) {
            Artisan::call('up'); // never leave the site stuck in maintenance mode
            Log::error('Deploy webhook failed', ['error' => $e->getMessage()]);

            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        } finally {
            $lock->release();
        }
    }

    private function run(array $command, string $cwd, array $env = []): string
    {
        $process = new Process($command, $cwd, $env ?: null, null, 120);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException(
                'Command failed: ' . implode(' ', $command) . "\n" . $process->getErrorOutput()
            );
        }

        return $process->getOutput();
    }
}
