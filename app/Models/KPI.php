<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KPI extends Model
{
    protected $table = 'kpis';
    protected $fillable = [
        'start_date',
        'end_date',
        'name',
        'task_names',
        'target_progress',
        'actual_progress',
        'percent',
        'note',
        'user_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'target_progress' => 'integer',
        'actual_progress' => 'integer',
        'percent' => 'float',
    ];

    public function getTaskNamesArray()
    {
        return explode(',', $this->task_names);
    }

    public function tasks()
    {
        return $this->hasMany(KPITask::class, 'kpi_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
