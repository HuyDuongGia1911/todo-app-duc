<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;
use App\Services\MonthlyKpiAggregator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class DashboardApiController extends Controller
{
    /** @var MonthlyKpiAggregator */
    protected $aggregator;

    public function __construct(MonthlyKpiAggregator $aggregator)
    {
        $this->aggregator = $aggregator;
    }

    /**
     * Lấy query task bao gồm cả task sở hữu trực tiếp và task được gán qua pivot.
     */
    protected function queryForUser(int $userId)
    {
        return Task::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                    ->orWhereHas('users', fn($sub) => $sub->where('users.id', $userId));
            });
    }

    public function tasksByDay()
    {
        $userId = Auth::id();

        $days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        $result = [];

        foreach ($days as $index => $day) {
            $date = Carbon::now()->startOfWeek()->addDays($index)->toDateString();
            $tasks = $this->queryForUser($userId)->whereDate('task_date', $date);

            $result[] = [
                'day' => $day,
                'count' => (clone $tasks)->count(),
                'overdue' => (clone $tasks)
                    ->where('status', '!=', 'Đã hoàn thành')
                    ->whereDate('task_date', '<', Carbon::today())
                    ->count(),
                'completed' => (clone $tasks)->where('status', 'Đã hoàn thành')->count(),
            ];
        }

        return response()->json($result);
    }
   public function tasksByType()
{
    $userId = Auth::id();

    $data = $this->queryForUser($userId)
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
    $kpi = \App\Models\Kpi::findOrFail($id);

    $this->aggregator->recalculate($kpi);
    $dailyMap = $this->aggregator->dailyActualMap($kpi);

    $rangeStart = Carbon::parse($kpi->start_date)->startOfDay();
    $cursor = $rangeStart->copy();
    $rangeEnd = Carbon::parse($kpi->end_date)->startOfDay();

    $totalDays = max(1, $rangeStart->diffInDays($rangeEnd) + 1);
    $cumulativeActual = 0;
    $totalTarget = max(0, (int) $kpi->target_progress);
    $data = [];

    while ($cursor->lte($rangeEnd)) {
        $label = $cursor->format('d/m');
        $currentDate = $cursor->toDateString();

        $elapsedDays = max(1, $rangeStart->diffInDays($cursor) + 1);
        $expected = min(100, round(($elapsedDays / $totalDays) * 100));

        $dailyActual = $dailyMap[$currentDate]['actual'] ?? 0;
        $cumulativeActual += $dailyActual;
        $actualPercent = $totalTarget > 0 ? round(min($cumulativeActual / $totalTarget, 1) * 100, 2) : 0;

        $data[] = [
            'day' => $label,
            'expected' => $expected,
            'actual' => $actualPercent,
        ];

        $cursor->addDay();
    }

    return response()->json($data);
}



}
