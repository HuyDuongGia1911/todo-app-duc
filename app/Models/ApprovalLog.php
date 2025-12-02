<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApprovalLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'entity_type',
        'entity_id',
        'entity_label',
        'action',
        'actor_id',
        'actor_name',
        'actor_role',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];
}
