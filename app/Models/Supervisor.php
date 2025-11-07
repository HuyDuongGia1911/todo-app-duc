<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supervisor extends Model
{
   protected $table = 'supervisors'; // Khai báo rõ bảng cần dùng

    protected $fillable = ['supervisor_name'];
}
