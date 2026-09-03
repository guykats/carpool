<?php

namespace App\Http\Controllers;

use App\Models\Child;
use App\Models\ParentUser;
use App\Models\Setting;
use App\Models\Shift;
use App\Support\ShiftWeek;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin', [
            'children' => Child::orderBy('name')->get(),
            'parents' => ParentUser::with('child:id,name')->orderBy('name')->get(),
            'settings' => Setting::current(),
        ]);
    }

    public function storeChild(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255']]);
        $child = Child::create($data);

        return response()->json(['child' => $child]);
    }

    /**
     * Reassign a parent to a different child, or merge duplicate device
     * identities onto the right child - PRD 4.3 / edge cases in section 6.
     */
    public function reassignParent(Request $request, ParentUser $parent)
    {
        $data = $request->validate(['child_id' => ['required', 'exists:children,id']]);
        $parent->update(['child_id' => $data['child_id']]);

        return response()->json(['parent' => $parent->fresh('child')]);
    }

    /**
     * Shift list for the admin override view - unlike ShiftController::index
     * this is unrestricted: works for past weeks too (there's nothing in
     * ShiftWeek::ensureGenerated that limits it to the future), which is
     * what lets an admin retroactively fix a shift after the fact.
     */
    public function shiftsForWeek(Request $request)
    {
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

        return response()->json([
            'weekStart' => $weekStart->format('Y-m-d'),
            'shifts' => $shifts,
        ]);
    }

    /**
     * Admin override: assign, reassign or clear any shift regardless of
     * who currently holds it, including already-past shifts (PRD 4.2.3 /
     * 4.3 / 4.4 - retroactive correction).
     */
    public function overrideShift(Request $request, Shift $shift)
    {
        $data = $request->validate([
            'parent_id' => ['nullable', 'exists:parents,id'],
            'seats' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $childId = $data['parent_id'] ? ParentUser::find($data['parent_id'])->child_id : null;

        $shift->update([
            'parent_id' => $data['parent_id'] ?? null,
            'child_id' => $childId,
            'seats' => $data['parent_id'] ? ($data['seats'] ?? 1) : null,
        ]);

        return response()->json(['shift' => ShiftWeek::present($shift->fresh(['child', 'parent']))]);
    }

    /** One-off time edit for an already-generated shift - PRD section 6. */
    public function editShiftTime(Request $request, Shift $shift)
    {
        $data = $request->validate(['time' => ['required', 'date_format:H:i']]);
        $shift->update(['time' => $data['time']]);

        return response()->json(['shift' => ShiftWeek::present($shift->fresh(['child', 'parent']))]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'days' => ['required', 'array'],
            'days.*' => ['string'],
            'departure_time' => ['required', 'date_format:H:i'],
            'return_time' => ['required', 'date_format:H:i'],
        ]);

        $settings = Setting::current();
        $settings->update($data);

        return response()->json(['settings' => $settings]);
    }
}
