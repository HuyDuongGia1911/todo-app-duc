<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Chú ý: Nếu hệ thống có nhiều dữ liệu, nên backfill theo batch
        DB::statement("
            INSERT IGNORE INTO task_user (task_id, user_id, progress, status, created_at, updated_at)
            SELECT t.id AS task_id,
                   t.user_id AS user_id,
                   COALESCE(t.progress, 0) AS progress,
                   COALESCE(t.status, 'Chưa hoàn thành') AS status,
                   t.created_at,
                   t.updated_at
            FROM tasks t
            WHERE t.user_id IS NOT NULL
        ");
    }

    public function down(): void
    {
        // Rollback: xóa dữ liệu đã backfill (không xóa bảng)
        DB::statement("DELETE tu FROM task_user tu
            LEFT JOIN tasks t ON t.id = tu.task_id
            WHERE tu.created_at = t.created_at AND tu.updated_at = t.updated_at
        ");
    }
};
