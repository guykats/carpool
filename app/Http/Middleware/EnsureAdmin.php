<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $parent = $request->attributes->get('currentParent');

        if (! $parent || ! $parent->is_admin) {
            abort(403, 'Admin access only.');
        }

        return $next($request);
    }
}
