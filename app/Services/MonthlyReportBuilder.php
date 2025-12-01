<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\KPI;
use App\Models\Task;
use App\Services\MonthlyKpiAggregator;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class MonthlyReportBuilder
{
    protected MonthlyKpiAggregator $kpiAggregator;

    public function __construct(MonthlyKpiAggregator $kpiAggregator)
    {
        $this->kpiAggregator = $kpiAggregator;
    }

    public function generate(int $userId, string $yearMonth): array
    {
        $period = Carbon::createFromFormat('Y-m', $yearMonth)->startOfMonth();
        $start = $period->copy()->startOfMonth();
        $end = $period->copy()->endOfMonth();

        $tasks = $this->fetchTasks($userId, $start, $end);
        $taskStats = $this->buildTaskStats($tasks, $period);
        $taskCache = $this->buildTaskCache($tasks);

        $kpis = $this->collectKpis($userId, $start, $end);
        $activityLogs = $this->collectActivityLogs($userId, $start, $end);
        $highlights = $this->pickHighlights($tasks);
        $issues = $this->buildIssues($taskStats, $kpis);
        $recommendations = $this->buildRecommendations($taskStats, $issues);

        $monthLabel = $period->translatedFormat('Tháng m Y');
        $title = sprintf('BÁO CÁO CÔNG VIỆC THÁNG %02d NĂM %d', $period->month, $period->year);
        $content = $this->renderContent(
            $monthLabel,
            $taskStats,
            $kpis,
            $highlights,
            $issues,
            $recommendations,
            $activityLogs
        );

        return [
            'title' => $title,
            'content' => $content,
            'stats' => $taskStats,
            'tasks_cache' => $taskCache,
            'sections' => [
                'highlights' => $highlights,
                'issues' => $issues,
                'recommendations' => $recommendations,
                'kpis' => $kpis,
                'activity_logs' => $activityLogs,
            ],
            'activity_logs' => $activityLogs,
        ];
    }
    protected function collectActivityLogs(int $userId, Carbon $start, Carbon $end): array
    {
        return ActivityLog::query()
            ->where('user_id', $userId)
            ->whereBetween('logged_at', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
            ->orderBy('logged_at')
            ->orderBy('id')
            ->get()
            ->map(function (ActivityLog $log) {
                return [
                    'id' => $log->id,
                    'title' => $log->title,
                    'content' => $log->content,
                    'tags' => $log->tags ?? [],
                    'logged_at' => optional($log->logged_at)->toDateTimeString(),
                ];
            })
            ->values()
            ->all();
    }


    /**
     * Lấy task user sở hữu hoặc được assign trong tháng.
     */
    protected function fetchTasks(int $userId, Carbon $start, Carbon $end): Collection
    {
        return Task::query()
            ->with(['users' => fn($query) => $query->where('users.id', $userId)])
            ->whereBetween('task_date', [$start->toDateString(), $end->toDateString()])
            ->where(function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->orWhereHas('users', fn($sub) => $sub->where('users.id', $userId));
            })
            ->orderBy('task_date')
            ->get();
    }

    protected function buildTaskStats(Collection $tasks, Carbon $period): array
    {
        $total = $tasks->count();
        $done = $tasks->where('status', 'Đã hoàn thành')->count();
        $today = Carbon::today();
        $overdue = $tasks->filter(function (Task $task) use ($today) {
            $deadline = $task->deadline_at ? Carbon::parse($task->deadline_at) : Carbon::parse($task->task_date);
            return $task->status !== 'Đã hoàn thành' && $deadline->lt($today);
        })->count();
        $pending = $total - $done;
        $avgPerDay = $period->daysInMonth > 0 ? round($total / $period->daysInMonth, 1) : 0;
        $onTimeRate = $total > 0 ? round((($total - $overdue) / $total) * 100, 2) : 0;

        return [
            'total' => $total,
            'done' => $done,
            'overdue' => $overdue,
            'pending' => $pending,
            'avg_per_day' => $avgPerDay,
            'on_time_rate' => $onTimeRate,
        ];
    }

    protected function buildTaskCache(Collection $tasks): array
    {
        $grouped = [];
        foreach ($tasks as $task) {
            $title = $task->title ?: '(Không tên)';
            if (!isset($grouped[$title])) {
                $grouped[$title] = [
                    'title' => $title,
                    'progress' => 0,
                    'dates' => [],
                    'status' => $task->status,
                    'links' => [],
                ];
            }

            if ($task->status === 'Đã hoàn thành') {
                $grouped[$title]['progress'] += (int) ($task->progress ?? 0);
            }

            $grouped[$title]['dates'][] = $task->task_date;
            if (!empty($task->file_link)) {
                $grouped[$title]['links'][] = $task->file_link;
            }
        }

        return collect($grouped)
            ->map(function (array $row) {
                $links = collect($row['links'])
                    ->filter(fn($link) => is_string($link) && strlen(trim($link)) > 0)
                    ->map(fn($link) => trim($link))
                    ->unique()
                    ->values()
                    ->all();

                $row['links'] = $links;
                $row['link'] = $links[0] ?? null;
                return $row;
            })
            ->values()
            ->all();
    }

    protected function collectKpis(int $userId, Carbon $start, Carbon $end): array
    {
        return KPI::query()
            ->where('user_id', $userId)
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->get()
            ->map(function (KPI $kpi) {
                $this->kpiAggregator->recalculate($kpi, false);

                return [
                    'id' => $kpi->id,
                    'name' => $kpi->name,
                    'target_progress' => (int) ($kpi->target_progress ?? 0),
                    'actual_progress' => (int) ($kpi->actual_progress ?? 0),
                    'percent' => (float) ($kpi->percent ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    protected function pickHighlights(Collection $tasks): array
    {
        if ($tasks->isEmpty()) {
            return ['Chưa có công việc nào được ghi nhận trong tháng.'];
        }

        $priorityRank = [
            'Khẩn cấp' => 4,
            'Cao' => 3,
            'Trung bình' => 2,
            'Thấp' => 1,
        ];

        return $tasks
            ->sortByDesc(function (Task $task) use ($priorityRank) {
                $statusScore = $task->status === 'Đã hoàn thành' ? 2 : 1;
                $priorityScore = $priorityRank[$task->priority] ?? 0;
                $progress = (int) ($task->progress ?? 0);
                return $statusScore * 1000 + $priorityScore * 100 + $progress;
            })
            ->take(3)
            ->map(function (Task $task) {
                $status = $task->status ?? 'Đang thực hiện';
                $progress = (int) ($task->progress ?? 0);
                return sprintf('- %s – %s (%d%%)', $task->title ?? '(Không tên)', $status, $progress);
            })
            ->values()
            ->all();
    }

    protected function buildIssues(array $stats, array $kpis): array
    {
        $issues = [];
        if (($stats['overdue'] ?? 0) > 0) {
            $issues[] = sprintf('Có %d công việc quá hạn cần xử lý.', $stats['overdue']);
        }
        if (($stats['done'] ?? 0) < ($stats['total'] ?? 0)) {
            $issues[] = 'Một số đầu việc vẫn đang dang dở, cần theo sát tiến độ.';
        }
        $kpiBelowTarget = collect($kpis)->first(fn($kpi) => ($kpi['percent'] ?? 0) < 100 && ($kpi['target_progress'] ?? 0) > 0);
        if ($kpiBelowTarget) {
            $issues[] = sprintf('Tiến độ KPI "%s" chưa đạt mục tiêu (%s%%).', $kpiBelowTarget['name'] ?? 'KPI', number_format($kpiBelowTarget['percent'], 2));
        }

        return $issues ?: ['Không có vấn đề nghiêm trọng được ghi nhận.'];
    }

    protected function buildRecommendations(array $stats, array $issues): array
    {
        $recommendations = [];
        if (($stats['overdue'] ?? 0) > 0) {
            $recommendations[] = 'Rà soát lịch trình và phân bổ lại nhân sự cho các task quá hạn.';
        }
        if (($stats['on_time_rate'] ?? 100) < 90) {
            $recommendations[] = 'Tăng cường theo dõi deadline hằng ngày để nâng tỷ lệ hoàn thành đúng hạn.';
        }
        if (($stats['pending'] ?? 0) > 0) {
            $recommendations[] = 'Ưu tiên hoàn tất các đầu việc dang dở trước khi nhận thêm nhiệm vụ mới.';
        }

        if (empty($recommendations)) {
            $recommendations[] = 'Tiếp tục duy trì quy trình làm việc hiện tại và chia sẻ kinh nghiệm cho đội nhóm.';
        }

        if (!empty($issues) && $issues[0] === 'Không có vấn đề nghiêm trọng được ghi nhận.') {
            $recommendations = ['Tiếp tục duy trì hiệu suất làm việc và tối ưu tài nguyên khi cần.'];
        }

        return $recommendations;
    }

    protected function renderContent(
        string $monthLabel,
        array $stats,
        array $kpis,
        array $highlights,
        array $issues,
        array $recommendations,
        array $activityLogs
    ): string {
        $overview = [
            sprintf('- Tổng số công việc: %d', $stats['total'] ?? 0),
            sprintf('- Công việc đã hoàn thành: %d', $stats['done'] ?? 0),
            sprintf('- Công việc quá hạn: %d', $stats['overdue'] ?? 0),
            sprintf('- Trung bình mỗi ngày: %s task', number_format($stats['avg_per_day'] ?? 0, 1)),
            sprintf('- Tỷ lệ hoàn thành đúng hạn: %s%%', number_format($stats['on_time_rate'] ?? 0, 2)),
        ];

        $kpiLines = empty($kpis)
            ? ['- Chưa có KPI nào được ghi nhận trong tháng.']
            : collect($kpis)->map(function (array $kpi) {
                return sprintf(
                    '- %s: %s%% (Mục tiêu: %d, Thực tế: %d)',
                    $kpi['name'] ?? ('KPI #' . $kpi['id']),
                    number_format($kpi['percent'] ?? 0, 2),
                    $kpi['target_progress'] ?? 0,
                    $kpi['actual_progress'] ?? 0
                );
            })->all();

        $contentSections = [
            '1. Tổng quan khối lượng công việc' => $overview,
            '2. Tiến độ KPI ' . $monthLabel => $kpiLines,
            '3. Các công việc nổi bật' => $highlights,
            '4. Các vấn đề tồn tại' => $issues,
            '5. Kiến nghị / Đề xuất' => $recommendations,
        ];

        $logSection = $this->formatActivityLogSection($activityLogs);
        $contentSections['6. Nhật ký hoạt động'] = $logSection;

        $lines = [];
        foreach ($contentSections as $title => $details) {
            $lines[] = $title;
            foreach ($details as $row) {
                $lines[] = $row;
            }
            $lines[] = '';
        }

        return trim(implode("\n", $lines));
    }

    protected function formatActivityLogSection(array $logs): array
    {
        if (empty($logs)) {
            return ['- Chưa có ghi chép nào được lưu trong tháng.'];
        }

        return array_map(function (array $log) {
            $timestamp = isset($log['logged_at'])
                ? Carbon::parse($log['logged_at'])->format('d/m')
                : '--/--';
            $detail = $log['content'] ?? '';
            return sprintf('- [%s] %s%s', $timestamp, $log['title'], $detail ? ": {$detail}" : '');
        }, $logs);
    }
}
