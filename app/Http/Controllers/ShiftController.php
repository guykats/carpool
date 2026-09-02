<?php

namespace App\Http\Controllers;

use App\Models\Child;
use App\Models\Setting;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    private const SLOT_TYPES = ['departure_1', 'departure_2', 'return_1', 'return_2'];
    private const DAY_NAMES = [
        'Sunday' => 0, 'Monday' => 1, 'Tuesday' => 2, 'Wednesday' => 3,
        'Thursday' => 4, 'Friday' => 5, 'Saturday' => 6,
    ];

    /**
     * Main parent view. `week` is an optional Y-m-d date inside the target
     * week; defaults to the current week. Shifts for that week are
     * generated on first view (PRD 4.2.2 - no seed/cron).
     */
    public function index(Request $request): Response
    {
        $parent = $request->attributes->get('currentParent');

        if (! $parent) {
            return Inertia::render('login', [
                'children' => Child::orderBy('name')->get(['id', 'name']),
            ]);
        }

        $weekStart = $request->query('week')
            ? Carbon::parse($request->query('week'))->startOfWeek(Carbon::SUNDAY)
            : Carbon::now()->startOfWeek(Carbon::SUNDAY);

        $this->ensureWeekGenerated($weekStart);

        $shifts = Shift::with(['child', 'parent'])
            ->whereBetween('date', [$weekStart->format('Y-m-d'), $weekStart->copy()->addDays(6)->format('Y-m-d')])
            ->orderBy('date')
            ->orderBy('time')
            ->get()
            ->map(fn (Shift $s) => $this->presentShift($s));

        return Inertia::render('main', [
            'currentParent' => $parent,
            'weekStart' => $weekStart->format('Y-m-d'),
            'shifts' => $shifts,
            'scoreboard' => $this->scoreboard(),
        ]);
    }

    /**
     * Claim a free shift. Uses a conditional UPDATE (only rows still
     * unassigned) instead of realtime subscriptions to avoid two parents
     * claiming the same slot - see PRD section 6.
     */
    public function assign(Request $request, Shift $shift)
    {
        $parent = $request->attributes->get('currentParent');
        abort_if(! $parent, 401);

        $updated = DB::table('shifts')
            ->where('id', $shift->id)
            ->whereNull('parent_id')
            ->update(['parent_id' => $parent->id, 'child_id' => $parent->child_id, 'updated_at' => now()]);

        if ($updated === 0) {
            return response()->json(['error' => 'This slot was just taken. Refreshing the board.'], 409);
        }

        return response()->json(['shift' => $this->presentShift($shift->fresh(['child', 'parent']))]);
    }

    /**
     * A parent may only cancel their own shift (admin override lives in
     * AdminController).
     */
    public function cancel(Request $request, Shift $shift)
    {
        $parent = $request->attributes->get('currentParent');
        abort_if(! $parent, 401);
        abort_if($shift->parent_id !== $parent->id, 403, 'You can only cancel your own shift.');

        $shift->update(['parent_id' => null, 'child_id' => null]);

        return response()->json(['shift' => $this->presentShift($shift->fresh())]);
    }

    private function ensureWeekGenerated(Carbon $weekStart): void
    {
        $settings = Setting::current();

        foreach ($settings->days as $dayName) {
            $offset = self::DAY_NAMES[$dayName] ?? null;
            if ($offset === null) {
                continue;
            }

            $date = $weekStart->copy()->addDays($offset)->format('Y-m-d');

            foreach (self::SLOT_TYPES as $type) {
                $time = str_starts_with($type, 'departure') ? $settings->departure_time : $settings->return_time;

                Shift::firstOrCreate(
                    ['date' => $date, 'type' => $type],
                    ['time' => $time]
                );
            }
        }
    }

    /**
     * All-time count of past (already-driven) shifts per child - PRD 4.2.1.
     * Computed at read time from date+time; there is no stored timestamp.
     *
     * Filtered in PHP rather than raw SQL date+time concatenation, since
     * that syntax differs between SQLite (dev) and MySQL (prod) - fine at
     * this scale (7 children, a couple of slots per school day).
     */
    private function scoreboard(): array
    {
        return Shift::query()
            ->whereNotNull('child_id')
            ->with('child:id,name')
            ->get()
            ->filter(fn (Shift $s) => $s->isPast())
            ->groupBy('child_id')
            ->map(fn ($shifts) => [
                'child_id' => $shifts->first()->child_id,
                'child_name' => $shifts->first()->child?->name,
                'rides' => $shifts->count(),
            ])
            ->sortByDesc('rides')
            ->values()
            ->toArray();
    }

    private function presentShift(Shift $shift): array
    {
        return [
            'id' => $shift->id,
            'date' => $shift->date->format('Y-m-d'),
            'time' => substr($shift->time, 0, 5),
            'type' => $shift->type,
            'isPast' => $shift->isPast(),
            'parentName' => $shift->parent?->name,
            'parentId' => $shift->parent_id,
            'childId' => $shift->child_id,
            'childName' => $shift->child?->name,
        ];
    }
}
