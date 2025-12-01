<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KPI;
use App\Models\Task;
use App\Services\MonthlyKpiAggregator;
use App\Notifications\TaskPingNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class KpiHealthController extends Controller
{
    public function __construct(private MonthlyKpiAggregator $aggregator)
    {
    }

    public function index()
    {
        return view('management.kpi-health');
    }

    public function snapshot(Request $request)
    {
        $month = $request->input('month', now()->format('Y-m'));
        $range = $this->buildRange($month);

        $kpis = KPI::with('user')
            ->whereDate('start_date', $range['start']->toDateString())
            ->whereDate('end_date', $range['end']->toDateString())
            ->get();

        $kpis->each(fn(KPI $kpi) => $this->aggregator->recalculate($kpi, false));

        $summary = $this->buildSummary($kpis, $range['start']);
        $distribution = $this->buildDistribution($kpis);
        $riskKpis = $this->formatRiskKpis($kpis);
        $blockedTasks = $this->collectBlockedTasks($range['start'], $range['end']);

        return response()->json([
            'month' => $month,
            'summary' => $summary,
            'distribution' => $distribution,
            'risk_kpis' => $riskKpis,
            'blocked_tasks' => $blockedTasks,
        ]);
    }

    public function reassignKpi(Request $request, KPI $kpi)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'note' => ['nullable', 'string'],
        ]);

        $kpi->user_id = $validated['user_id'];
        if (array_key_exists('note', $validated)) {
            $kpi->note = $validated['note'];
        }
        $kpi->save();

        $this->aggregator->recalculate($kpi, false);

        $kpi->load('user:id,name,email');

        return response()->json([
            'success' => true,
            'kpi_id' => $kpi->id,
            'new_owner' => optional($kpi->user)->only(['id', 'name', 'email']),
        ]);
    }

    public function reassignTask(Request $request, Task $task)
    {
        $validated = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        DB::transaction(function () use ($task, $validated) {
            $sync = [];
            foreach ($validated['user_ids'] as $userId) {
                $sync[$userId] = [
                    'status' => 'Chưa hoàn thành',
                    'progress' => 0,
                ];
            }

            $task->users()->sync($sync);
            $task->status = 'Chưa hoàn thành';
            $task->save();
        });

        $task->load('users:id,name');

        return response()->json([
            'success' => true,
            'task_id' => $task->id,
            'new_owners' => $task->users->pluck('name', 'id'),
        ]);
    }

    public function pingTask(Request $request, Task $task)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $recipients = $task->users()->select('users.id', 'users.name', 'users.email')->get();

        if ($recipients->isEmpty()) {
            return response()->json([
                'message' => 'Task chưa có người phụ trách để ping.'
            ], 422);
        }

        Notification::send($recipients, new TaskPingNotification(
            $task,
            $validated['message'],
            $request->user()
        ));

        return response()->json([
            'success' => true,
        ]);
    }

    private function buildRange(string $month): array
    {
        $target = Carbon::createFromFormat('Y-m', $month);

        return [
            'start' => $target->copy()->startOfMonth(),
            'end' => $target->copy()->endOfMonth(),
        ];
    }

    private function buildSummary(Collection $kpis, Carbon $start): array
    {
        $total = $kpis->count();
        $onTrack = $kpis->where('percent', '>=', 90)->count();
        $atRisk = $kpis->whereBetween('percent', [70, 90])->count();
        $critical = $kpis->where('percent', '<', 70)->count();
        $avgPercent = $total > 0 ? round($kpis->avg('percent'), 1) : 0;

        return [
            'total' => $total,
            'on_track' => $onTrack,
            'at_risk' => $atRisk,
            'critical' => $critical,
            'avg_percent' => $avgPercent,
            'month_label' => $start->translatedFormat('F Y'),
        ];
    }

    private function buildDistribution(Collection $kpis): array
    {
        $buckets = [
            'excellent' => 0,
            'good' => 0,
            'warning' => 0,
            'critical' => 0,
        ];

        foreach ($kpis as $kpi) {
            $percent = (float) $kpi->percent;
            if ($percent >= 95) {
                $buckets['excellent']++; 
            } elseif ($percent >= 85) {
                $buckets['good']++;
            } elseif ($percent >= 70) {
                $buckets['warning']++;
            } else {
                $buckets['critical']++;
            }
        }

        return $buckets;
    }

    private function formatRiskKpis(Collection $kpis): array
    {
        return $kpis
            ->sortBy('percent')
            ->take(8)
            ->map(function (KPI $kpi) {
                $end = Carbon::parse($kpi->end_date);
                $daysDiff = $end->diffInDays(now(), false);

                return [
                    'id' => $kpi->id,
                    'name' => $kpi->name,
                    'owner' => optional($kpi->user)->name,
                    'percent' => (float) $kpi->percent,
                    'deadline' => $end->toDateString(),
                    'days_left' => $daysDiff,
                    'note' => $kpi->note,
                ];
            })
            ->values()
            ->all();
    }

    private function collectBlockedTasks(Carbon $start, Carbon $end): array
    {
        $query = Task::query()
            ->with(['assignedByUser:id,name', 'users:id,name'])
            ->where('status', '!=', 'Đã hoàn thành')
            ->whereNotNull('deadline_at')
            ->whereBetween('deadline_at', [$start->copy()->subDays(7), $end->copy()->addDays(7)])
            ->orderBy('deadline_at');

        return $query->take(10)->get()->map(function (Task $task) {
            $deadline = Carbon::parse($task->deadline_at);
            $days = $deadline->diffInDays(now(), false);

            $deadline = $task->deadline_at ? Carbon::parse($task->deadline_at) : null;

            return [
                'id' => $task->id,
                'title' => $task->title ?? 'Không tên',
                'priority' => $task->priority,
                'deadline' => $deadline?->toDateString(),
                'assigned_by' => optional($task->assignedByUser)->name,
                'owners' => $task->users->pluck('name')->all(),
                'status' => $task->status,
                'is_overdue' => $days > 0,
                'days_overdue' => $days,
            ];
        })->all();
    }
}
