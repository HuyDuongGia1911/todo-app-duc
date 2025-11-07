<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $table = 'shifts'; // Khai báo rõ bảng cần dùng

    protected $fillable = ['shift_name'];
}
