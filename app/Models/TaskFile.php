<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * @property-read string|null $url Computed download URL.
 */
class TaskFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'original_name',
        'path',
        'mime_type',
        'size',
    ];

    protected $appends = ['url'];

    protected $hidden = ['path'];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function getUrlAttribute(): ?string
    {
        if (!$this->path) {
            return null;
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return $disk->url($this->path);
    }
}
