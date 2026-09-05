<?php

namespace Database\Seeders;

use App\Models\Family;
use App\Models\ParentUser;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Setting::current();

        // Replace these placeholder names with the real 7 families.
        $families = collect(['Family 1', 'Family 2', 'Family 3', 'Family 4', 'Family 5', 'Family 6', 'Family 7'])
            ->map(fn ($name) => Family::firstOrCreate(['name' => $name]));

        // The single fixed admin account - is_admin is only ever set here,
        // never through the app itself (see PRD section 3). No name field
        // to key off any more, so find-or-create by the is_admin flag.
        $admin = ParentUser::firstOrCreate(
            ['is_admin' => true],
            [
                'uuid' => (string) Str::uuid(),
                'family_id' => $families->first()->id,
            ]
        );

        $this->command->info("Admin UUID (save this - it's the admin's login token): {$admin->uuid}");
    }
}
