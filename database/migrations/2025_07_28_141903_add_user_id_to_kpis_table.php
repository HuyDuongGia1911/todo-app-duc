<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
      public function up(): void
    {
        Schema::table('kpis', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
        });
    }

public function down(): void
{
    Schema::table('kpis', function (Blueprint $table) {
        if (Schema::hasColumn('kpis', 'user_id')) {
            $table->dropColumn('user_id'); // Xoá cột trực tiếp (nếu FK chưa tạo thì an toàn)
        }
    });
}
};
