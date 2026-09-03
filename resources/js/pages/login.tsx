import { useState } from 'react';
import { router } from '@inertiajs/react';
import QRCode from 'qrcode';
import IdentityGateAndForm from '../components/identity-gate-and-form';
import { setParentUuid } from '../lib/parentIdentity';

type Child = { id: number; name: string };

/**
 * Desktop devices have no Face ID/fingerprint hardware, so instead of the
 * name+child form they get a QR code to scan with their phone - the phone
 * carries out identification (or reuses its existing identity) and this
 * screen polls until that's done. See PairingController and PRD 4.1.
 */
function QrPairingScreen({ onIdentified }: { onIdentified: (uuid: string) => void }) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function start() {
        setError(null);
        try {
            const res = await fetch('/pairing', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
            });
            if (!res.ok) throw new Error('failed to start pairing');
            const { token } = await res.json();

            const url = `${window.location.origin}/pairing/${token}`;
            setQrDataUrl(await QRCode.toDataURL(url, { width: 260, margin: 1 }));

            const interval = setInterval(async () => {
                const statusRes = await fetch(`/pairing/${token}/status`);
                if (!statusRes.ok) return;
                const status = await statusRes.json();
                if (status.approved && status.uuid) {
                    clearInterval(interval);
                    onIdentified(status.uuid);
                }
            }, 2000);
        } catch {
            setError('לא הצלחנו להתחיל את התהליך, נסו לרענן');
        }
    }

    useState(() => {
        start();
    });

    return (
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
            <h1 className="mb-2 text-xl font-bold text-[#1B4332]">אימות דרך הנייד</h1>
            <p className="mb-4 text-sm text-[#5C6B66]">
                סרקו את הקוד עם הנייד שלכם כדי להזדהות. אין צורך להישאר במסך הזה - הוא יתעדכן אוטומטית.
            </p>
            {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR לזיהוי דרך הנייד" className="mx-auto rounded-lg border border-[#D8DDD9]" />
            ) : (
                <p className="text-sm text-[#5C6B66]">טוענים קוד...</p>
            )}
            {error && (
                <div className="mt-3">
                    <p className="mb-2 text-sm text-red-600">{error}</p>
                    <button onClick={start} className="text-sm font-medium text-[#1B4332] underline">
                        נסו שוב
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Login({ children }: { children: Child[] }) {
    const [showQr, setShowQr] = useState(false);

    function handleIdentified(uuid: string) {
        setParentUuid(uuid);
        router.visit('/');
    }

    return (
        <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-[#F7F7F2] px-4">
            <div className="mb-8 text-center">
                <div className="mb-2 text-4xl">⚽</div>
                <h1 className="text-2xl font-bold text-[#1B4332]">הסעות לחוג</h1>
                <p className="mt-1 text-sm text-[#5C6B66]">שני פרטים וזהו — נכנסים ללוח</p>
            </div>

            {showQr ? (
                <QrPairingScreen onIdentified={handleIdentified} />
            ) : (
                <IdentityGateAndForm
                    children={children}
                    onIdentified={handleIdentified}
                    onUnsupportedDevice={() => setShowQr(true)}
                />
            )}

            <p className="mt-4 text-center text-xs text-[#5C6B66]">
                הילד/ה לא ברשימה? פנו למנהל/ת הקבוצה
            </p>
        </div>
    );
}
