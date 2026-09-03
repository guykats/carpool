<?php

namespace App\Http\Controllers;

use App\Models\Child;
use App\Models\ParentUser;
use App\Models\Setting;
use App\Models\Shift;
use App\Support\ShiftWeek;
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
     * Deleting a child nulls out child_id on any parents/shifts that
     * referenced it (both FKs are nullOnDelete - see the migrations), so
     * this is safe at the DB level. It does lose that child's historical
     * ride count from the scoreboard though (Shift::whereNotNull('child_id')
     * in ShiftController::scoreboard), which the frontend warns about
     * before calling this.
     */
    public function destroyChild(Child $child)
    {
        $child->delete();

        return response()->json(['ok' => true]);
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
     * Admin override: assign, reassign or clear any shift regardless of
     * who currently holds it, including already-past shifts (PRD 4.2.3 /
     * 4.3 / 4.4 - retroactive correction). Called from the main board
     * (main.tsx) when the viewer is an admin - see ShiftController::index,
     * which includes the parents list only for admins.
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
