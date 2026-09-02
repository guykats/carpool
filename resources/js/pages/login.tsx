import { useState } from 'react';
import { router } from '@inertiajs/react';
import { setParentUuid } from '../lib/parentIdentity';

type Child = { id: number; name: string };

export default function Login({ children }: { children: Child[] }) {
    const [name, setName] = useState('');
    const [childId, setChildId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !childId) {
            setError('נא למלא שם ולבחור ילד/ה');
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
                body: JSON.stringify({ name, child_id: Number(childId) }),
            });

            if (!res.ok) throw new Error('signup failed');

            const data = await res.json();
            setParentUuid(data.uuid);
            router.visit('/');
        } catch {
            setError('משהו השתבש, נסו שוב');
            setSubmitting(false);
        }
    }

    return (
        <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F7F7F2] px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <div className="mb-2 text-4xl">⚽</div>
                    <h1 className="text-2xl font-bold text-[#1B4332]">הסעות לחוג</h1>
                    <p className="mt-1 text-sm text-[#5C6B66]">שני פרטים וזהו — נכנסים ללוח</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1B4332]">השם שלכם</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="לדוגמה: דנה כהן"
                            className="w-full rounded-lg border border-[#D8DDD9] px-3 py-2 text-[#1B4332] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1B4332]">מי הילד/ה שלכם?</label>
                        <select
                            value={childId}
                            onChange={(e) => setChildId(e.target.value)}
                            className="w-full rounded-lg border border-[#D8DDD9] bg-white px-3 py-2 text-[#1B4332] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                        >
                            <option value="">בחרו מהרשימה</option>
                            {children.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
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

                <p className="mt-4 text-center text-xs text-[#5C6B66]">
                    הילד/ה לא ברשימה? פנו למנהל/ת הקבוצה
                </p>
            </div>
        </div>
    );
}
