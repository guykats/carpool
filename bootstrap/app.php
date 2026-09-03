<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['sidebar_state', 'carpool_parent_uuid']);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'identify.parent' => \App\Http\Middleware\IdentifyParent::class,
            'ensure.admin' => \App\Http\Middleware\EnsureAdmin::class,
        ]);

        // The deploy webhook is an external POST from GitHub Actions/curl -
        // it will never carry a browser CSRF token, so it must be excluded
        // here or every call gets a 419 "Page Expired" from VerifyCsrfToken.
        $middleware->validateCsrfTokens(except: [
            'deploy-webhook',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
