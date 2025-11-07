<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KPI;
use App\Models\Task;
use Illuminate\Http\Request;
use Carbon\Carbon;

class KpiAdminController extends Controller
{
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

        // Tính progress động & tổng target
        foreach ($kpis as $kpi) {
            $start = min($kpi->start_date, $kpi->end_date);
            $end   = max($kpi->start_date, $kpi->end_date);

            $totalActual = 0;
            $totalTarget = 0;

            foreach ($kpi->tasks as $kt) {
                $actual = Task::whereRaw('LOWER(title) = ?', [strtolower($kt->task_title)])
                    ->whereBetween('task_date', [$start, $end])
                    ->where('user_id', $kpi->user_id)
                    ->where('status', 'Đã hoàn thành')
                    ->sum('progress');

                $totalActual += $actual;
                $totalTarget += $kt->target_progress ?? 0;
            }

            $kpi->target   = $totalTarget; // thêm trường trả về để FE hiện "Mục tiêu"
            $kpi->progress = $totalTarget > 0 ? round($totalActual / $totalTarget * 100) : 0; // %
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

        // Tính trường trả về (ban đầu 0 nếu chưa có KPITask)
        $kpi->load('tasks');
        $kpi->target = $kpi->tasks->sum('target_progress');
        $kpi->progress = 0;

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

        // Trả về kèm progress/target đã tính
        $kpi->load('tasks');

        $start = min($kpi->start_date, $kpi->end_date);
        $end   = max($kpi->start_date, $kpi->end_date);

        $totalActual = 0;
        $totalTarget = 0;

        foreach ($kpi->tasks as $kt) {
            $actual = Task::whereRaw('LOWER(title) = ?', [strtolower($kt->task_title)])
                ->whereBetween('task_date', [$start, $end])
                ->where('user_id', $kpi->user_id)
                ->where('status', 'Đã hoàn thành')
                ->sum('progress');

            $totalActual += $actual;
            $totalTarget += $kt->target_progress ?? 0;
        }

        $kpi->target   = $totalTarget;
        $kpi->progress = $totalTarget > 0 ? round($totalActual / $totalTarget * 100) : 0;

        return response()->json($kpi);
    }

    public function destroy(KPI $kpi)
    {
        $kpi->delete();
        return response()->json(['success' => true]);
    }
}
