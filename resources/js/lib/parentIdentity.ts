import type { router as InertiaRouter } from '@inertiajs/react';

const COOKIE_NAME = 'carpool_parent_uuid';

/**
 * Identity is primarily a cookie (set server-side by ParentController::store,
 * exempted from Laravel's cookie encryption in bootstrap/app.php so it's
 * plain-text and readable here too), not LocalStorage. A cookie is sent
 * automatically on every request - including the very first hard page load,
 * which no client-side JS mechanism can attach a header to in time. An
 * earlier LocalStorage+header-only version of this file caused every fresh
 * page load to fail to recognize an already-identified device.
 */
function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

export function getParentUuid(): string | null {
    return readCookie(COOKIE_NAME);
}

/**
 * Normally redundant - the server already sets this cookie via Set-Cookie
 * on the /parents response - but set it client-side too as a safety net.
 */
export function setParentUuid(uuid: string): void {
    const maxAge = 400 * 24 * 60 * 60; // 400 days - see env.production.example
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(uuid)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function clearParentUuid(): void {
    document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
}

/**
 * Call once in resources/js/app.tsx before creating the Inertia app.
 * Attaches the stored UUID to every Inertia visit as X-Parent-Uuid too -
 * this is now just a secondary/fallback path (see IdentifyParent
 * middleware, which checks the cookie first); the cookie alone is what
 * makes cold/first-load recognition actually work.
 *
 * Router.on('before', callback) types callback as
 * (event: GlobalEvent<'before'>) => ..., where GlobalEvent wraps the visit
 * in a DOM CustomEvent-style shape - so this is event.detail.visit.headers,
 * confirmed directly against node_modules/@inertiajs/core's router.d.ts.
 */
export function attachParentIdentityToRequests(router: typeof InertiaRouter): void {
    router.on('before', (event) => {
        const uuid = getParentUuid();
        if (uuid) {
            event.detail.visit.headers['X-Parent-Uuid'] = uuid;
        }
    });
}
