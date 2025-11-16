<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AssignTaskController extends Controller
{
    public function index(Request $request)
    {
        $q = Task::query()->with([
            'user:id,name,email',          // legacy 1-1
            'users:id,name,email',         // many-to-many mới
            'assignedByUser:id,name,email'
        ]);

        // lọc theo người nhận (ưu tiên many-to-many, vẫn fallback legacy)
        if ($request->filled('user_id')) {
            $uid = (int) $request->user_id;
            $q->where(function ($sub) use ($uid) {
                $sub->whereHas('users', fn($qq) => $qq->where('users.id', $uid))
                    ->orWhere('user_id', $uid);
            });
        }
        // 🔹 Lọc theo NGƯỜI GIAO (từ bộ lọc mới ở FE)
        if ($request->filled('assigned_by')) {
            $q->where('assigned_by', (int) $request->assigned_by);
        }

        // tôi là người giao
        if ($request->boolean('mine')) {
            $q->where('assigned_by', Auth::id());
        }

        if ($request->filled('start')) $q->whereDate('task_date', '>=', $request->start);
        if ($request->filled('end'))   $q->whereDate('task_date', '<=', $request->end);

        return response()->json($q->orderBy('task_date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request, true);
        $assignees = $this->normalizeAssignees($request);
        if (empty($assignees)) {
            return response()->json(['message' => 'Vui lòng chọn ít nhất 1 người nhận'], 422);
        }

        $task = DB::transaction(function () use ($data, $assignees, $request) {
            $payload = collect($data)->except(['user_ids', 'user_id'])->toArray();

            // legacy
            if ($request->filled('user_id')) {
                $payload['user_id'] = (int) $request->user_id;
            }

            $payload['assigned_by'] = Auth::id();

            // ✅ Nếu FE không gửi progress, mặc định mục tiêu là 1
            if (empty($payload['progress'])) {
                $payload['progress'] = 1; // mục tiêu
            }

            $task = Task::create($payload);

            // ✅ Gán pivot cho từng người nhận
            $syncData = [];
            foreach ($request->user_ids as $uid) {
                $syncData[$uid] = [
                    'status'   => 'Chưa hoàn thành',
                    'progress' => 0, // tiến độ cá nhân ban đầu
                ];
            }
            $task->users()->sync($syncData);

            return $task;
        });

        return response()->json(
            $task->load(['user:id,name,email', 'users:id,name,email', 'assignedByUser:id,name,email']),
            201
        );
    }

    public function update(Request $request, Task $task)
    {
        $data = $this->validateData($request, false);
        $assignees = $this->normalizeAssignees($request); // null = không động pivot

        DB::transaction(function () use ($task, $data, $assignees, $request) {
            $payload = collect($data)->except(['user_ids', 'user_id'])->toArray();
            if ($request->has('user_id')) {
                $payload['user_id'] = $request->input('user_id') ?: null; // legacy
            }
            $task->update($payload);

            if (!is_null($assignees)) {
                $task->users()->sync($assignees); // [] = bỏ hết người nhận
            }
        });

        return response()->json(
            $task->load(['user:id,name,email', 'users:id,name,email', 'assignedByUser:id,name,email'])
        );
    }

    public function destroy(Task $task)
    {
        DB::transaction(function () use ($task) {
            $task->users()->detach();
            $task->delete();
        });
        return response()->json(['success' => true]);
    }

    private function validateData(Request $request, bool $isCreate): array
    {
        $rules = [
            'task_date'   => ['required', 'date'],
            'shift'       => ['nullable', 'string', 'max:255'],
            'type'        => ['nullable', 'string', 'max:255'],
            'title'       => ['required', 'string', 'max:255'],
            'supervisor'  => ['nullable', 'string', 'max:255'],
            'priority'    => ['nullable', 'in:Khẩn cấp,Cao,Trung bình,Thấp'],
            'progress'    => ['nullable', 'numeric', 'min:0', 'max:100'],
            'detail'      => ['nullable', 'string'],
            'file_link'   => ['nullable', 'string'],
            'deadline_at' => ['nullable', 'date'],
        ];

        $rules['status'] = $isCreate
            ? ['required', 'in:Đã hoàn thành,Chưa hoàn thành']
            : ['sometimes', 'in:Đã hoàn thành,Chưa hoàn thành'];

        // người nhận: mới (nhiều) hoặc cũ (1)
        $rules['user_ids']   = ['required_without:user_id', 'array'];
        $rules['user_ids.*'] = ['integer', 'exists:users,id'];
        $rules['user_id']    = ['nullable', 'exists:users,id'];

        return $request->validate($rules);
    }

    private function normalizeAssignees(Request $request): ?array
    {
        if ($request->filled('user_ids')) {
            return array_values(array_unique(array_map('intval', $request->input('user_ids', []))));
        }
        if ($request->filled('user_id')) {
            return [(int) $request->user_id];
        }
        // store: validate đã đảm bảo có 1 trong 2; update: null = không đụng pivot
        return $request->isMethod('post') ? [] : null;
    }
}
