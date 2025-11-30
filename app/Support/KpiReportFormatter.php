<?php

namespace App\Support;

use App\Models\KPI;
use App\Models\KPITask;
use App\Services\MonthlyKpiAggregator;

class KpiReportFormatter
{
    /**
     * Build normalized task rows for KPI reporting contexts (web detail + exports).
     */
    public static function buildTaskRows(KPI $kpi, MonthlyKpiAggregator $aggregator, array $tasksCache = []): array
    {
        $groupedCache = collect($tasksCache ?? [])->groupBy('title');
        $performance = collect($aggregator->breakdown($kpi))->keyBy('title');

        return $kpi->tasks
            ->map(function (KPITask $task) use ($groupedCache, $kpi, $performance) {
                $title = $task->task_title ?: '(Không tên)';
                $related = $groupedCache->get($title, collect());

                $dates = $related
                    ->flatMap(fn($entry) => collect($entry['dates'] ?? []))
                    ->filter(fn($date) => is_string($date) && strlen(trim($date)) > 0)
                    ->values()
                    ->all();

                $links = $related
                    ->flatMap(function ($entry) {
                        $links = collect();

                        if (!empty($entry['link']) && is_string($entry['link'])) {
                            $links->push(trim($entry['link']));
                        }

                        if (!empty($entry['links']) && is_array($entry['links'])) {
                            foreach ($entry['links'] as $link) {
                                if (is_string($link) && strlen(trim($link)) > 0) {
                                    $links->push(trim($link));
                                }
                            }
                        }

                        return $links;
                    })
                    ->map(fn($link) => trim($link))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                $timeRange = 'Không có';
                if (count($dates) >= 2) {
                    $timeRange = $dates[0] . ' - ' . $dates[array_key_last($dates)];
                } elseif (count($dates) === 1) {
                    $timeRange = $dates[0];
                }

                $target = (float) ($task->target_progress ?? 0);
                $actual = $task->completed_unit;

                if ($actual === null && $performance->has($title)) {
                    $actual = $performance[$title]['actual'] ?? 0;
                }

                $actual = (float) ($actual ?? 0);
                $percent = $target > 0 ? round(($actual / $target) * 100, 2) : 0.0;

                return [
                    'kpi_id' => $kpi->id,
                    'kpi_name' => $kpi->name,
                    'task_title' => $title,
                    'time_range' => $timeRange,
                    'target' => $target,
                    'actual' => $actual,
                    'percent' => $percent,
                    'evaluation' => self::evaluatePercent($percent),
                    'proof_links' => $links,
                    'proof_count' => count($links),
                ];
            })
            ->values()
            ->all();
    }

    public static function evaluatePercent(float $percent): string
    {
        if ($percent >= 80.0) {
            return 'Đạt';
        }

        if ($percent <= 30.0) {
            return 'Không đạt';
        }

        return 'Chưa đạt';
    }
}
