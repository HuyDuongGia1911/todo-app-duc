<?php

namespace App\Http\Controllers;

use App\Models\KPI;
use App\Models\KPITask;
use App\Models\Task;
use App\Models\TaskTitle;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KPIController extends Controller
{
    /**
     * ======================
     *  LIST KPI
     * ======================
     */
    public function index(Request $request)
    {
        $query = KPI::where('user_id', auth()->id())->with('tasks');

        if ($request->filled('month')) {
            $m = Carbon::createFromFormat('Y-m', $request->month);
            $start = $m->startOfMonth()->toDateString();
            $end   = $m->endOfMonth()->toDateString();

            $query->whereDate('start_date', $start)
                ->whereDate('end_date', $end);
        }

        $kpis = $query->orderByDesc('end_date')->get();
        $userId = auth()->id();

        foreach ($kpis as $kpi) {
            $progress = $this->calculateKPIProgress($kpi, $userId);
            $kpi->calculated_progress = $progress;
        }

        if ($request->boolean('json')) {
            return response()->json([
                'kpis' => $kpis,
                'stats' => [
                    'total' => $kpis->count(),
                    'done' => $kpis->where('status', 'Đã hoàn thành')->count(),
                    'pending' => $kpis->filter(fn($k) => $k->status !== 'Đã hoàn thành' && Carbon::parse($k->end_date)->gte(now()))->count(),
                    'overdue' => $kpis->filter(fn($k) => $k->status !== 'Đã hoàn thành' && Carbon::parse($k->end_date)->lt(now()))->count(),
                ],
                'filters' => [
                    'month' => $request->input('month'),
                ]
            ]);
        }

        return view('kpis.index', compact('kpis'));
    }

    /**
     * ======================
     *  CREATE
     * ======================
     */
    public function create()
    {
        $tasks = TaskTitle::pluck('title_name');
        return view('kpis.create', compact('tasks'));
    }

    /**
     * ======================
     *  STORE KPI
     * ======================
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'month'          => 'required|date_format:Y-m',
            'name'           => 'required|max:255',
            'task_titles'    => 'array',
            'task_titles.*'  => 'string',
            'target_progresses' => 'array',
            'note'           => 'nullable|string'
        ]);

        $userId = auth()->id();
        $month = Carbon::createFromFormat('Y-m', $data['month']);
        $start = $month->startOfMonth()->toDateString();
        $end   = $month->endOfMonth()->toDateString();

        // Không cho tạo KPI trùng tháng
        if (KPI::where('user_id', $userId)->whereDate('start_date', $start)->whereDate('end_date', $end)->exists()) {
            return back()->withErrors(['month' => 'Tháng này đã có KPI!'])->withInput();
        }

        $kpi = KPI::create([
            'user_id'    => $userId,
            'start_date' => $start,
            'end_date'   => $end,
            'name'       => $request->name,
            'task_names' => implode(',', $request->task_titles ?? []),
            'note'       => $request->note
        ]);

        // Lưu các task
        foreach ($request->task_titles ?? [] as $i => $title) {

            if (!TaskTitle::where('title_name', $title)->exists()) {
                TaskTitle::create(['title_name' => $title]);
            }

            $kpi->tasks()->create([
                'task_title' => $title,
                'target_progress' => $request->target_progresses[$i] ?? 0
            ]);
        }

        return redirect()->route('kpis.index')->with('success', 'Đã tạo KPI!');
    }

    /**
     * ======================
     *  SHOW DETAIL
     * ======================
     */
    public function show(KPI $kpi)
    {
        $userId = auth()->id();
        $start = Carbon::parse($kpi->start_date)->toDateString();
        $end   = Carbon::parse($kpi->end_date)->toDateString();

        $tasks = [];
        $totalActual = 0;
        $totalTarget = 0;

        foreach ($kpi->tasks as $t) {

            $actual = $this->countCompletedTasks($t->task_title, $userId, $start, $end);

            $target = $t->target_progress ?: 0;

            $tasks[] = [
                'title'  => $t->task_title,
                'actual' => $actual,
                'target' => $target,
                'ratio'  => $target > 0 ? min($actual / $target, 1) : 0
            ];

            $totalActual += $actual;
            $totalTarget += $target;
        }

        $overall = $totalTarget > 0 ? round(min($totalActual / $totalTarget, 1) * 100) : 0;

        return view('kpis.show', compact('kpi', 'tasks', 'overall'));
    }

    /**
     * ======================
     *  EDIT KPI
     * ======================
     */
    public function edit(KPI $kpi)
    {
        $tasks = TaskTitle::pluck('title_name');
        $selectedTasks = $kpi->tasks->pluck('task_title')->toArray();
        return view('kpis.edit', compact('kpi', 'tasks', 'selectedTasks'));
    }

    /**
     * ======================
     *  UPDATE KPI
     * ======================
     */
    public function update(Request $request, KPI $kpi)
    {
        $data = $request->validate([
            'month'             => 'required|date_format:Y-m',
            'name'              => 'required|max:255',
            'task_titles'       => 'array',
            'task_titles.*'     => 'string',
            'target_progresses' => 'array',
            'note'              => 'nullable|string'
        ]);

        $userId = auth()->id();
        $m = Carbon::createFromFormat('Y-m', $data['month']);
        $start = $m->startOfMonth()->toDateString();
        $end   = $m->endOfMonth()->toDateString();

        // Check duplicate month
        if (KPI::where('user_id', $userId)
            ->where('id', '!=', $kpi->id)
            ->whereDate('start_date', $start)
            ->whereDate('end_date', $end)->exists()
        ) {

            return response()->json(['message' => 'Tháng này đã có KPI!'], 422);
        }

        // Update KPI
        $kpi->update([
            'start_date' => $start,
            'end_date'   => $end,
            'name'       => $request->name,
            'task_names' => implode(',', $request->task_titles ?? []),
            'note'       => $request->note
        ]);

        // Update tasks
        $kpi->tasks()->delete();

        foreach ($request->task_titles ?? [] as $i => $title) {

            if (!TaskTitle::where('title_name', $title)->exists()) {
                TaskTitle::create(['title_name' => $title]);
            }

            $kpi->tasks()->create([
                'task_title' => $title,
                'target_progress' => $request->target_progresses[$i] ?? 0
            ]);
        }

        return redirect()->route('kpis.index')->with('success', 'Đã cập nhật KPI!');
    }

    /**
     * ======================
     *  DELETE KPI
     * ======================
     */
    public function destroy(KPI $kpi)
    {
        $kpi->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    /**
     * ======================
     *  UPDATE STATUS
     * ======================
     */
    public function updateStatus(Request $request, KPI $kpi)
    {
        $request->validate(['status' => 'required|in:Chưa hoàn thành,Đã hoàn thành']);
        $kpi->update(['status' => $request->status]);
        return response()->json(['success' => true]);
    }

    /**
     * ======================
     *  SHOW JSON
     * ======================
     */
    public function showJson(KPI $kpi)
    {
        $userId = auth()->id();
        $start = Carbon::parse($kpi->start_date)->toDateString();
        $end   = Carbon::parse($kpi->end_date)->toDateString();

        $tasks = [];
        $totalActual = 0;
        $totalTarget = 0;

        foreach ($kpi->tasks as $t) {

            $actual = $this->countCompletedTasks($t->task_title, $userId, $start, $end);

            $target = $t->target_progress ?: 0;

            $tasks[] = [
                'title'  => $t->task_title,
                'actual' => $actual,
                'target' => $target,
                'ratio'  => $target > 0 ? min($actual / $target, 1) : 0
            ];

            $totalActual += $actual;
            $totalTarget += $target;
        }

        $overall = $totalTarget > 0 ? round(min($totalActual / $totalTarget, 1) * 100) : 0;

        return response()->json([
            'kpi' => $kpi,
            'tasks' => $tasks,
            'overallProgress' => $overall
        ]);
    }

    /**
     * =====================================================
     *  HELPER: Tính tổng KPI (tổng actual / tổng target)
     * =====================================================
     */
    private function calculateKPIProgress(KPI $kpi, $userId)
    {
        $start = Carbon::parse($kpi->start_date)->toDateString();
        $end   = Carbon::parse($kpi->end_date)->toDateString();

        $totalActual = 0;
        $totalTarget = 0;

        foreach ($kpi->tasks as $task) {

            $actual = $this->countCompletedTasks($task->task_title, $userId, $start, $end);

            $target = $task->target_progress ?: 0;

            $totalActual += $actual;
            $totalTarget += $target;
        }

        return $totalTarget > 0 ? round(min($totalActual / $totalTarget, 1) * 100) : 0;
    }

    /**
     * Helper: Tổng tiến độ task hoàn thành (hỗ trợ cả mô hình pivot & legacy)
     */
    private function countCompletedTasks(string $title, int $userId, string $start, string $end): int
    {
        $normalizedTitle = strtolower($title);

        // Task được giao qua pivot
        $pivotCount = DB::table('task_user')
            ->join('tasks', 'tasks.id', '=', 'task_user.task_id')
            ->where('task_user.user_id', $userId)
            ->where('task_user.status', 'Đã hoàn thành')
            ->whereBetween('tasks.task_date', [$start, $end])
            ->whereRaw('LOWER(tasks.title) = ?', [$normalizedTitle])
            ->count();

        // Task legacy (không có bản ghi pivot)
        $legacyCount = Task::query()
            ->whereRaw('LOWER(title) = ?', [$normalizedTitle])
            ->where('user_id', $userId)
            ->whereBetween('task_date', [$start, $end])
            ->where('status', 'Đã hoàn thành')
            ->whereDoesntHave('users', fn($q) => $q->where('users.id', $userId))
            ->count();

        return $pivotCount + $legacyCount;
    }
}
