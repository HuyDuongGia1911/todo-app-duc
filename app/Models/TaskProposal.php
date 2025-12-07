<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TaskProposal extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'description',
        'priority',
        'expected_deadline',
        'kpi_month',
        'kpi_target',
        'attachments',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_note',
        'linked_task_id',
        'linked_kpi_id',
        'user_read_at',
    ];

    protected $casts = [
        'attachments' => 'array',
        'expected_deadline' => 'date',
        'reviewed_at' => 'datetime',
        'user_read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_proposal_recipient')->withTimestamps();
    }

    public function linkedTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'linked_task_id');
    }

    public function linkedKpi(): BelongsTo
    {
        return $this->belongsTo(KPI::class, 'linked_kpi_id');
    }
}
