<?php

namespace App\Http\Controllers;

use App\Models\KPI;
use App\Models\Task;
use App\Models\TaskTitle;
use App\Services\MonthlyKpiAggregator;
use Carbon\Carbon;
use Illuminate\Http\Request;

class KPIController extends Controller
{
    /** @var MonthlyKpiAggregator */
    protected $aggregator;

    public function __construct(MonthlyKpiAggregator $aggregator)
    {
        $this->aggregator = $aggregator;
    }

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

        foreach ($kpis as $kpi) {
            $this->aggregator->recalculate($kpi);
            $kpi->calculated_progress = $kpi->percent;
            $kpi->calculated_target = $kpi->target_progress;
            $kpi->calculated_actual = $kpi->actual_progress;
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
            'completed_units'   => 'array',
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
                'target_progress' => $request->target_progresses[$i] ?? 0,
                'completed_unit' => $request->completed_units[$i] ?? 0,
            ]);
        }

        $this->aggregator->recalculate($kpi);

        return redirect()->route('kpis.index')->with('success', 'Đã tạo KPI!');
    }

    /**
     * ======================
     *  SHOW DETAIL
     * ======================
     */
    public function show(KPI $kpi)
    {
        $this->aggregator->recalculate($kpi);
        $tasks = $this->aggregator->breakdown($kpi);
        $overallProgress = $kpi->percent;

        return view('kpis.show', compact('kpi', 'tasks', 'overallProgress'));
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
            'completed_units'   => 'array',
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
                'target_progress' => $request->target_progresses[$i] ?? 0,
                'completed_unit' => $request->completed_units[$i] ?? 0,
            ]);
        }

        $this->aggregator->recalculate($kpi);

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
        $this->aggregator->recalculate($kpi);
        $tasks = $this->aggregator->breakdown($kpi);

        return response()->json([
            'kpi' => $kpi,
            'tasks' => $tasks,
            'overallProgress' => $kpi->percent,
        ]);
    }

    public function monthlyTasks(Request $request)
    {
        $data = $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $month = Carbon::createFromFormat('Y-m', $data['month']);
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();
        $userId = auth()->id();

        $tasks = Task::query()
            ->with(['users' => fn($query) => $query->where('users.id', $userId)])
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('task_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhereBetween('deadline_at', [$start->toDateString(), $end->toDateString()]);
            })
            ->where(function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->orWhereHas('users', fn($sub) => $sub->where('users.id', $userId));
            })
            ->orderBy('task_date')
            ->get()
            ->map(function (Task $task) use ($userId) {
                $stats = $this->aggregator->taskCompletionStats($task, $userId);

                return [
                    'id' => $task->id,
                    'title' => $task->title ?? '(Không tên)',
                    'priority' => $task->priority,
                    'status' => $task->status,
                    'task_date' => $task->task_date,
                    'goal_units' => $stats['goal_units'],
                    'actual_units' => $stats['actual_units'],
                    'completion_ratio' => $stats['completion_ratio'],
                    'completed' => $stats['completed'],
                ];
            });

        return response()->json(['tasks' => $tasks]);
    }
}
