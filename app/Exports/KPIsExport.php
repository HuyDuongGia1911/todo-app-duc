<?php

namespace App\Exports;

use App\Models\KPI;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class KPIsExport implements FromCollection, WithHeadings
{
    protected $query;

    public function __construct($query)
    {
        $this->query = $query;
    }

    public function collection()
    {
        return $this->query->select('start_date', 'end_date', 'name', 'task_names', 'note', 'created_at', 'updated_at')->get();
    }

    public function headings(): array
    {
        return [
            'Ngày bắt đầu',
            'Ngày đến hạn',
            'Tên Deadline',
            'Tên công việc',
            'Ghi chú',
            'Ngày tạo',
            'Ngày cập nhật',
        ];
    }
}