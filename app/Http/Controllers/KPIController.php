<?php
namespace App\Http\Controllers;

use App\Models\KPI;
use App\Models\KPITask;
use App\Models\Task;
use App\Models\TaskTitle;
use Illuminate\Http\Request;
use App\Exports\KPIsExport;
use Maatwebsite\Excel\Facades\Excel;
class KPIController extends Controller
{
   public function index(Request $request)
{
    $query = KPI::where('user_id', auth()->id())->with('tasks');

    if ($request->filled('month')) {
        $m = \Carbon\Carbon::createFromFormat('Y-m', $request->input('month'));
        $start = $m->copy()->startOfMonth()->toDateString();
        $end   = $m->copy()->endOfMonth()->toDateString();
        $query->whereDate('start_date', '>=', $start)
              ->whereDate('end_date', '<=', $end);
    }

    $kpis = $query->orderBy('end_date')->get();

    foreach ($kpis as $kpi) {
        $start = min($kpi->start_date, $kpi->end_date);
        $end   = max($kpi->start_date, $kpi->end_date);
        $userId = auth()->id();

        $totalActual = 0;
        $totalTarget = 0;

        foreach ($kpi->tasks as $task) {
            $actual = Task::whereRaw('LOWER(title) = ?', [strtolower($task->task_title)])
                ->whereBetween('task_date', [$start, $end])
                ->where('user_id', $userId)
                ->where('status', 'Đã hoàn thành')
                ->sum('progress');

            $totalActual += $actual;
            $totalTarget += $task->target_progress ?? 0;
        }

        $kpi->calculated_progress = $totalTarget > 0
            ? round($totalActual / $totalTarget * 100)
            : 0;
    }

    // Nếu gọi từ React với ?json=1 → trả JSON
    if ($request->boolean('json')) {
        return response()->json([
            'kpis' => $kpis,
            'stats' => [
                'total' => $kpis->count(),
                'done' => $kpis->where('status', 'Đã hoàn thành')->count(),
                'pending' => $kpis->filter(fn($k) =>
                    $k->status !== 'Đã hoàn thành' &&
                    \Carbon\Carbon::parse($k->end_date)->gte(now())
                )->count(),
                'overdue' => $kpis->filter(fn($k) =>
                    $k->status !== 'Đã hoàn thành' &&
                    \Carbon\Carbon::parse($k->end_date)->lt(now())
                )->count(),
            ],
            'filters' => [
                'month' => $request->input('month'),
            ],
        ]);
    }

    // Mặc định vẫn trả view cho Blade
    return view('kpis.index', compact('kpis'));
}




    public function create()
    {
        $tasks = TaskTitle::pluck('title_name');
        return view('kpis.create', compact('tasks'));
    }

   public function store(Request $request)
{
    $data = $request->validate([
        'month'          => 'required|date_format:Y-m',
        'name'           => 'required|string|max:255',
        'task_titles'    => 'array',
        'task_titles.*'  => 'string',
        'target_progresses' => 'array',
        'note'           => 'nullable|string',
    ]);

    $userId = auth()->id();
    $m = \Carbon\Carbon::createFromFormat('Y-m', $data['month']);
    $start = $m->copy()->startOfMonth()->toDateString();
    $end   = $m->copy()->endOfMonth()->toDateString();

    // Check KPI đã tồn tại trong cùng tháng (per user)
    $exists = KPI::where('user_id', $userId)
        ->where(function ($q) use ($start, $end) {
            // vì mình lưu đúng nguyên tháng, check đơn giản:
            $q->whereDate('start_date', $start)->whereDate('end_date', $end);
        })
        ->exists();

    if ($exists) {
        // Nếu dùng Blade form:
        return back()->withErrors(['month' => 'Tháng này đã có KPI!'])->withInput();
        // Nếu sau này dùng fetch JSON: return response()->json(['message' => 'Tháng này đã có KPI!'], 422);
    }

    $taskNames = implode(',', $request->task_titles ?? []);

    $kpi = KPI::create([
        'user_id'    => $userId,
        'start_date' => $start,
        'end_date'   => $end,
        'name'       => $request->name,
        'task_names' => $taskNames,
        'note'       => $request->note,
    ]);

    foreach ($request->task_titles ?? [] as $index => $title) {
        if (!TaskTitle::where('title_name', $title)->exists()) {
            TaskTitle::create(['title_name' => $title]);
        }

        $kpi->tasks()->create([
            'task_title' => $title,
            'target_progress' => $request->target_progresses[$index] ?? 0,
        ]);
    }

    return redirect()->route('kpis.index')->with('success', 'Đã tạo KPI!');
}


