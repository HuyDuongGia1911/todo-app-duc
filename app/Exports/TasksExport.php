<?php

namespace App\Exports;

use App\Models\Task;
use Maatwebsite\Excel\Concerns\FromCollection; //Chỉ ra rằng dữ liệu sẽ lấy từ Collection
use Maatwebsite\Excel\Concerns\WithHeadings; //Chỉ ra rằng sẽ có tiêu đề cột (header).

class TasksExport implements FromCollection, WithHeadings
{
    protected $query; //biến để lưu query để áp filter

    // Constructor nhận query động
    public function __construct($query)
    {
        $this->query = $query; // Lưu query để dùng trong collection()
    }

    public function collection() //Lấy dữ liệu từ query với các cột cụ thể.
    {
        return $this->query->select('id', 'title', 'user_id', 'task_date', 'shift', 'type', 'supervisor', 'status', 'priority', 'detail', 'progress', 'file_link', 'created_at', 'updated_at')->get();//select() giới hạn cột
    }

    public function headings(): array //header row cho file excel
    {
        return [
            'ID',
            'Title',
            'User ID',
            'Task Date',
            'Shift',
            'Type',
            'Supervisor',
            'Status',
            'Priority',
            'Detail',
            'Progress',
            'File Link',
            'Created At',
            'Updated At',
        ];
    }
}
