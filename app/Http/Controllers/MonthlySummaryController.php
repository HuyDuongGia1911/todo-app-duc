<?php

namespace App\Http\Controllers;

use App\Exports\MonthlySummariesExport;
use App\Models\MonthlySummary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;
use App\Models\Task;
use App\Exports\SingleMonthlySummaryExport;
use App\Models\KPI;

class MonthlySummaryController extends Controller
{
    public function index(Request $request)
    {
        if ($request->wantsJson()) {
            return MonthlySummary::where('user_id', Auth::id())
                ->orderBy('month', 'desc')
                ->get();
        }
        return view('summaries.index');
    }



    public function store(Request $request)
    {
        $data = $this->validateData($request);

        $summary = MonthlySummary::create([
            'user_id' => Auth::id(),
            'month' => $data['month'],
            'title' => $data['title'] ?? '',
            'content' => $data['content'] ?? '',
            'stats' => [],
            'tasks_cache' => [],
        ]);

        return response()->json($summary, 201);
    }

    public function show(MonthlySummary $summary)
    {
        $this->authorizeOwner($summary);

        $month = Carbon::parse($summary->month);

        // Lấy tất cả KPI của user trong tháng
        $kpis = KPI::with('tasks')
            ->where('user_id', $summary->user_id)
            ->whereDate('start_date', '<=', $month->endOfMonth())
            ->whereDate('end_date', '>=', $month->startOfMonth())
            ->get()
            ->map(function ($kpi) {
                $tasks = $kpi->tasks;

                // Chỉ lấy task có status === 'Đã hoàn thành'
                $completedTasks = $tasks->filter(fn($t) => $t->status === 'Đã hoàn thành');

                $totalTarget = $tasks->sum('target_progress');
                $completedTarget = $completedTasks->sum('target_progress');

                $progress = $totalTarget > 0 ? round(($completedTarget / $totalTarget) * 100, 2) : 0;

                return [
                    'id' => $kpi->id,
                    'name' => $kpi->name,
                    'note' => $kpi->note,
                    'task_names' => $tasks->pluck('task_title')->implode(', '),
                    'task_names_array' => $tasks->pluck('task_title')->toArray(),
                    'task_targets' => $tasks->pluck('target_progress', 'task_title'),
                    'progress' => $progress,
                    'completed_count' => $completedTasks->count(),
                    'total_count' => $tasks->count(),
                ];
            })
            ->values()
            ->toArray();

        return response()->json([
            'id' => $summary->id,
            'month' => $summary->month,
            'title' => $summary->title,
            'content' => $summary->content,
            'locked_at' => $summary->locked_at,
            'tasks_cache' => $summary->tasks_cache,
            'stats' => $summary->stats,
            'kpis' => $kpis,
        ]);
    }




    public function update(Request $request, MonthlySummary $summary)
    {
        $this->authorizeOwner($summary);
        if ($summary->isLocked()) {
            return response()->json(['message' => 'Báo cáo đã chốt, không thể sửa!'], 423);
        }

        $summary->update(['content' => $request->input('content')]);
        return response()->json($summary);
    }


    public function destroy(MonthlySummary $summary)
    {
        $this->authorizeOwner($summary);
        if ($summary->isLocked()) {
            return response()->json(['message' => 'Báo cáo đã chốt, không thể xoá!'], 423);
        }

        $summary->delete();
        return response()->json(['success' => true]);
    }

    public function lock(MonthlySummary $summary)
    {
        $this->authorizeOwner($summary);
        if ($summary->isLocked()) {
            return response()->json(['message' => 'Đã chốt rồi!'], 409);
        }

        $summary->lock();
        return response()->json(['success' => true, 'locked_at' => $summary->locked_at]);
    }
    public function exportById(MonthlySummary $summary)
    {
        $this->authorizeOwner($summary);
        return Excel::download(new SingleMonthlySummaryExport($summary), 'summary_' . $summary->month . '.xlsx');
    }


