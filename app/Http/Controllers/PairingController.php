<?php

namespace App\Http\Controllers;

use App\Models\Child;
use App\Models\DeviceLink;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Desktop devices have no platform authenticator for the Face ID gate (see
 * PRD 4.1), so instead of a form of their own, they show a QR code that a
 * phone scans. The phone identifies itself (using its own existing identity
 * if recognized, or going through the normal first-time flow if not) and
 * approves the session; the desktop polls until that happens, then adopts
 * the same parent identity. No expiry - small family app, not worth the
 * complexity (see PRD).
 */
class PairingController extends Controller
{
    /** Desktop calls this to start a new pairing session. */
    public function store()
    {
        $link = DeviceLink::create(['token' => Str::random(40)]);

        return response()->json(['token' => $link->token]);
    }

    /** The page a phone lands on after scanning the QR code. */
    public function page(string $token): Response
    {
        DeviceLink::where('token', $token)->firstOrFail(); // 404s an unknown/garbage token

        return Inertia::render('pairing', [
            'token' => $token,
            'children' => Child::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /** Desktop polls this until a phone approves it. */
    public function status(string $token)
    {
        $link = DeviceLink::where('token', $token)->with('parent')->firstOrFail();

        return response()->json([
            'approved' => $link->parent_id !== null,
            'uuid' => $link->parent?->uuid,
        ]);
    }

    /**
     * Phone calls this once it knows who the current parent is - either
     * because it already had a UUID (IdentifyParent middleware resolved it
     * from the request header) or because it just completed the normal
     * signup flow and has a brand new one. 401 here means the phone isn't
     * identified yet; the frontend should run the identify flow first.
     */
    public function approve(Request $request, string $token)
    {
        $parent = $request->attributes->get('currentParent');
        abort_if(! $parent, 401, 'Not identified yet.');

        $link = DeviceLink::where('token', $token)->firstOrFail();
        $link->update(['parent_id' => $parent->id]);

        return response()->json(['ok' => true]);
    }
}
