<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KPI extends Model
{
    protected $table = 'kpis';
    protected $fillable = ['start_date', 'end_date', 'name', 'task_names', 'target_progress', 'note','user_id',];

    public function getTaskNamesArray()
    {
        return explode(',', $this->task_names);
    }

    public function tasks()
    {
         return $this->hasMany(KPITask::class, 'kpi_id');
    }
}
