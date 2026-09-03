<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds departure_3/return_3 (3 cars per direction instead of 2).
     * Laravel's enum() column emits a CHECK constraint that can't be
     * altered in place on SQLite, and MODIFY COLUMN syntax differs by
     * driver - swapping via a temporary plain-string column works
     * identically on both SQLite (dev) and MySQL (prod) without needing
     * doctrine/dbal, and preserves existing shift rows.
     */
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->string('type_new', 20)->nullable()->after('type');
        });

        DB::statement('UPDATE shifts SET type_new = type');

        Schema::table('shifts', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('shifts', function (Blueprint $table) {
            $table->renameColumn('type_new', 'type');
        });

        // Dropping the original `type` column also drops the composite
        // unique index defined on it in the original migration
        // (date+type) - recreate it, or duplicate shift generation could
        // slip through the on-demand generator's firstOrCreate() guard.
        Schema::table('shifts', function (Blueprint $table) {
            $table->unique(['date', 'type']);
        });
    }

    public function down(): void
    {
        // Not meaningfully reversible without first deleting any
        // departure_3/return_3 rows - left as a manual step if ever needed.
    }
};
