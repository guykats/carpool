import { useState } from 'react';
import { router } from '@inertiajs/react';
import { getParentUuid } from '../lib/parentIdentity';

type Child = { id: number; name: string };
type ParentRow = { id: number; name: string; is_admin: boolean; child: Child | null };
type Settings = { days: string[]; departure_time: string; return_time: string };

function csrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function parentUuidHeader() {
    return { 'X-Parent-Uuid': getParentUuid() ?? '' };
}

async function post(url: string, body: unknown) {
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
        body: JSON.stringify(body),
    });
    router.reload();
}

const DAYS: { value: string; label: string }[] = [
    { value: 'Sunday', label: 'ראשון' },
    { value: 'Monday', label: 'שני' },
    { value: 'Tuesday', label: 'שלישי' },
    { value: 'Wednesday', label: 'רביעי' },
    { value: 'Thursday', label: 'חמישי' },
    { value: 'Friday', label: 'שישי' },
    { value: 'Saturday', label: 'שבת' },
];

export default function Admin({
    children,
    parents,
    settings,
}: {
    children: Child[];
    parents: ParentRow[];
    settings: Settings;
}) {
    const [newChild, setNewChild] = useState('');
    const [departure, setDeparture] = useState(settings.departure_time);
    const [returnTime, setReturnTime] = useState(settings.return_time);
    const [selectedDays, setSelectedDays] = useState<string[]>(settings.days);

    function toggleDay(value: string) {
        setSelectedDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
    }

    return (
        <div dir="rtl" className="min-h-screen bg-[#F7F7F2] px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
                <h1 className="text-xl font-bold text-[#1B4332]">פאנל ניהול</h1>

                <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="mb-3 font-semibold text-[#1B4332]">רשימת ילדים</h2>
                    <ul className="mb-3 space-y-1 text-sm text-[#5C6B66]">
                        {children.map((c) => (
                            <li key={c.id}>{c.name}</li>
                        ))}
                    </ul>
                    <div className="flex gap-2">
                        <input
                            value={newChild}
                            onChange={(e) => setNewChild(e.target.value)}
                            placeholder="שם ילד/ה חדש/ה"
                            className="flex-1 rounded-lg border border-[#D8DDD9] px-3 py-1.5 text-sm"
                        />
                        <button
                            onClick={() => newChild.trim() && post('/admin/children', { name: newChild })}
                            className="rounded-lg bg-[#1B4332] px-3 py-1.5 text-sm text-white"
                        >
                            הוספה
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="mb-3 font-semibold text-[#1B4332]">שיוך הורים לילדים</h2>
                    <ul className="space-y-2">
                        {parents.map((p) => (
                            <li key={p.id} className="flex items-center justify-between text-sm">
                                <span className="text-[#1B4332]">
                                    {p.name} {p.is_admin && <span className="text-xs text-[#E8A33D]">(אדמין)</span>}
                                </span>
                                <select
                                    defaultValue={p.child?.id ?? ''}
                                    onChange={(e) => post(`/admin/parents/${p.id}/reassign`, { child_id: Number(e.target.value) })}
                                    className="rounded-lg border border-[#D8DDD9] px-2 py-1 text-sm"
                                >
                                    <option value="">— ללא שיוך —</option>
                                    {children.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="mb-3 font-semibold text-[#1B4332]">הגדרות חוג</h2>
                    <p className="mb-2 text-sm font-medium text-[#1B4332]">ימי חוג</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                        {DAYS.map((day) => {
                            const checked = selectedDays.includes(day.value);
                            return (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleDay(day.value)}
                                    className={
                                        checked
                                            ? 'rounded-full border border-[#1B4332] bg-[#1B4332] px-3 py-1.5 text-xs text-white'
                                            : 'rounded-full border border-[#D8DDD9] bg-white px-3 py-1.5 text-xs text-[#1B4332]'
                                    }
                                >
                                    {day.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mb-3 flex items-center gap-4 text-sm text-[#1B4332]">
                        <label className="flex items-center gap-2">
                            שעת הלוך
                            <input
                                type="time"
                                value={departure}
                                onChange={(e) => setDeparture(e.target.value)}
                                className="rounded-lg border border-[#D8DDD9] px-2 py-1 text-[#1B4332]"
                            />
                        </label>
                        <label className="flex items-center gap-2">
                            שעת חזור
                            <input
                                type="time"
                                value={returnTime}
                                onChange={(e) => setReturnTime(e.target.value)}
                                className="rounded-lg border border-[#D8DDD9] px-2 py-1 text-[#1B4332]"
                            />
                        </label>
                    </div>
                    <button
                        onClick={() =>
                            post('/admin/settings', { days: selectedDays, departure_time: departure, return_time: returnTime })
                        }
                        className="rounded-lg bg-[#1B4332] px-3 py-1.5 text-sm text-white"
                    >
                        שמירה
                    </button>
                    <p className="mt-2 text-xs text-[#5C6B66]">
                        שינוי הימים משפיע רק על שבועות חדשים שייווצרו (ראו PRD - יצירה on-demand). לשינוי שעה חד-פעמית ליום
                        ספציפי: יש לערוך את המשבצת הבודדת בלוח (רשימת ה-Shifts מתחת), לא כאן.
                    </p>
                </section>
            </div>
        </div>
    );
}
