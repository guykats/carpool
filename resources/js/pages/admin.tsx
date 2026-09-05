import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { getParentUuid } from '../lib/parentIdentity';

type Family = { id: number; name: string };
type ParentRow = { id: number; is_admin: boolean; family: Family | null };
type Settings = { days: string[]; departure_time: string; return_time: string };

function csrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function parentUuidHeader() {
    return { 'X-Parent-Uuid': getParentUuid() ?? '' };
}

async function post(url: string, body: unknown) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        alert(`השמירה נכשלה (שגיאה ${res.status}). נסו לרענן את הדף ולנסות שוב.`);
        return;
    }
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
    families,
    parents,
    settings,
}: {
    families: Family[];
    parents: ParentRow[];
    settings: Settings;
}) {
    const [newFamily, setNewFamily] = useState('');
    const [departure, setDeparture] = useState(settings.departure_time);
    const [returnTime, setReturnTime] = useState(settings.return_time);
    const [selectedDays, setSelectedDays] = useState<string[]>(settings.days);

    function toggleDay(value: string) {
        setSelectedDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
    }

    return (
        <div dir="rtl" className="min-h-screen bg-[#F7F7F2] px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-[#1B4332]">פאנל ניהול</h1>
                    <Link href="/" className="text-sm font-medium text-[#1B4332] underline">
                        ← חזרה ללוח ההסעות
                    </Link>
                </div>

                <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="mb-3 font-semibold text-[#1B4332]">רשימת משפחות</h2>
                    <ul className="mb-3 space-y-1 text-sm">
                        {families.map((f) => (
                            <li key={f.id} className="flex items-center justify-between text-[#5C6B66]">
                                <span>{f.name}</span>
                                <button
                                    onClick={() => {
                                        if (
                                            confirm(
                                                `למחוק את משפחת ${f.name}? מכשירים ששויכו אליה יהפכו ל"ללא שיוך", ` +
                                                    'וההיסטוריה שלה תיעלם מהסטטוס בהדר. הפעולה לא הפיכה.'
                                            )
                                        ) {
                                            post(`/admin/families/${f.id}/delete`, {});
                                        }
                                    }}
                                    className="text-xs text-red-600 underline"
                                >
                                    מחיקה
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex gap-2">
                        <input
                            value={newFamily}
                            onChange={(e) => setNewFamily(e.target.value)}
                            placeholder="שם משפחה חדשה"
                            className="flex-1 rounded-lg border border-[#D8DDD9] px-3 py-1.5 text-sm text-[#1B4332]"
                        />
                        <button
                            onClick={() => newFamily.trim() && post('/admin/families', { name: newFamily })}
                            className="rounded-lg bg-[#1B4332] px-3 py-1.5 text-sm text-white"
                        >
                            הוספה
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="mb-3 font-semibold text-[#1B4332]">שיוך מכשירים למשפחות</h2>
                    <p className="mb-3 text-xs text-[#5C6B66]">
                        כל שורה היא מכשיר/דפדפן שהתחבר לאתר (ייתכנו כמה מכשירים לאותה משפחה - למשל טלפון של כל הורה).
                    </p>
                    <ul className="space-y-2">
                        {parents.map((p) => (
                            <li key={p.id} className="flex items-center justify-between text-sm">
                                <span className="text-[#1B4332]">
                                    מכשיר #{p.id} {p.is_admin && <span className="text-xs text-[#E8A33D]">(אדמין)</span>}
                                </span>
                                <select
                                    defaultValue={p.family?.id ?? ''}
                                    onChange={(e) => post(`/admin/parents/${p.id}/reassign`, { family_id: Number(e.target.value) })}
                                    className="rounded-lg border border-[#D8DDD9] px-2 py-1 text-sm text-[#1B4332]"
                                >
                                    <option value="">— ללא שיוך —</option>
                                    {families.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}
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
                        שינוי הימים משפיע רק על שבועות חדשים שייווצרו (ראו PRD - יצירה on-demand). לניהול משבצות בודדות
                        (שיבוץ/ביטול/עריכת שעה, כולל ימים שעברו) - עשו זאת ישירות בלוח ההסעות הראשי.
                    </p>
                </section>
            </div>
        </div>
    );
}
