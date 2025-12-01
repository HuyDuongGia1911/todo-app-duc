<?php

namespace App\Notifications;

use App\Models\TaskProposal;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskProposalReviewed extends Notification implements ShouldQueue
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
            ->subject('Đề xuất của bạn đã được xử lý')
            ->greeting('Xin chào ' . ($notifiable->name ?? 'bạn'))
            ->line('Đề xuất "' . $this->proposal->title . '" đã được ' . ($this->proposal->status === 'approved' ? 'chấp thuận' : 'từ chối') . '.')
            ->when($this->proposal->review_note, fn(MailMessage $msg) => $msg->line('Ghi chú: ' . $this->proposal->review_note))
            ->action('Xem chi tiết', url('/proposals'))
            ->line('Cảm ơn bạn đã đóng góp!');
    }

    public function toArray($notifiable): array
    {
        return [
            'proposal_id' => $this->proposal->id,
            'type' => $this->proposal->type,
            'title' => $this->proposal->title,
            'status' => $this->proposal->status,
            'reviewed_at' => optional($this->proposal->reviewed_at)->toIso8601String(),
            'review_note' => $this->proposal->review_note,
            'linked_task_id' => $this->proposal->linked_task_id,
            'linked_kpi_id' => $this->proposal->linked_kpi_id,
        ];
    }
}
