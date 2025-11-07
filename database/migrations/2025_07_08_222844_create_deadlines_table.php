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
   public function up()
{
    Schema::create('deadlines', function (Blueprint $table) {
        $table->id();
        $table->date('start_date');    // Ngày bắt đầu
        $table->date('end_date');      // Ngày đến hạn
        $table->string('name');        // Tên deadline
        $table->text('task_names');    // Danh sách công việc (string, json hoặc comma-separated)
        $table->integer('target_progress')->default(0); // Tiến độ mục tiêu
        $table->text('note')->nullable(); // Ghi chú
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('deadlines');
    }
};
