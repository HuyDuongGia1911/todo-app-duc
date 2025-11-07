<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('monthly_summaries', function (Blueprint $table) {
            $table->json('tasks_cache')->nullable();   // lưu danh sách task của tháng
            $table->json('stats')->nullable()->change(); // nếu bạn đã có rồi thì bỏ
            $table->unsignedInteger('total_tasks')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('monthly_summaries', function (Blueprint $table) {
            $table->dropColumn(['tasks_cache', 'total_tasks']);
        });
    }
};