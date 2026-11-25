<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Family-level admin: every device linked to an admin family is treated
     * as admin (see ParentUser::isAdmin), including devices linked later.
     * Also grants admin to the Katz family.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('families', 'is_admin')) {
            Schema::table('families', function (Blueprint $table) {
                $table->boolean('is_admin')->default(false);
            });
        }

        DB::table('families')
            ->where(function ($q) {
                $q->where('name', 'like', '%כץ%')
                    ->orWhere('name', 'like', '%Kats%')
                    ->orWhere('name', 'like', '%Katz%');
            })
            ->update(['is_admin' => true]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('families', 'is_admin')) {
            Schema::table('families', function (Blueprint $table) {
                $table->dropColumn('is_admin');
            });
        }
    }
};
