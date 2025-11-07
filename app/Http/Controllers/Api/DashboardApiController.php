<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class DashboardApiController extends Controller
{
    public function tasksByDay()
    {
        $userId = Auth::id();
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        $days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        $result = [];

        foreach ($days as $index => $day) {
            $date = Carbon::now()->startOfWeek()->addDays($index)->toDateString();

            $tasks = Task::whereDate('task_date', $date)
                ->where('user_id', $userId);

            $result[] = [
                'day' => $day,
                'count' => (clone $tasks)->count(),
                'overdue' => (clone $tasks)->where('status', '!=', 'Đã hoàn thành')->whereDate('task_date', '<', Carbon::today())->count(),
                'completed' => (clone $tasks)->where('status', 'Đã hoàn thành')->count(),
            ];
        }

        return response()->json($result);
    }
   public function tasksByType()
{
    $userId = Auth::id();

    $data = Task::where('user_id', $userId)
        ->selectRaw('type, COUNT(*) as count')
        ->groupBy('type')
        ->get();

    return response()->json($data);
}
// public function kpiProgress($id)
// {
//     $kpi = \App\Models\Kpi::with('tasks')->findOrFail($id);

//     $start = Carbon::parse($kpi->start_date);
//     $end = Carbon::parse($kpi->end_date);
//     $titles = $kpi->tasks->pluck('task_title')->toArray();
//     $userId = Auth::id();

//     $data = [];

//     while ($start->lte($end)) {
//         $label = $start->format('d/m');
//         $currentDate = $start->toDateString();

//         // Tiến độ kỳ vọng (dựa theo thời gian trôi qua)
//         $totalDays = Carbon::parse($kpi->end_date)->diffInDays(Carbon::parse($kpi->start_date));
//         $elapsedDays = Carbon::parse($kpi->start_date)->diffInDays($currentDate, false);
//         $expected = min(100, round(($elapsedDays / max(1, $totalDays)) * 100));

//         // Tiến độ thực tế (task đã hoàn thành)
//         $tasks = \App\Models\Task::whereIn('title', $titles)
//             ->whereDate('task_date', $currentDate)
//             ->where('user_id', $userId);

//         $total = (clone $tasks)->count();
//         $completed = (clone $tasks)->count();
//         $actual = $total > 0 ? round($completed / $total * 100) : 0;

//         $data[] = [
//             'day' => $label,
//             'expected' => $expected,
//             'actual' => $actual,
//         ];

//         $start->addDay();
//     }

//     return response()->json($data);
// }
public function kpiProgress($id)
{
    $kpi = \App\Models\Kpi::with('tasks')->findOrFail($id);

    $start = Carbon::parse($kpi->start_date);
    $end = Carbon::parse($kpi->end_date);
    $titles = $kpi->tasks->pluck('task_title')->toArray(); // Hoặc dùng task_id nếu có
    $userId = Auth::id();

    $data = [];

    // Tổng mục tiêu của KPI (cộng dồn tất cả target của các task liên quan)
    $totalTarget = $kpi->tasks->sum('target_progress');

    $cumulativeActual = 0;

    while ($start->lte($end)) {
        $label = $start->format('d/m');
        $currentDate = $start->toDateString();

        // Tiến độ kỳ vọng (tăng đều mỗi ngày)
        $totalDays = Carbon::parse($kpi->end_date)->diffInDays(Carbon::parse($kpi->start_date)) + 1;
        $elapsedDays = Carbon::parse($kpi->start_date)->diffInDays($currentDate, false) + 1;
        $expected = min(100, round(($elapsedDays / max(1, $totalDays)) * 100));

        // Tính tổng actual trong ngày (từ các task cùng title và ngày)
        $dailyActual = Task::whereIn('title', $titles)
            ->whereDate('task_date', $currentDate)
            ->where('status', 'Đã hoàn thành')
            ->where('user_id', $userId) 
            ->sum('progress'); // cộng tổng tiến độ thực hiện của từng task

        // Cộng dồn tiến độ từng ngày
        $cumulativeActual += $dailyActual;

        // Tính phần trăm thực tế
        $actual = $totalTarget > 0 ? round(($cumulativeActual / $totalTarget) * 100, 2) : 0;

        $data[] = [
            'day' => $label,
            'expected' => $expected,
            'actual' => min($actual, 100),
        ];

        $start->addDay();
    }

    return response()->json($data);
}



}
