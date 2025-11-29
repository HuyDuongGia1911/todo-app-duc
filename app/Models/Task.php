<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'assigned_by',
        'task_date',
        'deadline_at',
        'shift',
        'type',
        'title',
        'supervisor',
        'status',
        'priority',
        'progress',
        'detail',
        'file_link',
    ];

    public function shift()
    {
        return $this->belongsTo(Shift::class, 'shift');
    }
    public function type()
    {
        return $this->belongsTo(TaskType::class, 'type');
    }
    public function title()
    {
        return $this->belongsTo(TaskTitle::class, 'title');
    }
    public function supervisor()
    {
        return $this->belongsTo(Supervisor::class, 'supervisor');
    }
    public function status()
    {
        return $this->belongsTo(Status::class, 'status');
    }
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }


    /**
     * Scope: lấy các task mà user này được giao (qua bảng pivot).
     * Dùng cho “Công việc của tôi”.
     */
    public function scopeAssignedToUser($query, $userId)
    {
        return $query->whereHas('users', function ($q) use ($userId) {
            $q->where('users.id', $userId);
        });
    }
    public function users()
    {
        return $this->belongsToMany(User::class, 'task_user')
            ->withPivot('status', 'progress') // 👈 load luôn các cột phụ
            ->withTimestamps();
    }

    public function files()
    {
        return $this->hasMany(TaskFile::class);
    }

    public function assignedByUser()
    {
        return $this->belongsTo(\App\Models\User::class, 'assigned_by');
    }

    // ✅ Tính tiến độ theo số người đã hoàn thành
    public function getCalculatedProgressAttribute()
    {
        $total = $this->users()->count();
        if ($total === 0) {
            return $this->progress ?? 0;
        }

        $done = $this->users->where('pivot.status', 'Đã hoàn thành')->count();

        return round(($done / $total) * 100, 2);
    }
}
