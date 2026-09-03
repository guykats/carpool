import { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { getParentUuid } from '../lib/parentIdentity';

type Child = { id: number; name: string };
type ParentRow = { id: number; name: string; is_admin: boolean; child: Child | null };
type Settings = { days: string[]; departure_time: string; return_time: string };
type Shift = {
    id: number;
    date: string;
    time: string;
    type: 'departure_1' | 'departure_2' | 'departure_3' | 'return_1' | 'return_2' | 'return_3';
    isPast: boolean;
    parentName: string | null;
    parentId: number | null;
    childId: number | null;
    childName: string | null;
    seats: number | null;
};

const SLOT_LABELS: Record<Shift['type'], string> = {
    departure_1: 'הלוך – רכב 1',
    departure_2: 'הלוך – רכב 2',
    departure_3: 'הלוך – רכב 3',
    return_1: 'חזור – רכב 1',
    return_2: 'חזור – רכב 2',
    return_3: 'חזור – רכב 3',
};

const DAY_LABELS: Record<number, string> = {
    0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת',
};

const DAYS: { value: string; label: string }[] = [
    { value: 'Sunday', label: 'ראשון' },
    { value: 'Monday', label: 'שני' },
    { value: 'Tuesday', label: 'שלישי' },
    { value: 'Wednesday', label: 'רביעי' },
    { value: 'Thursday', label: 'חמישי' },
    { value: 'Friday', label: 'שישי' },
    { value: 'Saturday', label: 'שבת' },
];

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

/**
 * Admin's shift-management view - lets an admin assign/clear/edit any
 * shift, including already-past ones (retroactive correction, per PRD
 * section 6 / 4.2.3). This is separate from the parent-facing board in
 * main.tsx, which deliberately restricts actions on past shifts.
 */
function ShiftManager({ parents }: { parents: ParentRow[] }) {
    const [weekStart, setWeekStart] = useState<string | null>(null);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        load(offset);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offset]);

    async function load(weekOffset: number) {
        setLoading(true);
        const base = new Date();
        base.setDate(base.getDate() + weekOffset * 7);
        const res = await fetch(`/admin/shifts?week=${base.toISOString().slice(0, 10)}`, {
            headers: parentUuidHeader(),
        });
        const data = await res.json();
        setWeekStart(data.weekStart);
        setShifts(data.shifts);
        setLoading(false);
    }

    async function saveOverride(shift: Shift, parentId: number | null, seats: number) {
        await fetch(`/admin/shifts/${shift.id}/override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
            body: JSON.stringify({ parent_id: parentId, seats }),
        });
        load(offset);
    }

    async function saveTime(shift: Shift, time: string) {
        await fetch(`/admin/shifts/${shift.id}/time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
            body: JSON.stringify({ time }),
        });
        load(offset);
    }

    const byDate = shifts.reduce<Record<string, Shift[]>>((acc, s) => {
        (acc[s.date] ??= []).push(s);
        return acc;
    }, {});

    return (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold text-[#1B4332]">ניהול משבצות (כולל ימים שעברו)</h2>
            <div className="mb-3 flex items-center justify-between">
                <button
                    onClick={() => setOffset((o) => o - 1)}
                    className="rounded-lg border border-[#D8DDD9] px-3 py-1.5 text-sm text-[#1B4332]"
                >
                    → שבוע קודם
                </button>
                <span className="text-sm text-[#5C6B66]">{weekStart ? `שבוע ${weekStart}` : ''}</span>
                <button
                    onClick={() => setOffset((o) => o + 1)}
                    className="rounded-lg border border-[#D8DDD9] px-3 py-1.5 text-sm text-[#1B4332]"
                >
                    שבוע הבא ←
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-[#5C6B66]">טוענים...</p>
            ) : (
                Object.entries(byDate).map(([date, dayShifts]) => (
                    <div key={date} className="mb-3 overflow-hidden rounded-xl border border-[#F0F0EC]">
                        <div className="bg-[#F7F7F2] px-3 py-1.5 text-xs font-semibold text-[#1B4332]">
                            יום {DAY_LABELS[new Date(date).getDay()]} · {date}
                            {dayShifts[0]?.isPast && <span className="mr-2 text-[#5C6B66]">(עבר)</span>}
                        </div>
                        {dayShifts.map((shift) => (
                            <ShiftRow
                                key={shift.id}
                                shift={shift}
                                parents={parents}
                                onSaveOverride={saveOverride}
                                onSaveTime={saveTime}
                            />
                        ))}
                    </div>
                ))
            )}
        </section>
    );
}

function ShiftRow({
    shift,
    parents,
    onSaveOverride,
    onSaveTime,
}: {
    shift: Shift;
    parents: ParentRow[];
    onSaveOverride: (shift: Shift, parentId: number | null, seats: number) => void;
    onSaveTime: (shift: Shift, time: string) => void;
}) {
    const [parentId, setParentId] = useState<string>(shift.parentId?.toString() ?? '');
    const [seats, setSeats] = useState(shift.seats ?? 1);
    const [time, setTime] = useState(shift.time);

    return (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0F0EC] px-3 py-2 text-xs">
            <span className="w-28 shrink-0 font-medium text-[#1B4332]">{SLOT_LABELS[shift.type]}</span>

            <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() => time !== shift.time && onSaveTime(shift, time)}
                className="rounded border border-[#D8DDD9] px-1.5 py-1 text-[#1B4332]"
            />

            <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="min-w-32 flex-1 rounded border border-[#D8DDD9] px-1.5 py-1 text-[#1B4332]"
            >
                <option value="">— פנוי —</option>
                {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name} {p.child ? `(${p.child.name})` : ''}
                    </option>
                ))}
            </select>

            {parentId && (
                <select
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="rounded border border-[#D8DDD9] px-1.5 py-1 text-[#1B4332]"
                >
                    {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                            {n} ילדים
                        </option>
                    ))}
                </select>
            )}

            <button
                onClick={() => onSaveOverride(shift, parentId ? Number(parentId) : null, seats)}
                className="rounded bg-[#1B4332] px-2.5 py-1 text-white"
            >
                שמירה
            </button>
        </div>
    );
}

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
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-[#1B4332]">פאנל ניהול</h1>
                    <Link href="/" className="text-sm font-medium text-[#1B4332] underline">
                        ← חזרה ללוח ההסעות
                    </Link>
                </div>

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
                            className="flex-1 rounded-lg border border-[#D8DDD9] px-3 py-1.5 text-sm text-[#1B4332]"
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
                                    className="rounded-lg border border-[#D8DDD9] px-2 py-1 text-sm text-[#1B4332]"
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
                        שינוי הימים משפיע רק על שבועות חדשים שייווצרו (ראו PRD - יצירה on-demand).
                    </p>
                </section>

                <ShiftManager parents={parents} />
            </div>
        </div>
    );
}
