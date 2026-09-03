import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { getParentUuid } from '../lib/parentIdentity';

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

type ScoreRow = { child_id: number; child_name: string; rides: number };

type CurrentParent = {
    id: number;
    name: string;
    child_id: number;
    child: { id: number; name: string } | null;
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

// Fixed color per child - same color in the scoreboard header and on slot
// badges, so a parent can recognize a child at a glance either place.
const CHILD_COLORS = ['#3A86FF', '#FB5607', '#8338EC', '#FF006E', '#06A77D', '#C1121F', '#5E548E', '#2A6F97'];
function childColor(childId: number): string {
    return CHILD_COLORS[(childId - 1) % CHILD_COLORS.length];
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
}: {
    currentParent: CurrentParent;
    weekStart: string;
    shifts: Shift[];
    scoreboard: ScoreRow[];
}) {
    const [busyId, setBusyId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [seatsChoice, setSeatsChoice] = useState<Record<number, number>>({});

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
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                    <div className="shrink-0 text-sm font-medium">
                        שלום {currentParent.name}
                        {currentParent.child?.name ? `, הורה של ${currentParent.child.name}` : ''}
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto">
                        {scoreboard.length === 0 && <span className="text-sm text-white/70">עדיין אין נסיעות שבוצעו</span>}
                        {scoreboard.map((row) => (
                            <div key={row.child_id} className="flex shrink-0 flex-col items-center px-2">
                                <span className="flex items-center gap-1 text-xs text-white/85">
                                    <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: childColor(row.child_id) }}
                                    />
                                    {row.child_name}
                                </span>
                                <span className="text-lg font-bold" style={{ color: childColor(row.child_id) }}>
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
                                const isMyChild = shift.childId === currentParent.child_id;
                                return (
                                    <li
                                        key={shift.id}
                                        className="flex items-center justify-between border-b border-[#F0F0EC] px-4 py-3 last:border-0"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-[#1B4332]">
                                                {SLOT_LABELS[shift.type]} · {shift.time}
                                            </p>
                                            {shift.childName ? (
                                                <>
                                                    <p
                                                        className="flex items-center gap-1.5 text-xs font-semibold"
                                                        style={{ color: childColor(shift.childId!) }}
                                                    >
                                                        <span
                                                            className="inline-block h-2 w-2 rounded-full"
                                                            style={{ backgroundColor: childColor(shift.childId!) }}
                                                        />
                                                        {shift.childName}
                                                    </p>
                                                    <p className="text-[11px] text-[#5C6B66]">
                                                        מסיע/ה: {shift.parentName}
                                                        {shift.seats
                                                            ? ` · לוקח/ת ${shift.seats === 1 ? 'ילד אחד' : `${shift.seats} ילדים`}`
                                                            : ''}
                                                    </p>
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
                                            {!shift.parentName && !shift.isPast && (
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
                                            {isMyChild && shift.parentName && !shift.isPast && (
                                                <button
                                                    disabled={busyId === shift.id}
                                                    onClick={() => act(shift, 'cancel')}
                                                    className="rounded-lg border border-[#D8DDD9] px-3 py-1.5 text-xs text-[#5C6B66] disabled:opacity-50"
                                                >
                                                    ביטול
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

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
