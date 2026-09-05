import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { getParentUuid } from '../lib/parentIdentity';

type Shift = {
    id: number;
    date: string;
    time: string;
    type: 'departure_1' | 'departure_2' | 'departure_3' | 'return_1' | 'return_2' | 'return_3';
    isPast: boolean;
    parentId: number | null;
    familyId: number | null;
    familyName: string | null;
    seats: number | null;
};

type ScoreRow = { family_id: number; family_name: string; rides: number };

type ParentRow = { id: number; family: { id: number; name: string } | null };

type CurrentParent = {
    id: number;
    family_id: number;
    family: { id: number; name: string } | null;
    is_admin: boolean;
};

const SLOT_LABELS: Record<Shift['type'], string> = {
    departure_1: 'הלוך – רכב 1',
    departure_2: 'הלוך – רכב 2',
    departure_3: 'הלוך – רכב 3',
    return_1: 'חזור – רכב 1',
    return_2: 'חזור – רכב 2',
    return_3: 'חזור – רכב 3',
};

const DAY_LABELS: Record<string, string> = {
    0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת',
};

// Fixed color per family - same color in the scoreboard header and on slot
// badges, so a parent can recognize a family at a glance either place.
const FAMILY_COLORS = ['#3A86FF', '#FB5607', '#8338EC', '#FF006E', '#06A77D', '#C1121F', '#5E548E', '#2A6F97'];
function familyColor(familyId: number): string {
    return FAMILY_COLORS[(familyId - 1) % FAMILY_COLORS.length];
}

