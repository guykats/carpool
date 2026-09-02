<?php

namespace Database\Seeders;

use App\Models\Child;
use App\Models\ParentUser;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Setting::current();

        // Replace these placeholder names with the real 7 kids.
        $children = collect(['Child 1', 'Child 2', 'Child 3', 'Child 4', 'Child 5', 'Child 6', 'Child 7'])
            ->map(fn ($name) => Child::firstOrCreate(['name' => $name]));

        // The single fixed admin account - is_admin is only ever set here,
        // never through the app itself (see PRD section 3).
        $admin = ParentUser::firstOrCreate(
            ['name' => 'Admin'],
            [
                'uuid' => (string) Str::uuid(),
                'child_id' => $children->first()->id,
                'is_admin' => true,
            ]
        );

        $this->command->info("Admin UUID (save this - it's the admin's login token): {$admin->uuid}");
    }
}
