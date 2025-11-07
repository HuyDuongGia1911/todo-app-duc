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
    Schema::table('deadline_tasks', function (Blueprint $table) {
        $table->renameColumn('deadline_id', 'kpi_id');
    });
}


    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('kpi_id_in_deadline_tasks', function (Blueprint $table) {
            //
        });
    }
};