function familyColorWithOpacity(familyId: number, opacity: number): string {
    const hex = familyColor(familyId).replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function csrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function parentUuidHeader() {
    return { 'X-Parent-Uuid': getParentUuid() ?? '' };
}

function googleCalendarUrl(shift: Shift): string {
    const start = new Date(`${shift.date}T${shift.time}:00`);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`הסעה לחוג – ${SLOT_LABELS[shift.type]}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}`;
}

export default function Main({
    currentParent,
    weekStart,
    shifts,
    scoreboard,
    parents,
}: {
    currentParent: CurrentParent;
    weekStart: string;
    shifts: Shift[];
    scoreboard: ScoreRow[];
    parents: ParentRow[];
}) {
    const [busyId, setBusyId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [seatsChoice, setSeatsChoice] = useState<Record<number, number>>({});
    // Admin edit mode: when off, an admin sees the board exactly like any
    // other parent (no inline override controls). Persisted so it doesn't
    // reset on every visit.
    const [editMode, setEditMode] = useState<boolean>(
        () => typeof window !== 'undefined' && localStorage.getItem('carpool_admin_edit_mode') === '1'
    );

    function toggleEditMode() {
        setEditMode((prev) => {
            const next = !prev;
            localStorage.setItem('carpool_admin_edit_mode', next ? '1' : '0');
            return next;
        });
    }

    const byDate = shifts.reduce<Record<string, Shift[]>>((acc, s) => {
        (acc[s.date] ??= []).push(s);
        return acc;
    }, {});

    async function act(shift: Shift, action: 'assign' | 'cancel', seats?: number) {
        setBusyId(shift.id);
        setNotice(null);
        try {
            const res = await fetch(`/shifts/${shift.id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
                body: action === 'assign' ? JSON.stringify({ seats }) : undefined,
            });
            if (res.status === 409) {
                setNotice('המשבצת נתפסה, מרעננים את הלוח...');
            } else if (!res.ok) {
                setNotice(`הפעולה נכשלה (שגיאה ${res.status}), נסו לרענן ולנסות שוב.`);
                return;
            }
            router.reload({ only: ['shifts', 'scoreboard'] });
        } finally {
            setBusyId(null);
        }
    }

    async function adminOverride(shift: Shift, parentId: number | null, seats: number) {
        setBusyId(shift.id);
        try {
            const res = await fetch(`/admin/shifts/${shift.id}/override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
                body: JSON.stringify({ parent_id: parentId, seats }),
            });
            if (!res.ok) {
                setNotice(`השמירה נכשלה (שגיאה ${res.status}), נסו לרענן ולנסות שוב.`);
                return;
            }
            router.reload({ only: ['shifts', 'scoreboard'] });
        } finally {
            setBusyId(null);
        }
    }

    async function adminSetTime(shift: Shift, time: string) {
        setBusyId(shift.id);
        try {
            const res = await fetch(`/admin/shifts/${shift.id}/time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
                body: JSON.stringify({ time }),
            });
            if (!res.ok) {
                setNotice(`השמירה נכשלה (שגיאה ${res.status}), נסו לרענן ולנסות שוב.`);
                return;
            }
            router.reload({ only: ['shifts', 'scoreboard'] });
        } finally {
            setBusyId(null);
        }
    }

    function changeWeek(days: number) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + days);
        router.visit(`/?week=${d.toISOString().slice(0, 10)}`);
    }

    return (
        <div dir="rtl" className="min-h-screen bg-[#F7F7F2] pb-10">
            <header className="sticky top-0 z-10 border-b border-[#D8DDD9] bg-[#1B4332] px-4 py-3 text-white shadow-sm">
                <div className="mx-auto flex max-w-2xl flex-col gap-2">
                    <div className="text-sm font-medium">
                        שלום{currentParent.family?.name ? `, משפחת ${currentParent.family.name}` : ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        {scoreboard.length === 0 && <span className="text-sm text-white/70">עדיין אין נסיעות שבוצעו</span>}
                        {scoreboard.map((row) => (
                            <div key={row.family_id} className="flex flex-col items-center px-1">
                                <span className="flex items-center gap-1 text-xs text-white/85">
                                    <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: familyColor(row.family_id) }}
                                    />
                                    {row.family_name}
                                </span>
                                <span className="text-lg font-bold" style={{ color: familyColor(row.family_id) }}>
                                    {row.rides}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-2xl px-4 pt-4">
                {notice && (
                    <div className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{notice}</div>
                )}

                <div className="mb-4 flex items-center justify-between">
                    <button
                        onClick={() => changeWeek(-7)}
                        className="rounded-lg bg-white px-3 py-1.5 text-sm text-[#1B4332] shadow-sm"
                    >
                        → שבוע קודם
                    </button>
                    <span className="text-sm font-medium text-[#5C6B66]">שבוע {weekStart}</span>
                    <button
                        onClick={() => changeWeek(7)}
                        className="rounded-lg bg-white px-3 py-1.5 text-sm text-[#1B4332] shadow-sm"
                    >
                        שבוע הבא ←
                    </button>
                </div>

                {Object.entries(byDate).map(([date, dayShifts]) => (
                    <div key={date} className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
                        <div className="border-b border-[#F0F0EC] bg-[#F7F7F2] px-4 py-2 text-sm font-semibold text-[#1B4332]">
                            יום {DAY_LABELS[new Date(date).getDay()]} · {date}
                        </div>
                        <ul>
                            {dayShifts.map((shift) => {
                                const isMyBooking = shift.parentId === currentParent.id;
                                const isMyFamily = shift.familyId === currentParent.family_id;
                                return (
                                    <li
                                        key={shift.id}
                                        className="border-b border-[#F0F0EC] px-4 py-3 last:border-0"
                                        style={
                                            shift.familyId
                                                ? { backgroundColor: familyColorWithOpacity(shift.familyId, 0.1) }
                                                : undefined
                                        }
                                    >
                                        <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[#1B4332]">
                                                {SLOT_LABELS[shift.type]} · {shift.time}
                                            </p>
                                            {shift.familyName ? (
                                                <>
                                                    <p
                                                        className="flex items-center gap-1.5 text-xs font-semibold"
                                                        style={{ color: familyColor(shift.familyId!) }}
                                                    >
                                                        <span
                                                            className="inline-block h-2 w-2 rounded-full"
                                                            style={{ backgroundColor: familyColor(shift.familyId!) }}
                                                        />
                                                        משפחת {shift.familyName}
                                                    </p>
                                                    {shift.seats && (
                                                        <p className="text-[11px] text-[#5C6B66]">
                                                            לוקח/ת {shift.seats === 1 ? 'ילד אחד' : `${shift.seats} ילדים`}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-xs text-[#5C6B66]">{shift.isPast ? 'לא שובץ' : 'פנוי'}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isMyBooking && !shift.isPast && (
                                                <a
                                                    href={googleCalendarUrl(shift)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-lg border border-[#D8DDD9] px-2.5 py-1.5 text-xs text-[#1B4332]"
                                                >
                                                    הוסף ליומן
                                                </a>
                                            )}
                                            {!shift.familyName && !shift.isPast && (
                                                <>
                                                    <select
                                                        value={seatsChoice[shift.id] ?? 1}
                                                        onChange={(e) =>
                                                            setSeatsChoice((prev) => ({ ...prev, [shift.id]: Number(e.target.value) }))
                                                        }
                                                        className="rounded-lg border border-[#D8DDD9] bg-white px-2 py-1.5 text-xs text-[#1B4332]"
                                                        aria-label="כמה ילדים לוקחים"
                                                    >
                                                        {[1, 2, 3, 4].map((n) => (
                                                            <option key={n} value={n}>
                                                                {n === 1 ? 'ילד אחד' : `${n} ילדים`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        disabled={busyId === shift.id}
                                                        onClick={() => act(shift, 'assign', seatsChoice[shift.id] ?? 1)}
                                                        className="rounded-lg bg-[#E8A33D] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                                    >
                                                        אני מסיע
                                                    </button>
                                                </>
                                            )}
                                            {isMyFamily && shift.familyName && !shift.isPast && (
                                                <button
                                                    disabled={busyId === shift.id}
                                                    onClick={() => act(shift, 'cancel')}
                                                    className="rounded-lg border border-[#D8DDD9] px-3 py-1.5 text-xs text-[#5C6B66] disabled:opacity-50"
                                                >
                                                    ביטול
                                                </button>
                                            )}
                                        </div>
                                        </div>

                                        {currentParent.is_admin && editMode && (
                                            <AdminOverrideControls
                                                shift={shift}
                                                parents={parents}
                                                busy={busyId === shift.id}
                                                onOverride={adminOverride}
                                                onSetTime={adminSetTime}
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            {currentParent.is_admin && (
                <button
                    onClick={toggleEditMode}
                    className={
                        'fixed bottom-24 left-6 z-20 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition ' +
                        (editMode ? 'bg-[#E8A33D] text-white' : 'bg-white text-[#1B4332]')
                    }
                    aria-label="מצב עריכת משבצות"
                    title="מצב עריכת משבצות"
                >
                    <span
                        className={
                            'flex h-5 w-9 items-center rounded-full px-0.5 transition ' +
                            (editMode ? 'justify-end bg-white/40' : 'justify-start bg-[#D8DDD9]')
                        }
                    >
                        <span className="h-4 w-4 rounded-full bg-white shadow" />
                    </span>
                    מצב עריכה {editMode ? 'פועל' : 'כבוי'}
                </button>
            )}

            {currentParent.is_admin && (
                <Link
                    href="/admin"
                    className="fixed bottom-6 left-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#1B4332] text-2xl text-white shadow-lg transition hover:bg-[#163A2B]"
                    aria-label="פאנל ניהול"
                    title="פאנל ניהול"
                >
                    ⚙️
                </Link>
            )}
        </div>
    );
}

/**
 * Inline admin override controls, shown below every shift row (including
 * already-past ones - see PRD 4.2.3 / 4.3 and admin.tsx's removal note).
 * Lets an admin assign/clear any shift and edit its time, regardless of
 * who currently holds it or whether it already happened. Parents have no
 * personal name (removed site-wide) so options are labeled by family.
 */
function AdminOverrideControls({
    shift,
    parents,
    busy,
    onOverride,
    onSetTime,
}: {
    shift: Shift;
    parents: ParentRow[];
    busy: boolean;
    onOverride: (shift: Shift, parentId: number | null, seats: number) => void;
    onSetTime: (shift: Shift, time: string) => void;
}) {
    const [parentId, setParentId] = useState<string>(shift.parentId?.toString() ?? '');
    const [seats, setSeats] = useState(shift.seats ?? 1);
    const [time, setTime] = useState(shift.time);

    return (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#F7F7F2] px-2 py-2 text-xs">
            <span className="font-medium text-[#E8A33D]">אדמין:</span>

            <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() => time !== shift.time && onSetTime(shift, time)}
                className="rounded border border-[#D8DDD9] bg-white px-1.5 py-1 text-[#1B4332]"
            />

            <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="min-w-28 flex-1 rounded border border-[#D8DDD9] bg-white px-1.5 py-1 text-[#1B4332]"
            >
                <option value="">— פנוי —</option>
                {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.family ? `משפחת ${p.family.name}` : `מכשיר #${p.id} (ללא שיוך)`}
                    </option>
                ))}
            </select>

            {parentId && (
                <select
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="rounded border border-[#D8DDD9] bg-white px-1.5 py-1 text-[#1B4332]"
                >
                    {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                            {n} ילדים
                        </option>
                    ))}
                </select>
            )}

            <button
                disabled={busy}
                onClick={() => onOverride(shift, parentId ? Number(parentId) : null, seats)}
                className="rounded bg-[#1B4332] px-2.5 py-1 text-white disabled:opacity-50"
            >
                שמירה
            </button>
        </div>
    );
}
