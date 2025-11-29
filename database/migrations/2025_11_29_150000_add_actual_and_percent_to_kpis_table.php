<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('kpis', function (Blueprint $table) {
            if (!Schema::hasColumn('kpis', 'actual_progress')) {
                $table->unsignedInteger('actual_progress')->default(0)->after('target_progress');
            }

            if (!Schema::hasColumn('kpis', 'percent')) {
                $table->decimal('percent', 5, 2)->default(0)->after('actual_progress');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kpis', function (Blueprint $table) {
            if (Schema::hasColumn('kpis', 'percent')) {
                $table->dropColumn('percent');
            }

            if (Schema::hasColumn('kpis', 'actual_progress')) {
                $table->dropColumn('actual_progress');
            }
        });
    }
};
