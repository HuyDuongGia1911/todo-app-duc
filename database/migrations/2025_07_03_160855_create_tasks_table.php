<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // người tạo
            $table->date('task_date'); // ngày thực hiện

            $table->string('shift')->nullable();       // Ca làm việc
            $table->string('type')->nullable();        // Daily, Info, Phát sinh
            $table->string('title')->nullable();       // Tên task
            $table->string('supervisor')->nullable();  // Người phụ trách kiểm tra
            $table->string('status')->nullable();      // Hoàn thành, Đang làm...
            $table->string('detail')->nullable();      // Chi tiết task
            $table->integer('progress')->nullable();   // Tiến độ
            $table->string('file_link')->nullable();   // Link file

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
