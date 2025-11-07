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
    Schema::rename('deadline_tasks', 'kpi_tasks');
}

public function down()
{
    Schema::rename('kpi_tasks', 'deadline_tasks');
}

};
