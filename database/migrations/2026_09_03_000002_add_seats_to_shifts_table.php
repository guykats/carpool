<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            // How many children this driver is taking - set when claiming
            // the shift ("אני מסיע"). Null until assigned.
            $table->unsignedTinyInteger('seats')->nullable()->after('child_id');
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->dropColumn('seats');
        });
    }
};
