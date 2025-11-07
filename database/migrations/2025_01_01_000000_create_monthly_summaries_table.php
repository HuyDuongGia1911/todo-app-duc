<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('monthly_summaries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');                 // ai tạo
            $table->string('month', 7);                            // 'YYYY-MM'
            $table->string('title')->nullable();                   // ví dụ: "Tháng 6/2025"
            $table->longText('content')->nullable();               // HTML từ Quill
            $table->json('stats')->nullable();                     // tuỳ bạn: {total: 51, blog: 35, review: 5, ...}
            $table->timestamp('locked_at')->nullable();            // khi chốt
            $table->timestamps();

            $table->unique(['user_id', 'month']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_summaries');
    }
};
