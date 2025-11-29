<?php

namespace App\Services;

use App\Models\KPI;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class MonthlyKpiAggregator
{
    public function recalculate(KPI $kpi, bool $persist = true): KPI
    {
        $tasks = $this->fetchTasksForUser($kpi);
        [$target, $actual] = $this->sumTotals($tasks, (int) $kpi->user_id);

        $percent = $target > 0 ? round(min($actual / $target, 1) * 100, 2) : 0;

        if ($persist) {
            $kpi->forceFill([
                'target_progress' => $target,
                'actual_progress' => $actual,
                'percent' => $percent,
            ])->save();
        } else {
            $kpi->target_progress = $target;
            $kpi->actual_progress = $actual;
            $kpi->percent = $percent;
        }

        return $kpi;
    }

    public function breakdown(KPI $kpi): array
    {
        $tasks = $this->fetchTasksForUser($kpi);
        $userId = (int) $kpi->user_id;

        $grouped = [];

        foreach ($tasks as $task) {
            [$goal, $done] = $this->resolveContribution($task, $userId);
            if ($goal === 0 && $done === 0) {
                continue;
            }

            $title = $task->title ?: 'Công việc không tên';

            if (!isset($grouped[$title])) {
                $grouped[$title] = [
                    'title' => $title,
                    'target' => 0,
                    'actual' => 0,
                ];
            }

            $grouped[$title]['target'] += $goal;
            $grouped[$title]['actual'] += $done;
        }

        return collect($grouped)
            ->map(function (array $row) {
                $target = $row['target'];
                $actual = $row['actual'];
                $row['ratio'] = $target > 0 ? round(min($actual / $target, 1) * 100, 2) : 0;
                return $row;
            })
            ->values()
            ->all();
    }

    public function dailyActualMap(KPI $kpi): array
    {
        $tasks = $this->fetchTasksForUser($kpi);
        $userId = (int) $kpi->user_id;
        $daily = [];

        foreach ($tasks as $task) {
            [$goal, $done] = $this->resolveContribution($task, $userId);
            $date = Carbon::parse($task->task_date)->toDateString();

            if (!isset($daily[$date])) {
                $daily[$date] = ['target' => 0, 'actual' => 0];
            }

            $daily[$date]['target'] += $goal;
            $daily[$date]['actual'] += $done;
        }

        ksort($daily);

        return $daily;
    }

    protected function sumTotals(Collection $tasks, int $userId): array
    {
        $target = 0;
        $actual = 0;

        foreach ($tasks as $task) {
            [$goal, $done] = $this->resolveContribution($task, $userId);
            $target += $goal;
            $actual += $done;
        }

        return [$target, $actual];
    }

    protected function fetchTasksForUser(KPI $kpi): Collection
    {
        $start = Carbon::parse($kpi->start_date)->startOfDay();
        $end = Carbon::parse($kpi->end_date)->endOfDay();
        $userId = (int) $kpi->user_id;

        $range = [$start->toDateString(), $end->toDateString()];

        return Task::query()
            ->with(['users' => function ($query) use ($userId) {
                $query->where('users.id', $userId);
            }])
            ->where(function ($query) use ($range) {
                $query->whereBetween('task_date', $range)
                    ->orWhereBetween('deadline_at', $range);
            })
            ->where(function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->orWhereHas('users', fn($sub) => $sub->where('users.id', $userId));
            })
            ->get();
    }

    protected function resolveContribution(Task $task, int $userId): array
    {
        $goal = max(0, (int) ($task->progress ?? 0));
        $actual = 0;

        $pivot = $task->users->first()?->pivot;

        if ($pivot) {
            $actual = (int) ($pivot->progress ?? 0);
            if ($actual <= 0 && ($pivot->status ?? null) === 'Đã hoàn thành') {
                $actual = $goal > 0 ? $goal : 1;
            }
        } elseif ((int) $task->user_id === $userId && $task->status === 'Đã hoàn thành') {
            $actual = $goal > 0 ? $goal : 1;
        }

        if ($goal > 0 && $actual > $goal) {
            $actual = $goal;
        }

        return [$goal, max(0, $actual)];
    }
}
