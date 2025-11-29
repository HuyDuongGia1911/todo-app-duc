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
use App\Services\MonthlyReportBuilder;

class MonthlySummaryController extends Controller
{
    protected MonthlyReportBuilder $reportBuilder;

    public function __construct(MonthlyReportBuilder $reportBuilder)
    {
        $this->reportBuilder = $reportBuilder;
    }
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

        $payload = $this->reportBuilder->generate(Auth::id(), $data['month']);

        $summary = MonthlySummary::create([
            'user_id' => Auth::id(),
            'month' => $data['month'],
            'title' => $data['title'] ?? ($payload['title'] ?? ''),
            'content' => $data['content'] ?? ($payload['content'] ?? ''),
            'stats' => $payload['stats'] ?? [],
            'tasks_cache' => $payload['tasks_cache'] ?? [],
            'total_tasks' => $payload['stats']['total'] ?? 0,
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


    public function preview(Request $request)
    {
        $request->validate(['month' => 'required|date_format:Y-m']);
        $payload = $this->reportBuilder->generate(Auth::id(), $request->input('month'));
        return response()->json($payload);
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

        $payload = $this->reportBuilder->generate($summary->user_id, $summary->month);

        $summary->fill([
            'title' => $payload['title'] ?? $summary->title,
            'content' => $payload['content'] ?? $summary->content,
            'stats' => $payload['stats'] ?? $summary->stats,
            'tasks_cache' => $payload['tasks_cache'] ?? $summary->tasks_cache,
            'total_tasks' => $payload['stats']['total'] ?? $summary->total_tasks,
        ])->save();

        return response()->json($summary->fresh());
    }
    private function authorizeOwner(MonthlySummary $summary): void
    {
        abort_if($summary->user_id !== Auth::id(), 403);
    }
}
