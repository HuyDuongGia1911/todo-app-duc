<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Shift;
use App\Models\TaskType;
use App\Models\TaskTitle;
use App\Models\Supervisor;
use App\Models\Status;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Exports\TasksExport;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;
use App\Models\Kpi;
class TaskController extends Controller
{
  public function dashboard()
{
    $today = Carbon::today(); //lấy ngày hôm nay
    $userId = auth()->id(); //lấy userid hôm nay qua lavarel

    $taskToday = Task::where('user_id', $userId) 
        ->whereDate('task_date', $today)
        ->count(); //đếm số task userid

   $taskOverdue = Task::where('user_id', $userId)
    ->where('deadline_at', '<', $today)
    ->where('status', '!=', 'Đã hoàn thành')
    ->count(); //đếm số task quá hạn


    $weeklyTasks = Task::where('user_id', $userId) 
        ->whereBetween('task_date', [
            Carbon::now()->startOfWeek(),
            Carbon::now()->endOfWeek()
        ]) //đếm số task tuần này
        ->count();

    $kpisSoon = Kpi::where('user_id', $userId) //  lọc theo KPI của người dùng nếu có
        ->whereDate('end_date', '<=', $today->copy()->addDays(3))
        ->where('status', '!=', 'Đã hoàn thành')
        ->count();

    return view('dashboard', [
        'taskCount' => Task::where('user_id', $userId)->count(), // 
        'userName' => auth()->user()->name,
        'dashboardData' => [
            'taskToday' => $taskToday,
            'taskOverdue' => $taskOverdue,
            'weeklyTasks' => $weeklyTasks,
            'kpisSoon' => $kpisSoon,
        ]
    ]);
}

   public function index(Request $request)
{
    $query = Task::query()
        ->where('user_id', auth()->id()); //lấy task của userid hiện tại

    if ($request->filled('start_date')) {
        $query->whereDate('task_date', '>=', $request->start_date);//lọc bd
    }
    if ($request->filled('end_date')) {
        $query->whereDate('task_date', '<=', $request->end_date);//lọc kt
    }

    $tasks = $query
        ->orderByRaw("FIELD(priority, 'Khẩn cấp', 'Cao', 'Trung bình', 'Thấp')") // sap xep mac dinh
        ->orderBy('task_date', 'desc') //theo ngay lam viec neu giong do uu tien
        ->get();

    return view('tasks.index', compact('tasks')); //trả về task index với tasks
}
   // app/Http/Controllers/TaskController.php
public function checkExist(Request $request) //kiểm tra trùng
{
    $exists = Task::where('title', $request->title) //tên
                  ->where('task_date', $request->task_date) //ngày
                  ->exists(); 

    return response()->json(['exists' => $exists]);
}


    public function create()
    {
        return view('tasks.create', [
            'shifts' => Shift::all(),
            'types' => TaskType::all(),
            'titles' => TaskTitle::all(),
            'supervisors' => Supervisor::all(),
            'statuses' => Status::all(),
        ]);
    }

    public function store(Request $request)
    {
        $this->autoCreateMeta($request);

        $data = $request->all();
        $data['user_id'] = auth()->id();
        // Nếu deadline_at rỗng → mặc định bằng task_date
if (empty($data['deadline_at'])) {
    $data['deadline_at'] = $data['task_date'];
}
// Nếu priority rỗng → mặc định là 'Thấp'
    if (empty($data['priority'])) {
        $data['priority'] = 'Thấp';
    }

       $task = Task::create($data);

   
    if ($request->wantsJson()) {
        return response()->json($task); //
    }
        $redirect = $request->redirect_back ?? route('tasks.index');
        return redirect($redirect)->with('success', 'Đã thêm công việc!');
    }
    
    public function edit(Task $task)
    {
        return view('tasks.edit', [
            'task' => $task,
            'shifts' => Shift::all(),
            'types' => TaskType::all(),
            'titles' => TaskTitle::all(),
            'supervisors' => Supervisor::all(),
            'statuses' => Status::all(),
        ]);
    }

