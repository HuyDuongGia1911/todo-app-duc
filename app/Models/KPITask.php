<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KPITask extends Model
{
    protected $table = 'kpi_tasks';
    protected $fillable = ['kpi_id', 'task_title', 'target_progress'];

    public function kpi()
    {
         return $this->belongsTo(KPI::class, 'kpi_id'); 
    }
    public function title()
{
    return $this->belongsTo(TaskTitle::class, 'task_title', 'title_name');
}
}
