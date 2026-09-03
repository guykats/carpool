<?php

namespace App\Http\Controllers;

use App\Models\Child;
use App\Models\ParentUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ParentController extends Controller
{
    /**
     * Login/signup screen: pick a name and a child from the fixed dropdown.
     * See PRD 4.1 - this is the only "auth" screen the app has.
     */
    public function create(): Response
    {
        return Inertia::render('login', [
            'children' => Child::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Creates a new parent identity immediately assigned to a child
     * (self-service - no admin approval step, see PRD 4.1).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'child_id' => ['required', 'exists:children,id'],
        ]);

        $parent = ParentUser::create([
            'uuid' => (string) Str::uuid(),
            'name' => $data['name'],
            'child_id' => $data['child_id'],
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