    // public function update(Request $request, Task $task)
    // {
    //     $this->autoCreateMeta($request);

    //     $task->update($request->all());

    //     $redirect = $request->redirect_back ?? route('tasks.index');
    //     return redirect($redirect)->with('success', 'Đã cập nhật công việc!');
    // }
    public function update(Request $request, Task $task)
{
    $this->autoCreateMeta($request);

    $data = $request->all();

    // ⚠️ Nếu không có deadline_at thì gán mặc định bằng task_date
    if (empty($data['deadline_at']) && !empty($data['task_date'])) {
        $data['deadline_at'] = $data['task_date'];
    }

    $task->update($data);

    if ($request->wantsJson()) {
        return response()->json($task); // ✅ trả JSON về React
    }

    $redirect = $request->redirect_back ?? route('tasks.index');
    return redirect($redirect)->with('success', 'Đã cập nhật công việc!');
}

    public function destroy(Task $task)
    {
        $task->delete();
        return redirect()->route('tasks.index')->with('success', 'Đã xoá!');
    }
public function export(Request $request)
{
    $type = $request->query('type', 'all');
    $query = Task::query();

    if ($type === 'filtered') {
        // Lọc theo trạng thái tab
        if ($request->filled('status_tab')) {
            $today = now()->toDateString();

            switch ($request->status_tab) {
                case 'done':
                    $query->where('status', 'Đã hoàn thành');
                    break;

                case 'pending':
                    // Chưa hoàn thành và chưa quá hạn (ngày >= hôm nay)
                    $query->where('status', 'Chưa hoàn thành')
                          ->whereDate('task_date', '>=', $today);
                    break;

                case 'overdue':
                    // Chưa hoàn thành nhưng đã quá hạn (ngày < hôm nay)
                    $query->where('status', 'Chưa hoàn thành')
                          ->whereDate('task_date', '<', $today);
                    break;
            }
        }

        // Lọc theo độ ưu tiên
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        // Lọc ngày công việc
        if ($request->filled('task_date_start')) {
            $query->whereDate('task_date', '>=', $request->task_date_start);
        }
        if ($request->filled('task_date_end')) {
            $query->whereDate('task_date', '<=', $request->task_date_end);
        }

        // Lọc ngày tạo
        if ($request->filled('created_start')) {
            $query->whereDate('created_at', '>=', $request->created_start);
        }
        if ($request->filled('created_end')) {
            $query->whereDate('created_at', '<=', $request->created_end);
        }
    }

    return Excel::download(new TasksExport($query), 'tasks_' . $type . '.xlsx');
}
public function updateStatus(Request $request, Task $task)
{
    $validated = $request->validate([
        'status' => 'required|in:Đã hoàn thành,Chưa hoàn thành',
    ]);

    $task->status = $validated['status'];

    if (!$task->save()) {
        return response()->json(['error' => 'Cập nhật thất bại'], 500);
    }

    return response()->json(['success' => true]);
}

    private function autoCreateMeta($request)
    {
        if (!empty($request->shift) && !Shift::where('shift_name', $request->shift)->exists()) {
            Shift::create(['shift_name' => $request->shift]);
        }
        if (!empty($request->type) && !TaskType::where('type_name', $request->type)->exists()) {
            TaskType::create(['type_name' => $request->type]);
        }
        if (!empty($request->title) && !TaskTitle::where('title_name', $request->title)->exists()) {
            TaskTitle::create(['title_name' => $request->title]);
        }
       if (!empty($request->supervisor)) {
    // Nếu tên đã tồn tại trong bảng users thì KHÔNG tạo supervisor mới
    $isUser = \App\Models\User::where('name', $request->supervisor)->exists();

    if (!$isUser && !Supervisor::where('supervisor_name', $request->supervisor)->exists()) {
        Supervisor::create(['supervisor_name' => $request->supervisor]);
    }
}

        if (!empty($request->status) && !Status::where('status_name', $request->status)->exists()) {
            Status::create(['status_name' => $request->status]);
        }
    }
}
