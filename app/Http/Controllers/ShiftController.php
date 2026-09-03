<?php

namespace App\Http\Controllers;

use App\Models\Child;
use App\Models\ParentUser;
use App\Models\Shift;
use App\Support\ShiftWeek;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
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

        ShiftWeek::ensureGenerated($weekStart);

        $shifts = Shift::with(['child', 'parent'])
            ->whereBetween('date', [$weekStart->format('Y-m-d'), $weekStart->copy()->addDays(6)->format('Y-m-d')])
            ->orderBy('date')
            ->orderBy('time')
            ->get()
            ->map(fn (Shift $s) => ShiftWeek::present($s));

        return Inertia::render('main', [
            'currentParent' => $parent->load('child'),
            'weekStart' => $weekStart->format('Y-m-d'),
            'shifts' => $shifts,
            'scoreboard' => $this->scoreboard(),
            // Only sent to admins - powers the inline shift-override
            // controls on the board itself (see main.tsx). Regular parents
            // don't need the full roster.
            'parents' => $parent->is_admin
                ? ParentUser::with('child:id,name')->orderBy('name')->get()
                : [],
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

        $data = $request->validate([
            'seats' => ['required', 'integer', 'min:1', 'max:4'],
        ]);

        $updated = DB::table('shifts')
            ->where('id', $shift->id)
            ->whereNull('parent_id')
            ->update([
                'parent_id' => $parent->id,
                'child_id' => $parent->child_id,
                'seats' => $data['seats'],
                'updated_at' => now(),
            ]);

        if ($updated === 0) {
            return response()->json(['error' => 'This slot was just taken. Refreshing the board.'], 409);
        }

        return response()->json(['shift' => ShiftWeek::present($shift->fresh(['child', 'parent']))]);
    }

    /**
     * A parent may cancel a shift if it belongs to their own child -
     * regardless of which parent record actually made the booking (e.g.
     * either parent of the same child can cancel the other's booking).
     * Admin override lives in AdminController.
     */
    public function cancel(Request $request, Shift $shift)
    {
        $parent = $request->attributes->get('currentParent');
        abort_if(! $parent, 401);
        abort_if($shift->child_id !== $parent->child_id, 403, 'You can only cancel shifts for your own child.');

        $shift->update(['parent_id' => null, 'child_id' => null, 'seats' => null]);

        return response()->json(['shift' => ShiftWeek::present($shift->fresh())]);
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
}
