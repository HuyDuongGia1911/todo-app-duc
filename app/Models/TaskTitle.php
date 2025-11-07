<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskTitle extends Model
{
    protected $table = 'task_titles'; // Khai báo rõ bảng cần dùng

    protected $fillable = ['title_name'];
}
