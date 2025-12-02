<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KPI;
use App\Services\MonthlyKpiAggregator;
use App\Services\ApprovalLogger;
use Illuminate\Http\Request;
use Carbon\Carbon;

class KpiAdminController extends Controller
{
    /** @var MonthlyKpiAggregator */
    protected $aggregator;

    public function __construct(MonthlyKpiAggregator $aggregator)
    {
        $this->aggregator = $aggregator;
    }

    // LIST: trả JSON danh sách KPI + progress/target đã tính
    public function index(Request $request)
    {
        $q = KPI::with('tasks')->orderByDesc('id');

        // (tuỳ chọn) filter theo tháng Y-m như trang KPI user
        if ($request->filled('month')) {
            $m = Carbon::createFromFormat('Y-m', $request->input('month'));
            $start = $m->copy()->startOfMonth()->toDateString();
            $end   = $m->copy()->endOfMonth()->toDateString();
            $q->whereDate('start_date', '>=', $start)
              ->whereDate('end_date', '<=', $end);
        }

        $kpis = $q->get();

        foreach ($kpis as $kpi) {
            $this->aggregator->recalculate($kpi);
            $kpi->target = $kpi->target_progress;
            $kpi->actual = $kpi->actual_progress;
            $kpi->progress = $kpi->percent;
        }

        return response()->json($kpis);
    }

    // CREATE: chỉ tạo KPI (name + month + user_id), progress/target không nhập tay
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'month'   => 'required|date_format:Y-m',
            'user_id' => 'nullable|integer|exists:users,id', // cho phép tạo thay người khác
            'note'    => 'nullable|string',
        ]);

        $m = Carbon::createFromFormat('Y-m', $data['month']);
        $start = $m->copy()->startOfMonth()->toDateString();
        $end   = $m->copy()->endOfMonth()->toDateString();

        $kpi = KPI::create([
            'user_id'    => $data['user_id'] ?? auth()->id(),
            'start_date' => $start,
            'end_date'   => $end,
            'name'       => $data['name'],
            'task_names' => '', // sẽ được lấp khi gán KPITask
            'note'       => $data['note'] ?? null,
        ]);

        $this->aggregator->recalculate($kpi);
        $kpi->target = $kpi->target_progress;
        $kpi->actual = $kpi->actual_progress;
        $kpi->progress = $kpi->percent;

        ApprovalLogger::record(
            'kpi',
            $kpi->id,
            'kpi_created',
            [
                'name' => $kpi->name,
                'month' => $data['month'],
                'user_id' => $kpi->user_id,
            ],
            $kpi->name
        );

        return response()->json($kpi, 201);
    }

    // UPDATE: cho đổi name + month (+ note). Progress/target vẫn tính động.
    public function update(Request $request, KPI $kpi)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'month' => 'required|date_format:Y-m',
            'note'  => 'nullable|string',
        ]);

        $m = Carbon::createFromFormat('Y-m', $data['month']);
        $start = $m->copy()->startOfMonth()->toDateString();
        $end   = $m->copy()->endOfMonth()->toDateString();

        $kpi->update([
            'start_date' => $start,
            'end_date'   => $end,
            'name'       => $data['name'],
            'note'       => $data['note'] ?? $kpi->note,
        ]);

        $this->aggregator->recalculate($kpi);
        $kpi->target = $kpi->target_progress;
        $kpi->actual = $kpi->actual_progress;
        $kpi->progress = $kpi->percent;

        ApprovalLogger::record(
            'kpi',
            $kpi->id,
            'kpi_updated',
            [
                'name' => $kpi->name,
                'month' => $data['month'],
                'user_id' => $kpi->user_id,
            ],
            $kpi->name
        );

        return response()->json($kpi);
    }

    public function destroy(KPI $kpi)
    {
        ApprovalLogger::record(
            'kpi',
            $kpi->id,
            'kpi_deleted',
            [
                'name' => $kpi->name,
                'user_id' => $kpi->user_id,
            ],
            $kpi->name
        );

        $kpi->delete();
        return response()->json(['success' => true]);
    }
}
