<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Renames the "child" concept to "family" throughout, and drops the
     * parent's personal name - identity is now purely "which family does
     * this device represent", nothing more. Renaming (not drop+recreate)
     * preserves all existing data.
     *
     * Every step is state-checked before acting - the "third car" migration
     * earlier taught the hard way that a step can fail partway through in
     * production, so a retry needs to safely pick up wherever it stopped
     * rather than re-attempt already-completed steps.
     */
    public function up(): void
    {
        if (! Schema::hasTable('families')) {
            Schema::rename('children', 'families');
        }

        if (Schema::hasColumn('parents', 'child_id')) {
            Schema::table('parents', function (Blueprint $table) {
                $table->renameColumn('child_id', 'family_id');
            });
        }

        if (Schema::hasColumn('shifts', 'child_id')) {
            Schema::table('shifts', function (Blueprint $table) {
                $table->renameColumn('child_id', 'family_id');
            });
        }

        if (Schema::hasColumn('parents', 'name')) {
            Schema::table('parents', function (Blueprint $table) {
                $table->dropColumn('name');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('parents', 'name')) {
            Schema::table('parents', function (Blueprint $table) {
                $table->string('name')->default('');
            });
        }

        if (Schema::hasColumn('shifts', 'family_id')) {
            Schema::table('shifts', function (Blueprint $table) {
                $table->renameColumn('family_id', 'child_id');
            });
        }

        if (Schema::hasColumn('parents', 'family_id')) {
            Schema::table('parents', function (Blueprint $table) {
                $table->renameColumn('family_id', 'child_id');
            });
        }

        if (! Schema::hasTable('children')) {
            Schema::rename('families', 'children');
        }
    }
};
