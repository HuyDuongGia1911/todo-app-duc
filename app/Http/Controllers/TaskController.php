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
use DB;

class TaskController extends Controller
{
    /**
     * Helper: Query tất cả task của 1 user — gồm:
     * - Task mô hình cũ: tasks.user_id = $userId
     * - Task mô hình mới: task_user (pivot) có users.id = $userId
     */
    private function queryForUser(int $userId)
    {
        return Task::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId) // dữ liệu cũ
                    ->orWhereHas('users', fn($sub) => $sub->where('users.id', $userId)); // dữ liệu mới (pivot)
            });
    }

    public function dashboard()
    {
        $today  = Carbon::today();
        $userId = Auth::id();

        // Đếm theo cả 2 nguồn (user_id cũ + pivot)
        $taskToday = $this->queryForUser($userId)
            ->whereDate('task_date', $today)
            ->count();

        $taskOverdue = $this->queryForUser($userId)
            ->where('status', '!=', 'Đã hoàn thành')
            ->whereDate('deadline_at', '<', $today)
            ->count();

        $weeklyTasks = $this->queryForUser($userId)
            ->whereBetween('task_date', [
                Carbon::now()->startOfWeek(),
                Carbon::now()->endOfWeek(),
            ])
            ->count();

        $kpisSoon = Kpi::where('user_id', $userId)
            ->whereDate('end_date', '<=', $today->copy()->addDays(3))
            ->where('status', '!=', 'Đã hoàn thành')
            ->count();

        return view('dashboard', [
            'taskCount'     => $this->queryForUser($userId)->count(),
            'userName'      => auth()->user()->name,
            'dashboardData' => [
                'taskToday'    => $taskToday,
                'taskOverdue'  => $taskOverdue,
                'weeklyTasks'  => $weeklyTasks,
                'kpisSoon'     => $kpisSoon,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $userId = Auth::id();

        $query = $this->queryForUser($userId)
            ->with(['assignedByUser', 'users'])
            ->withCount([
                'users as total_count',
                'users as done_count' => function ($q) {
                    $q->where('task_user.status', 'Đã hoàn thành');
                },
            ]);

        if ($request->filled('start_date')) {
            $query->whereDate('task_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('task_date', '<=', $request->end_date);
        }

        $tasks = $query
            ->orderByRaw("FIELD(priority, 'Khẩn cấp', 'Cao', 'Trung bình', 'Thấp')")
            ->orderBy('task_date', 'desc')
            ->get()
            ->map(function ($t) {
                // Mục tiêu tổng = số người được giao
                $t->task_goal = $t->total_count ?: 1;
                return $t;
            });

        if ($request->wantsJson()) {
            return response()->json($tasks);
        }

        return view('tasks.index', compact('tasks'));
    }

    // Kiểm tra trùng tiêu đề trong cùng ngày
    public function checkExist(Request $request)
    {
        $exists = Task::where('title', $request->title)
            ->whereDate('task_date', $request->task_date)
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    public function create()
    {
        return view('tasks.create', [
            'shifts'      => Shift::all(),
            'types'       => TaskType::all(),
            'titles'      => TaskTitle::all(),
            'supervisors' => Supervisor::all(),
            'statuses'    => Status::all(),
        ]);
    }

    public function store(Request $request)
    {
        $this->autoCreateMeta($request);

        $data = $request->all();
        // Form tự thêm của user: mặc định task thuộc về chính user đó (mô hình cũ vẫn OK)
        $data['user_id'] = Auth::id();

        // deadline mặc định = task_date nếu không nhập
        if (empty($data['deadline_at'])) {
            $data['deadline_at'] = $data['task_date'] ?? null;
        }
        // priority mặc định
        if (empty($data['priority'])) {
            $data['priority'] = 'Thấp';
        }

        $task = Task::create($data);
        // ✅ Nếu người giao và người được giao là cùng một người → vẫn thêm vào bảng task_user
        $creatorId = auth()->id();

        // Lấy id người được giao (nếu có users từ request)
        $assignedUserIds = $request->input('user_ids', []);

        // Nếu chưa có user_ids => tức là người tự giao chính mình
        if (empty($assignedUserIds)) {
            \DB::table('task_user')->insert([
                'task_id'   => $task->id,
                'user_id'   => $creatorId, // chính người tạo
                'progress'  => $data['progress'] ?? 0,
                'status'    => $data['status'] ?? 'Chưa hoàn thành',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            // Nếu có danh sách người được giao → gán như bình thường
            foreach ($assignedUserIds as $uid) {
                \DB::table('task_user')->insert([
                    'task_id'   => $task->id,
                    'user_id'   => $uid,
                    'progress'  => $data['progress'] ?? 0,
                    'status'    => $data['status'] ?? 'Chưa hoàn thành',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if ($request->wantsJson()) {
            // có thể load relations để FE dùng luôn
            return response()->json(
                $task->load(['assignedByUser', 'users'])
            );
        }

        $redirect = $request->redirect_back ?? route('tasks.index');
        return redirect($redirect)->with('success', 'Đã thêm công việc!');
    }

    public function edit(Task $task)
    {
        return view('tasks.edit', [
            'task'        => $task,
            'shifts'      => Shift::all(),
            'types'       => TaskType::all(),
            'titles'      => TaskTitle::all(),
            'supervisors' => Supervisor::all(),
            'statuses'    => Status::all(),
        ]);
    }

    public function update(Request $request, Task $task)
    {
        $this->autoCreateMeta($request);

        $data = $request->all();

        // deadline mặc định = task_date nếu không nhập
        if (empty($data['deadline_at']) && !empty($data['task_date'])) {
            $data['deadline_at'] = $data['task_date'];
        }

        $task->update($data);

        if ($request->wantsJson()) {
            return response()->json($task->load(['assignedByUser', 'users']));
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
        $type   = $request->query('type', 'all');
        $userId = Auth::id();

        // Xuất đúng task của user hiện tại (bao gồm pivot)
        $query = $this->queryForUser($userId);

        if ($type === 'filtered') {
            $today = now()->toDateString();

            // theo tab trạng thái
            if ($request->filled('status_tab')) {
                switch ($request->status_tab) {
                    case 'done':
                        $query->where('status', 'Đã hoàn thành');
                        break;

                    case 'pending':
                        $query->where('status', 'Chưa hoàn thành')
                            ->whereDate('task_date', '>=', $today);
                        break;

                    case 'overdue':
                        $query->where('status', 'Chưa hoàn thành')
                            ->whereDate('task_date', '<', $today);
                        break;
                }
            }

            // độ ưu tiên
            if ($request->filled('priority')) {
                $query->where('priority', $request->priority);
            }

            // ngày công việc
            if ($request->filled('task_date_start')) {
                $query->whereDate('task_date', '>=', $request->task_date_start);
            }
            if ($request->filled('task_date_end')) {
                $query->whereDate('task_date', '<=', $request->task_date_end);
            }

            // ngày tạo
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

    /**
     * Tự tạo meta nếu người dùng gõ mới (giữ nguyên như hiện tại).
     */
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
    public function updateUserStatus(Request $request, Task $task)
    {
        $validated = $request->validate([
            'status'   => 'required|in:Đã hoàn thành,Chưa hoàn thành',
            'progress' => 'nullable|numeric|min:0|max:100', // nếu muốn user cập nhật %
        ]);

        $userId = auth()->id();

        // ✅ Đảm bảo user có trong pivot
        if (!$task->users()->where('user_id', $userId)->exists()) {
            $task->users()->attach($userId, [
                'status'   => $validated['status'],
                'progress' => $validated['status'] === 'Đã hoàn thành' ? 100 : 0,
            ]);
        } else {
            $task->users()->updateExistingPivot($userId, [
                'status'   => $validated['status'],
                'progress' => $validated['status'] === 'Đã hoàn thành' ? 100 : 0,
            ]);
        }

        // ✅ Cập nhật trạng thái tổng (chỉ ảnh hưởng task.status, không đụng task.progress)
        $total = $task->users()->count();
        $done  = $task->users()->wherePivot('status', 'Đã hoàn thành')->count();

        $task->status = ($total && $done === $total) ? 'Đã hoàn thành' : 'Chưa hoàn thành';
        $task->save();

        // ✅ Lấy lại tiến độ cá nhân và trạng thái tổng
        $myPivot = $task->users()->where('user_id', $userId)->first()?->pivot;

        $doneCount = $task->users()->wherePivot('status', 'Đã hoàn thành')->count();
        $totalCount = $task->users()->count();

        return response()->json([
            'success'       => true,
            'my_status'     => $validated['status'],
            'my_progress'   => $validated['status'] === 'Đã hoàn thành' ? 100 : 0,
            'task_status'   => $task->status,
            'task_goal'     => $task->progress, // mục tiêu gốc (số lượng)
            'done_count'    => $doneCount,      // số người đã xong
            'total_count'   => $totalCount,     // tổng người nhận
        ]);
    }
}
