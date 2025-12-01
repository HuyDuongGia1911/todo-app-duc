<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('synced_summary_id')->nullable()->constrained('monthly_summaries')->nullOnDelete();
            $table->string('title', 150);
            $table->longText('content')->nullable();
            $table->json('tags')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamp('logged_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'logged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
