<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskType extends Model
{
 protected $table = 'task_types'; // Khai báo rõ bảng cần dùng

    protected $fillable = ['type_name'];
}
