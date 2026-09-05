import { useEffect, useState } from 'react';
import { requestBiometricGate } from '../lib/biometricGate';

type Family = { id: number; name: string };
type Stage = 'checking' | 'form' | 'gate-failed' | 'unsupported-handled';

/**
 * Runs the Face ID gate, then the one-time family-selection form, then
 * calls onIdentified(uuid) once a parent record exists for this device
 * (see PRD 4.1). No personal name is collected anywhere - identity is
 * purely "which family does this device represent". If the device has no
 * platform authenticator:
 * - onUnsupportedDevice is provided (desktop/login.tsx) -> delegates entirely
 *   to the caller (e.g. show a QR pairing screen instead of this form)
 * - not provided (phone/pairing.tsx) -> skips the gate silently and shows
 *   the form directly, since a second QR layer inside the pairing flow
 *   itself wouldn't make sense
 */
export default function IdentityGateAndForm({
    families,
    onIdentified,
    onUnsupportedDevice,
}: {
    families: Family[];
    onIdentified: (uuid: string) => void;
    onUnsupportedDevice?: () => void;
}) {
    const [stage, setStage] = useState<Stage>('checking');
    const [familyId, setFamilyId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        runGate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function runGate() {
        setStage('checking');
        const result = await requestBiometricGate();

        if (result === 'unsupported' && onUnsupportedDevice) {
            setStage('unsupported-handled');
            onUnsupportedDevice();
            return;
        }

        setStage(result === 'failed' ? 'gate-failed' : 'form');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!familyId) {
            setError('נא לבחור משפחה מהרשימה');
            return;
        }
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/parents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ family_id: Number(familyId) }),
            });

            if (!res.ok) throw new Error('signup failed');

            const data = await res.json();
            onIdentified(data.uuid);
        } catch {
            setError('משהו השתבש, נסו שוב');
            setSubmitting(false);
        }
    }

    if (stage === 'checking' || stage === 'unsupported-handled') {
        return <p className="text-sm text-[#5C6B66]">בודקים את המכשיר...</p>;
    }

    if (stage === 'gate-failed') {
        return (
            <div className="text-center">
                <div className="mb-2 text-4xl">🔒</div>
                <h1 className="mb-2 text-xl font-bold text-[#1B4332]">אימות זהות נדרש</h1>
                <p className="mb-6 text-sm text-[#5C6B66]">
                    כדי להמשיך, יש לאמת את זהותכם עם Face ID / טביעת אצבע של המכשיר.
                </p>
                <button
                    onClick={runGate}
                    className="w-full rounded-lg bg-[#1B4332] py-2.5 font-medium text-white transition hover:bg-[#163A2B]"
                >
                    נסו שוב
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <div>
                <label className="mb-1 block text-sm font-medium text-[#1B4332]">בחרו את המשפחה שלכם</label>
                <select
                    value={familyId}
                    onChange={(e) => setFamilyId(e.target.value)}
                    className="w-full rounded-lg border border-[#D8DDD9] bg-white px-3 py-2 text-[#1B4332] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                >
                    <option value="">בחרו מהרשימה</option>
                    {families.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#1B4332] py-2.5 font-medium text-white transition hover:bg-[#163A2B] disabled:opacity-50"
            >
                {submitting ? 'נכנסים...' : 'כניסה ללוח ההסעות'}
            </button>
        </form>
    );
}
