<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->time('time');
            $table->enum('type', ['departure_1', 'departure_2', 'return_1', 'return_2']);
            $table->foreignId('parent_id')->nullable()->constrained('parents')->nullOnDelete();
            // Denormalized from parent_id at assignment time, for fast scoreboard aggregation.
            $table->foreignId('child_id')->nullable()->constrained('children')->nullOnDelete();
            $table->timestamps();

            // One row per (date, type) - prevents the on-demand generator from
            // creating duplicate slots if two requests race to generate the same week.
            $table->unique(['date', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
