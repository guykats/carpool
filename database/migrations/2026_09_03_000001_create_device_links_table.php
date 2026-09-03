<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_links', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique();
            // Null until a phone approves it - see PairingController.
            $table->foreignId('parent_id')->nullable()->constrained('parents')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_links');
    }
};
