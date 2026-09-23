<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->string('name');
            $table->timestamps();
        });

        // Best-effort seed of Israeli holidays / days of rest that fall on
        // a club day (Monday or Wednesday) for the 2026-2027 season, from
        // the Ministry of Education's published vacation calendar (תשפ"ז).
        // Only dates landing on Mon/Wed matter for a Mon/Wed club - other
        // holiday days don't need an entry since no shift would exist for
        // them anyway. The admin can add/remove/correct any of these via
        // the admin panel if a date turns out to be off.
        $seed = [
            ['2026-09-21', 'יום כיפור'],
            ['2026-09-28', 'חול המועד סוכות'],
            ['2026-09-30', 'חול המועד סוכות'],
            ['2026-12-07', 'חנוכה'],
            ['2026-12-09', 'חנוכה'],
            ['2027-03-24', 'פורים'],
            ['2027-04-14', 'ערב פסח'],
            ['2027-04-19', 'חול המועד פסח'],
            ['2027-04-21', 'חול המועד פסח'],
            ['2027-04-26', 'חול המועד פסח'],
            ['2027-04-28', 'שביעי של פסח'],
            ['2027-05-12', 'יום העצמאות'],
        ];

        $now = now();
        DB::table('holidays')->insert(array_map(
            fn ($row) => ['date' => $row[0], 'name' => $row[1], 'created_at' => $now, 'updated_at' => $now],
            $seed
        ));
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
