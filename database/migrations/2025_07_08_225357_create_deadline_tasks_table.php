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
    Schema::create('deadline_tasks', function (Blueprint $table) {
        $table->id();
        $table->foreignId('deadline_id')->constrained()->onDelete('cascade');
        $table->string('task_title');        // Tên task
        $table->integer('target_progress');  // Tiến độ riêng của task
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
        Schema::dropIfExists('deadline_tasks');
    }
};
