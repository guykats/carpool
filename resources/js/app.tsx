import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { attachParentIdentityToRequests } from '@/lib/parentIdentity';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

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

// This will set light / dark mode on load...
initializeTheme();