    public function show(KPI $kpi)
{
    $start = min($kpi->start_date, $kpi->end_date);
    $end = max($kpi->start_date, $kpi->end_date);
    $userId = auth()->id();

    $tasksData = [];
    $totalActual = 0;
    $totalTarget = 0;

    foreach ($kpi->tasks as $kpiTask) {
        $actualProgress = Task::where('title', $kpiTask->task_title)
            ->whereBetween('task_date', [$start, $end])
            ->where('user_id', $userId)
            ->sum('progress');

        $target = $kpiTask->target_progress ?: 0;

        $tasksData[] = [
            'title' => $kpiTask->task_title,
            'actual' => $actualProgress,
            'target' => $target,
        ];

        $totalActual += $actualProgress;
        $totalTarget += $target;
    }

    $overallProgress = $totalTarget > 0 ? round($totalActual / $totalTarget * 100) : 0;

    return view('kpis.show', [
        'kpi' => $kpi,
        'tasks' => $tasksData,
        'overallProgress' => $overallProgress,
    ]);
}


    public function edit(KPI $kpi)
    {
        $tasks = TaskTitle::pluck('title_name');
        $selectedTasks = $kpi->tasks->pluck('task_title')->toArray();

        return view('kpis.edit', compact('kpi', 'tasks', 'selectedTasks'));
    }

   public function update(Request $request, KPI $kpi)
{
    $data = $request->validate([
        'month'             => 'required|date_format:Y-m',
        'name'              => 'required|string|max:255',
        'task_titles'       => 'array',
        'task_titles.*'     => 'string',
        'target_progresses' => 'array',
        'note'              => 'nullable|string',
    ]);

    $userId = auth()->id();
    $m = \Carbon\Carbon::createFromFormat('Y-m', $data['month']);
    $start = $m->copy()->startOfMonth()->toDateString();
    $end   = $m->copy()->endOfMonth()->toDateString();

    $exists = KPI::where('user_id', $userId)
        ->whereDate('start_date', $start)
        ->whereDate('end_date', $end)
        ->where('id', '!=', $kpi->id)
        ->exists();

    if ($exists) {
        // React detail modal đang expect JSON
        return response()->json(['message' => 'Tháng này đã có KPI!'], 422);
    }

    $taskNames = implode(',', $request->task_titles ?? []);

    $kpi->update([
        'start_date' => $start,
        'end_date'   => $end,
        'name'       => $request->name,
        'task_names' => $taskNames,
        'note'       => $request->note,
    ]);

    $kpi->tasks()->delete();

    foreach ($request->task_titles ?? [] as $index => $title) {
        if (!TaskTitle::where('title_name', $title)->exists()) {
            TaskTitle::create(['title_name' => $title]);
        }

        $kpi->tasks()->create([
            'task_title' => $title,
            'target_progress' => $request->target_progresses[$index] ?? 0,
        ]);
    }

    return redirect()->route('kpis.index')->with('success', 'Đã cập nhật KPI!');
}

    public function destroy(KPI $kpi)
    {
        $kpi->delete();
         return response()->json(['message' => 'Deleted successfully']);
    }
    public function updateStatus(Request $request, KPI $kpi)
{
    $validated = $request->validate([
        'status' => 'required|string|in:Chưa hoàn thành,Đã hoàn thành'
    ]);

    $kpi->status = $validated['status'];
    $kpi->save();

    return response()->json(['success' => true]);
}


public function showJson(KPI $kpi)
{
    $start = min($kpi->start_date, $kpi->end_date);
    $end = max($kpi->start_date, $kpi->end_date);
    $userId = auth()->id();

    $tasksData = [];
    $totalActual = 0;
    $totalTarget = 0;

    foreach ($kpi->tasks as $kpiTask) {
        $actualProgress = Task::whereRaw('LOWER(title) = ?', [strtolower($kpiTask->task_title)])
            ->whereBetween('task_date', [$start, $end])
            ->where('user_id', $userId)
            ->where('status', 'Đã hoàn thành')
            ->sum('progress');

        $target = $kpiTask->target_progress ?? 0;

        $tasksData[] = [
            'title' => $kpiTask->task_title,
            'actual' => $actualProgress,
            'target' => $target,
        ];

        $totalActual += $actualProgress;
        $totalTarget += $target;
    }

    return response()->json([
        'kpi' => $kpi,
        'tasks' => $tasksData,
        'overallProgress' => $totalTarget > 0 ? round($totalActual / $totalTarget * 100) : 0,
    ]);
}


  
}
