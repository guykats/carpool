import { useEffect, useState } from 'react';
import IdentityGateAndForm from '../components/identity-gate-and-form';
import { getParentUuid, setParentUuid } from '../lib/parentIdentity';

type Child = { id: number; name: string };
type Stage = 'checking' | 'need-identity' | 'approving' | 'done' | 'error';

function csrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

export default function Pairing({ token, children }: { token: string; children: Child[] }) {
    const [stage, setStage] = useState<Stage>('checking');

    useEffect(() => {
        const existingUuid = getParentUuid();
        if (existingUuid) {
            approve(existingUuid);
        } else {
            setStage('need-identity');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function approve(uuid: string) {
        setStage('approving');
        try {
            const res = await fetch(`/pairing/${token}/approve`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken(), 'X-Parent-Uuid': uuid },
            });
            if (!res.ok) throw new Error('approve failed');
            setStage('done');
        } catch {
            setStage('error');
        }
    }

    function handleIdentified(uuid: string) {
        setParentUuid(uuid);
        approve(uuid);
    }

    return (
        <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-[#F7F7F2] px-4">
            <div className="mb-8 text-center">
                <div className="mb-2 text-4xl">⚽</div>
                <h1 className="text-2xl font-bold text-[#1B4332]">אימות זהות למחשב</h1>
            </div>

            {stage === 'checking' && <p className="text-sm text-[#5C6B66]">בודקים...</p>}

            {stage === 'need-identity' && (
                <IdentityGateAndForm children={children} onIdentified={handleIdentified} />
            )}

            {stage === 'approving' && <p className="text-sm text-[#5C6B66]">מאשרים...</p>}

            {stage === 'done' && (
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
                    <div className="mb-2 text-4xl">✅</div>
                    <h2 className="mb-2 text-lg font-bold text-[#1B4332]">אושר בהצלחה</h2>
                    <p className="text-sm text-[#5C6B66]">אפשר לחזור למסך המחשב — הוא יתעדכן אוטומטית.</p>
                </div>
            )}

            {stage === 'error' && (
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
                    <p className="mb-3 text-sm text-red-600">משהו השתבש</p>
                    <button
                        onClick={() => setStage('need-identity')}
                        className="text-sm font-medium text-[#1B4332] underline"
                    >
                        נסו שוב
                    </button>
                </div>
            )}
        </div>
    );
}
