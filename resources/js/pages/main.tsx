import { useState } from 'react';
import { router } from '@inertiajs/react';

type Shift = {
    id: number;
    date: string;
    time: string;
    type: 'departure_1' | 'departure_2' | 'return_1' | 'return_2';
    isPast: boolean;
    parentName: string | null;
    parentId: number | null;
    childId: number | null;
    childName: string | null;
};

type ScoreRow = { child_id: number; child_name: string; rides: number };

type CurrentParent = { id: number; name: string; child_id: number };

const SLOT_LABELS: Record<Shift['type'], string> = {
    departure_1: 'הלוך – רכב 1',
    departure_2: 'הלוך – רכב 2',
    return_1: 'חזור – רכב 1',
    return_2: 'חזור – רכב 2',
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
    return { 'X-Parent-Uuid': localStorage.getItem('carpool_parent_uuid') ?? '' };
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

    const byDate = shifts.reduce<Record<string, Shift[]>>((acc, s) => {
        (acc[s.date] ??= []).push(s);
        return acc;
    }, {});

    async function act(shift: Shift, action: 'assign' | 'cancel') {
        setBusyId(shift.id);
        setNotice(null);
        try {
            const res = await fetch(`/shifts/${shift.id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), ...parentUuidHeader() },
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
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 overflow-x-auto">
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
            </header>

            <div className="mx-auto max-w-2xl px-4 pt-4">
                {notice && (
                    <div className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{notice}</div>
                )}

                <div className="mb-4 flex items-center justify-between">
                    <button onClick={() => changeWeek(-7)} className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm">
                        → שבוע קודם
                    </button>
                    <span className="text-sm font-medium text-[#5C6B66]">שבוע {weekStart}</span>
                    <button onClick={() => changeWeek(7)} className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm">
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
                                const isMine = shift.parentId === currentParent.id;
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
                                                    <p className="text-[11px] text-[#5C6B66]">מסיע/ה: {shift.parentName}</p>
                                                </>
                                            ) : (
                                                <p className="text-xs text-[#5C6B66]">{shift.isPast ? 'לא שובץ' : 'פנוי'}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isMine && !shift.isPast && (
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
                                                <button
                                                    disabled={busyId === shift.id}
                                                    onClick={() => act(shift, 'assign')}
                                                    className="rounded-lg bg-[#E8A33D] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                                >
                                                    אני מסיע
                                                </button>
                                            )}
                                            {isMine && !shift.isPast && (
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
        </div>
    );
}
