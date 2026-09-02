const STORAGE_KEY = 'carpool_parent_uuid';

export function getParentUuid(): string | null {
    return localStorage.getItem(STORAGE_KEY);
}

export function setParentUuid(uuid: string): void {
    localStorage.setItem(STORAGE_KEY, uuid);
}

export function clearParentUuid(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Call once in resources/js/app.tsx before creating the Inertia app.
 * Attaches the stored UUID to every Inertia visit as X-Parent-Uuid, since
 * this app has no cookie/session auth - see PRD section 4.1.
 */
export function attachParentIdentityToRequests(router: {
    on: (event: 'before', cb: (event: { detail: { visit: { headers: Record<string, string> } } }) => void) => void;
}): void {
    router.on('before', (event) => {
        const uuid = getParentUuid();
        if (uuid) {
            event.detail.visit.headers['X-Parent-Uuid'] = uuid;
        }
    });
}
