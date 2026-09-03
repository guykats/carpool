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
     *
     * Every step is idempotent/state-checked: this failed once on
     * production because MySQL (unlike SQLite) refuses to drop a column
     * that's still part of a composite unique index - the fix is to drop
     * that index explicitly first. Since the failure left `type_new`
     * already added and populated (nothing lost, just stuck mid-way),
     * this version safely re-runs from whatever state it's in.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('shifts', 'type_new')) {
            Schema::table('shifts', function (Blueprint $table) {
                $table->string('type_new', 20)->nullable()->after('type');
            });
        }

        if (Schema::hasColumn('shifts', 'type')) {
            DB::statement('UPDATE shifts SET type_new = type WHERE type_new IS NULL');
        }

        if (Schema::hasColumn('shifts', 'type')) {
            try {
                Schema::table('shifts', function (Blueprint $table) {
                    $table->dropUnique(['date', 'type']);
                });
            } catch (\Throwable $e) {
                // Index already gone - fine.
            }

            Schema::table('shifts', function (Blueprint $table) {
                $table->dropColumn('type');
            });
        }

        if (! Schema::hasColumn('shifts', 'type') && Schema::hasColumn('shifts', 'type_new')) {
            Schema::table('shifts', function (Blueprint $table) {
                $table->renameColumn('type_new', 'type');
            });
        }

        try {
            Schema::table('shifts', function (Blueprint $table) {
                $table->unique(['date', 'type']);
            });
        } catch (\Throwable $e) {
            // Already exists - fine.
        }
    }

    public function down(): void
    {
        // Not meaningfully reversible.
    }
};
