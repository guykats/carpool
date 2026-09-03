<?php

namespace App\Http\Middleware;

use App\Models\ParentUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * There is no password auth in this app (see PRD 2 - "no signup flows or
 * passwords"). Identity is a UUID, primarily carried as a cookie
 * (`carpool_parent_uuid`, set server-side by ParentController::store) so
 * it's present on every request automatically - including the very first
 * hard page load, which JS can't attach a custom header to in time. The
 * X-Parent-Uuid header (set by attachParentIdentityToRequests on the
 * frontend) is checked as a fallback for any request the cookie somehow
 * didn't reach.
 *
 * A missing/unknown UUID is not an error here - it just means "not signed
 * in yet", which routes handle themselves (e.g. redirect to /login).
 */
class IdentifyParent
{
    public function handle(Request $request, Closure $next): Response
    {
        $uuid = $request->cookie('carpool_parent_uuid') ?? $request->header('X-Parent-Uuid');

        if ($uuid) {
            $parent = ParentUser::where('uuid', $uuid)->first();
            $request->attributes->set('currentParent', $parent);
        }

        return $next($request);
    }
}
