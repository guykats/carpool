import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { attachParentIdentityToRequests } from '@/lib/parentIdentity';

// VITE_APP_NAME is a build-time Vite variable, but the CI build step
// (npm run build in GitHub Actions) has no .env file at all - it always
// fell back to 'Laravel' regardless of what the server's runtime .env
// says. Hardcoded directly instead, since this app doesn't need
// multi-environment configurability for its title.
const appName = 'הסעות לחוג';

// This app has no cookie/session auth - identity is a UUID in LocalStorage,
// sent on every Inertia visit as X-Parent-Uuid. See PRD section 4.1.
attachParentIdentityToRequests(router);

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // Every page (Login/Main/Admin) is a self-contained full-screen RTL
    // layout - none of them need the starter kit's dashboard shell.
    layout: () => null,
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#1B4332',
    },
});

// No dark-mode support - this app only has a light palette (see
// frontend-design decisions). Deliberately NOT calling initializeTheme()
// here: it followed the OS's prefers-color-scheme and applied a `dark`
// class to <html>, which made any text without an explicit color class
// (e.g. the week-nav buttons) inherit a light/white foreground - invisible
// against this app's white button backgrounds.
