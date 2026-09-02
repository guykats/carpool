<?php

namespace App\Http\Controllers;

use App\Models\Child;
use App\Models\ParentUser;
use App\Models\Setting;
use App\Models\Shift;
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
     * Admin override: assign, reassign or clear any shift regardless of
     * who currently holds it (PRD 4.2.3 / 4.3).
     */
    public function overrideShift(Request $request, Shift $shift)
    {
        $data = $request->validate(['parent_id' => ['nullable', 'exists:parents,id']]);

        $childId = $data['parent_id'] ? ParentUser::find($data['parent_id'])->child_id : null;

        $shift->update(['parent_id' => $data['parent_id'], 'child_id' => $childId]);

        return response()->json(['shift' => $shift->fresh(['child', 'parent'])]);
    }

    /** One-off time edit for an already-generated shift - PRD section 6. */
    public function editShiftTime(Request $request, Shift $shift)
    {
        $data = $request->validate(['time' => ['required', 'date_format:H:i']]);
        $shift->update(['time' => $data['time']]);

        return response()->json(['shift' => $shift->fresh()]);
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
