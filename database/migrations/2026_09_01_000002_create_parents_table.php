<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parents', function (Blueprint $table) {
            $table->id();
            // Client-generated UUID, persisted in the browser's LocalStorage.
            // This is the app's only notion of "identity" - no passwords.
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->foreignId('child_id')->nullable()->constrained('children')->nullOnDelete();
            $table->boolean('is_admin')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parents');
    }
};
