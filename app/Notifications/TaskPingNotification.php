<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskPingNotification extends Notification
{
    use Queueable;

    public function __construct(private Task $task, private string $message, private ?User $sender)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'title' => $this->task->title,
            'message' => $this->message,
            'sender' => $this->sender ? $this->sender->only(['id', 'name']) : null,
            'type' => 'task_ping',
        ];
    }
}
