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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
        private function authorizeTask(Task $task, bool $allowManager = true): void
        {
            $user = Auth::user();
            if (!$user) {
                abort(403);
            }

            $isOwner = $task->user_id === $user->id || $task->users()->where('users.id', $user->id)->exists();
            $isManager = $allowManager && in_array($user->role, ['Admin', 'Trưởng phòng']);

            if (!$isOwner && !$isManager) {
                abort(403, 'Bạn không có quyền thao tác công việc này');
            }
        }
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

        $currentMonthStart = $today->copy()->startOfMonth();
        $currentMonthEnd = $today->copy()->endOfMonth();

        $taskOverdue = $this->queryForUser($userId)
            ->where('status', '!=', 'Đã hoàn thành')
            ->whereBetween(DB::raw('COALESCE(deadline_at, task_date)'), [$currentMonthStart->toDateString(), $currentMonthEnd->toDateString()])
            ->whereDate(DB::raw('COALESCE(deadline_at, task_date)'), '<', $today)
            ->count();

        $weeklyTasks = $this->queryForUser($userId)
            ->whereBetween('task_date', [
                Carbon::now()->startOfWeek(),
                Carbon::now()->endOfWeek(),
            ])
            ->count();

        $tasksSoon = $this->queryForUser($userId)
            ->where('status', '!=', 'Đã hoàn thành')
            ->whereBetween(
                DB::raw('COALESCE(deadline_at, task_date)'),
                [$today->toDateString(), $today->copy()->addDays(7)->toDateString()]
            )
            ->count();

        return view('dashboard', [
            'taskCount'     => $this->queryForUser($userId)->count(),
            'userName'      => auth()->user()->name,
            'dashboardData' => [
                'taskToday'    => $taskToday,
                'taskOverdue'  => $taskOverdue,
                'weeklyTasks'  => $weeklyTasks,
                'tasksSoon'    => $tasksSoon,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $userId = Auth::id();

        $query = $this->queryForUser($userId)
            ->with(['assignedByUser', 'users', 'files'])
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
            ->orderBy('task_date', 'desc')
            ->orderBy('deadline_at', 'desc')
            ->orderByRaw("FIELD(priority, 'Khẩn cấp', 'Cao', 'Trung bình', 'Thấp')")
            ->get()
            ->map(function ($t) {
                // Mục tiêu ưu tiên lấy từ cột progress (admin nhập khi giao việc)
                $t->task_goal = $t->progress ?? ($t->total_count ?: 1);
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
        $request->validate([
            'attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt',
        ]);

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
            DB::table('task_user')->insert([
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
                DB::table('task_user')->insert([
                    'task_id'   => $task->id,
                    'user_id'   => $uid,
                    'progress'  => $data['progress'] ?? 0,
                    'status'    => $data['status'] ?? 'Chưa hoàn thành',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->syncAttachments($request, $task);

        if ($request->wantsJson()) {
            return response()->json(
                $task->load(['assignedByUser', 'users', 'files'])
            );
        }

        $redirect = $request->redirect_back ?? route('tasks.index');
        return redirect($redirect)->with('success', 'Đã thêm công việc!');
    }

    public function edit(Task $task)
    {
        $this->authorizeTask($task);
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
        $this->authorizeTask($task);
        $request->validate([
            'attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt',
            'remove_attachment_ids.*' => 'integer',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'integer|exists:users,id',
            'assignees_submitted' => 'nullable|boolean',
        ]);

        $this->autoCreateMeta($request);

        $data = $request->all();

        unset($data['user_ids'], $data['assignees_submitted']);

        // deadline mặc định = task_date nếu không nhập
        if (empty($data['deadline_at']) && !empty($data['task_date'])) {
            $data['deadline_at'] = $data['task_date'];
        }

        $task->update($data);

        $assigneesTouched = $request->boolean('assignees_submitted', false);

        if ($assigneesTouched) {
            $this->syncAssignedUsers($task, $request->input('user_ids', []));
        }

        $this->syncAttachments($request, $task);

        if ($request->wantsJson()) {
            return response()->json($task->load(['assignedByUser', 'users', 'files']));
        }

        $redirect = $request->redirect_back ?? route('tasks.index');
        return redirect($redirect)->with('success', 'Đã cập nhật công việc!');
    }

    public function destroy(Task $task)
    {
        $this->authorizeTask($task);
        foreach ($task->files as $file) {
            if ($file->path) {
                Storage::disk('public')->delete($file->path);
            }
        }

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
        $this->authorizeTask($task);
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

    private function syncAttachments(Request $request, Task $task): void
    {
        foreach ((array) $request->file('attachments') as $uploadedFile) {
            if (!$uploadedFile) {
                continue;
            }

            $path = $uploadedFile->store('task-files', 'public');

            $task->files()->create([
                'original_name' => $uploadedFile->getClientOriginalName(),
                'path'          => $path,
                'mime_type'     => $uploadedFile->getClientMimeType(),
                'size'          => $uploadedFile->getSize(),
            ]);
        }

        $removalIds = array_filter((array) $request->input('remove_attachment_ids', []));
        if (empty($removalIds)) {
            return;
        }

        $files = $task->files()->whereIn('id', $removalIds)->get();

        foreach ($files as $file) {
            if ($file->path) {
                Storage::disk('public')->delete($file->path);
            }
            $file->delete();
        }
    }

    public function latestAssignments()
    {
        $userId = auth()->id();

        if (!$userId) {
            return response()->json([], 401);
        }

        $now = Carbon::now();
        $soonThreshold = $now->copy()->addDays(3);

        $baseSelect = [
            'tasks.id',
            'tasks.title',
            'tasks.deadline_at',
            'tasks.task_date',
            'tasks.priority',
            'tasks.status',
            'tasks.supervisor',
            'tasks.assigned_by',
            'task_user.status as my_status',
            'task_user.progress as my_progress',
            'task_user.created_at as assigned_at',
            'task_user.read_at as read_at',
        ];

        $queryForUser = fn() => Task::query()
            ->select($baseSelect)
            ->join('task_user', function ($join) use ($userId) {
                $join->on('task_user.task_id', '=', 'tasks.id')
                    ->where('task_user.user_id', '=', $userId);
            })
            ->with('assignedByUser:id,name,avatar');

        $latestAssigned = $queryForUser()
            ->orderByDesc('assigned_at')
            ->limit(25)
            ->get();

        $deadlineAlerts = $queryForUser()
            ->where(function ($query) use ($now, $soonThreshold) {
                $query
                    ->whereDate(DB::raw('COALESCE(tasks.deadline_at, tasks.task_date)'), '<', $now->toDateString())
                    ->orWhereBetween(DB::raw('COALESCE(tasks.deadline_at, tasks.task_date)'), [
                        $now->toDateString(),
                        $soonThreshold->toDateString(),
                    ]);
            })
            ->where(function ($query) {
                $query->whereNull('task_user.status')
                    ->orWhere('task_user.status', '!=', 'Đã hoàn thành');
            })
            ->orderBy(DB::raw('COALESCE(tasks.deadline_at, tasks.task_date)'))
            ->limit(25)
            ->get();

        $resolveAssignedBy = function ($task) {
            if ($task->assignedByUser) {
                return [
                    'id'     => $task->assignedByUser->id,
                    'name'   => $task->assignedByUser->name,
                    'avatar' => $task->assignedByUser->avatar,
                ];
            }

            return [
                'id'     => null,
                'name'   => $task->supervisor,
                'avatar' => null,
            ];
        };

        $resolveAlert = function ($task) use ($now, $soonThreshold) {
            if (($task->my_status ?? null) === 'Đã hoàn thành') {
                return [null, null];
            }

            $deadlineSource = $task->deadline_at ?? $task->task_date;

            if (!$deadlineSource) {
                return [null, null];
            }

            try {
                $deadline = Carbon::parse($deadlineSource);
            } catch (\Exception $e) {
                return [null, null];
            }

            if ($deadline->lt($now)) {
                return ['overdue', 'Công việc đã quá hạn'];
            }

            if ($deadline->betweenIncluded($now, $soonThreshold)) {
                return ['due_soon', 'Còn dưới 3 ngày đến hạn'];
            }

            return [null, null];
        };

        $normalize = function ($task, $type = 'assignment', $alertLevel = null, $alertMessage = null) use ($resolveAssignedBy) {
            return [
                'id'            => $task->id,
                'title'         => $task->title,
                'deadline_at'   => $task->deadline_at,
                'priority'      => $task->priority,
                'status'        => $task->status,
                'assigned_at'   => $task->assigned_at,
                'my_status'     => $task->my_status,
                'my_progress'   => $task->my_progress,
                'read_at'       => $task->read_at,
                'assigned_by'   => $resolveAssignedBy($task),
                'type'          => $type,
                'alert_level'   => $alertLevel,
                'alert_message' => $alertMessage,
            ];
        };

        $items = collect();

        foreach ($latestAssigned as $task) {
            [$alertLevel, $alertMessage] = $resolveAlert($task);
            $items[$task->id] = $normalize($task, 'assignment', $alertLevel, $alertMessage);
        }

        foreach ($deadlineAlerts as $task) {
            [$alertLevel, $alertMessage] = $resolveAlert($task);

            if (!$alertLevel) {
                continue;
            }

            $items[$task->id] = $normalize($task, 'deadline_alert', $alertLevel, $alertMessage);
        }

        $sorted = $items
            ->values()
            ->sort(function ($a, $b) {
                $aAlert = $a['type'] === 'deadline_alert';
                $bAlert = $b['type'] === 'deadline_alert';

                if ($aAlert !== $bAlert) {
                    return $aAlert ? -1 : 1;
                }

                $aLevel = $a['alert_level'] ?? null;
                $bLevel = $b['alert_level'] ?? null;

                if ($aLevel !== $bLevel) {
                    if ($aLevel === 'overdue') {
                        return -1;
                    }
                    if ($bLevel === 'overdue') {
                        return 1;
                    }
                    if ($aLevel) {
                        return -1;
                    }
                    if ($bLevel) {
                        return 1;
                    }
                }

                $aDeadline = $a['deadline_at'] ?? null;
                $bDeadline = $b['deadline_at'] ?? null;

                if ($aDeadline && $bDeadline && $aDeadline !== $bDeadline) {
                    return $aDeadline < $bDeadline ? -1 : 1;
                }

                return strcmp($b['assigned_at'] ?? '', $a['assigned_at'] ?? '');
            })
            ->values()
            ->take(30);

        return response()->json($sorted);
    }

    public function markAssignmentAsRead(Task $task)
    {
        $userId = auth()->id();

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $pivot = $task->users()->where('user_id', $userId)->first();

        if (!$pivot) {
            return response()->json(['message' => 'Bạn không được giao task này'], 403);
        }

        $task->users()->updateExistingPivot($userId, [
            'read_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function markAllAssignmentsAsRead()
    {
        $userId = auth()->id();

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $updated = DB::table('task_user')
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->update([
                'read_at'    => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'updated' => $updated,
        ]);
    }

    private function syncAssignedUsers(Task $task, array $userIds): void
    {
        $normalized = collect($userIds)
            ->filter(fn($id) => !empty($id))
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (empty($normalized)) {
            $normalized = [Auth::id()];
        }

        $existing = $task->users->mapWithKeys(function ($user) {
            return [
                $user->id => [
                    'status' => $user->pivot->status ?? 'Chưa hoàn thành',
                    'progress' => $user->pivot->progress ?? 0,
                ],
            ];
        });

        $payload = [];
        foreach ($normalized as $userId) {
            $payload[$userId] = $existing[$userId] ?? [
                'status' => 'Chưa hoàn thành',
                'progress' => 0,
            ];
        }

        $task->users()->sync($payload);
        $task->load('users');
    }
}
