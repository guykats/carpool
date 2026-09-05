<?php

namespace App\Http\Controllers;

use App\Models\Family;
use App\Models\ParentUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ParentController extends Controller
{
    /**
     * Login/signup screen: pick a family from the fixed dropdown. No
     * personal name is collected anywhere on this site - identity is
     * purely "which family does this device represent". See PRD 4.1.
     */
    public function create(): Response
    {
        return Inertia::render('login', [
            'families' => Family::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Creates a new device identity immediately assigned to a family
     * (self-service - no admin approval step, see PRD 4.1).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'family_id' => ['required', 'exists:families,id'],
        ]);

        $parent = ParentUser::create([
            'uuid' => (string) Str::uuid(),
            'family_id' => $data['family_id'],
            'is_admin' => false,
        ]);

        // Set the identity cookie server-side (400 days - see
        // env.production.example for why that number). This is the
        // primary identity mechanism: unlike the X-Parent-Uuid header
        // (which JS has to attach and can't on the very first hard page
        // load), a cookie is sent automatically on every request from
        // this point on, including cold starts.
        return response()
            ->json(['uuid' => $parent->uuid])
            ->cookie('carpool_parent_uuid', $parent->uuid, 400 * 24 * 60, '/', null, $request->secure(), false, false, 'Lax');
    }
}
