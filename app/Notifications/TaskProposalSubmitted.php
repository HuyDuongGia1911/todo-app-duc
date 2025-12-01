<?php

namespace App\Notifications;

use App\Models\TaskProposal;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskProposalSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected TaskProposal $proposal) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Đề xuất mới cần phê duyệt')
            ->greeting('Xin chào ' . ($notifiable->name ?? 'bạn'))
            ->line($this->proposal->user->name . ' vừa gửi đề xuất "' . $this->proposal->title . '".')
            ->action('Xem đề xuất', url('/management/proposals'))
            ->line('Vui lòng xem xét và phản hồi sớm.');
    }

    public function toArray($notifiable): array
    {
        return [
            'proposal_id' => $this->proposal->id,
            'type' => $this->proposal->type,
            'title' => $this->proposal->title,
            'priority' => $this->proposal->priority,
            'submitted_by' => [
                'id' => $this->proposal->user->id,
                'name' => $this->proposal->user->name,
            ],
            'status' => $this->proposal->status,
        ];
    }
}
