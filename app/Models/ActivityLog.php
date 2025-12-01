<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'task_id',
        'synced_summary_id',
        'title',
        'content',
        'tags',
        'attachments',
        'logged_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'attachments' => 'array',
        'logged_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function summary(): BelongsTo
    {
        return $this->belongsTo(MonthlySummary::class, 'synced_summary_id');
    }
}
