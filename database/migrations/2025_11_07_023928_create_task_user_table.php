<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('task_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            // Thuộc tính riêng cho từng người trong task:
            $table->unsignedInteger('progress')->default(0); // 0..100
            $table->string('status')->default('Chưa hoàn thành'); // đồng nhất với hệ thống
            $table->timestamps();

            // Ngăn trùng lặp 1 người được gán nhiều lần cho cùng 1 task
            $table->unique(['task_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_user');
    }
};