    private function validateData(Request $request): array
    {
        return $request->validate([
            'month'   => 'required|date_format:Y-m',
            'title'   => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'stats'   => 'nullable|array',
        ]);
    }
    private function buildMonthRange(string $ym): array
    {
        $start = Carbon::createFromFormat('Y-m', $ym)->startOfMonth();
        $end   = Carbon::createFromFormat('Y-m', $ym)->endOfMonth();
        return [$start, $end];
    }

    private function computeTasksForMonth(string $ym, int $userId): array
    {
        [$start, $end] = $this->buildMonthRange($ym);

        $tasks = Task::where('user_id', $userId)
            ->whereBetween('task_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('task_date')
            ->get([
                'id',
                'title',
                'type',
                'priority',
                'progress',
                'task_date'
            ]);

        // vài thống kê mẫu
        $byType = $tasks->groupBy('type')->map->count();
        $byPriority = $tasks->groupBy('priority')->map->count();
        $avgProgress = round($tasks->avg('progress') ?? 0, 2);

        return [
            'items'       => $tasks->toArray(),
            'total'       => $tasks->count(),
            'by_type'     => $byType,
            'by_priority' => $byPriority,
            'avg_progress' => $avgProgress,
        ];
    }
   public function regenerate(MonthlySummary $summary)
{
    $this->authorizeOwner($summary);

    $month = Carbon::parse($summary->month);
    $start = $month->copy()->startOfMonth()->toDateString();
    $end = $month->copy()->endOfMonth()->toDateString();

    $tasks = Task::where('user_id', $summary->user_id)
        ->whereBetween('task_date', [$start, $end])
        ->get();

    $merged = [];
    foreach ($tasks as $task) {
        $title = $task->title ?? '(Không tên)';
        if (!isset($merged[$title])) {
            $merged[$title] = [
                'title' => $title,
                'progress' => 0,
                'dates' => [],
                'status' => $task->status ?? null,
                'links' => [], 
            ];
        }

        if ($task->status === 'Đã hoàn thành') {
            $merged[$title]['progress'] += $task->progress ?? 0;
        }

        $merged[$title]['dates'][] = $task->task_date;

        // thêm link nếu có
       if (!empty($task->file_link) && !in_array($task->file_link, $merged[$title]['links'])) {
    $merged[$title]['links'][] = $task->file_link;
}
    }

    // Lấy 1 link đầu tiên, xoá mảng links
   $tasksCache = collect($merged)->map(function ($item) {
    // đảm bảo unique + sạch
    $links = collect($item['links'] ?? [])
        ->filter(fn($l) => is_string($l) && strlen(trim($l)))
        ->map(fn($l) => trim($l))
        ->unique()
        ->values()
        ->all();

    // GIỮ CẢ HAI: 'links' (đầy đủ) và 'link' (link đầu tiên cho backward-compat)
    $item['links'] = $links;
    $item['link']  = $links[0] ?? null;

    return $item;
})->values()->all();

    $today = Carbon::today();
    $doneCount = $tasks->where('status', 'Đã hoàn thành')->count();
    $overdueCount = $tasks->filter(fn($t) => $t->status !== 'Đã hoàn thành' && Carbon::parse($t->task_date)->lt($today))->count();
    $pendingCount = $tasks->filter(fn($t) => $t->status !== 'Đã hoàn thành' && Carbon::parse($t->task_date)->gte($today))->count();

    $summary->tasks_cache = $tasksCache;
$summary->stats = [
    'total'   => $tasks->count(),
    'done'    => $doneCount,
    'pending' => $pendingCount,
    'overdue' => $overdueCount,
];

$summary->save();
return response()->json($summary);
}
    private function authorizeOwner(MonthlySummary $summary): void
    {
        abort_if($summary->user_id !== Auth::id(), 403);
    }
}
