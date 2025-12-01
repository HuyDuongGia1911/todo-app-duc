<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('task_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['task', 'kpi']);
            $table->string('title');
            $table->longText('description')->nullable();
            $table->string('priority')->nullable();
            $table->date('expected_deadline')->nullable();
            $table->string('kpi_month', 7)->nullable();
            $table->integer('kpi_target')->nullable();
            $table->json('attachments')->nullable();
            $table->string('status', 20)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->foreignId('linked_task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('linked_kpi_id')->nullable()->constrained('kpis')->nullOnDelete();
            $table->timestamp('user_read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_proposals');
    }
};
