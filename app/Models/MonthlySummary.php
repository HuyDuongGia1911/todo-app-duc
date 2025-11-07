<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonthlySummary extends Model
{
protected $fillable = [
    'user_id', 'month', 'title', 'content', 'stats', 'locked_at', 'tasks_cache'
];


    protected $casts = [
        'stats'     => 'array',
        'tasks_cache' => 'array',
        'locked_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isLocked(): bool
    {
        return !is_null($this->locked_at);
    }

    public function lock(): void
    {
        $this->locked_at = now();
        $this->save();
    }
}
