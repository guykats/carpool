<?php

namespace App\Http\Middleware;

use App\Models\ParentUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * There is no password auth in this app (see PRD 2 - "no signup flows or
 * passwords"). The browser keeps a UUID in LocalStorage and sends it on
 * every request as X-Parent-Uuid; this middleware resolves it to a
 * ParentUser and attaches it to the request for controllers to use.
 *
 * A missing/unknown UUID is not an error here - it just means "not signed
 * in yet", which routes handle themselves (e.g. redirect to /login).
 */
class IdentifyParent
{
    public function handle(Request $request, Closure $next): Response
    {
        $uuid = $request->header('X-Parent-Uuid');

        if ($uuid) {
            $parent = ParentUser::where('uuid', $uuid)->first();
            $request->attributes->set('currentParent', $parent);
        }

        return $next($request);
    }
}
