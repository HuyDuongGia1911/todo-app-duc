<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('task_proposal_recipient')) {
            Schema::create('task_proposal_recipient', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_proposal_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['task_proposal_id', 'user_id']);
            });
        }

        $managerIds = DB::table('users')
            ->whereIn('role', ['Admin', 'Trưởng phòng'])
            ->pluck('id');

        if ($managerIds->isEmpty()) {
            return;
        }

        $timestamp = now();

        DB::table('task_proposals')
            ->select('id', 'user_id')
            ->orderBy('id')
            ->chunk(200, function ($proposals) use ($managerIds, $timestamp) {
                $rows = [];

                foreach ($proposals as $proposal) {
                    foreach ($managerIds as $managerId) {
                        if ((int) $managerId === (int) $proposal->user_id) {
                            continue;
                        }

                        $rows[] = [
                            'task_proposal_id' => $proposal->id,
                            'user_id'          => $managerId,
                            'created_at'       => $timestamp,
                            'updated_at'       => $timestamp,
                        ];

                        if (count($rows) >= 500) {
                            DB::table('task_proposal_recipient')->insertOrIgnore($rows);
                            $rows = [];
                        }
                    }
                }

                if (!empty($rows)) {
                    DB::table('task_proposal_recipient')->insertOrIgnore($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_proposal_recipient');
    }
};
