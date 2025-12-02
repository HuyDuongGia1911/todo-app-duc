<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::with(['users:id,name', 'assignedByUser:id,name'])
            ->orderBy('task_date', 'desc');

        if ($request->wantsJson() || $request->expectsJson()) {
            return $query->get()->append('calculated_progress');
        }

        return view('management.tasks');
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $userIds = $this->validatedUserIds($request);

        if (empty($userIds) && $request->filled('user_id')) {
            $userIds = [(int) $request->input('user_id')];
        }

        if (empty($userIds)) {
            return response()->json(['message' => 'Vui lòng chọn ít nhất 1 người nhận'], 422);
        }

        $data['assigned_by'] = $request->filled('assigned_by')
            ? (int) $request->input('assigned_by')
            : auth()->id();
        $data['user_id'] = $userIds[0];

        $task = Task::create($data);

        $task->users()->sync($userIds);

        return response()->json(
            $task->load(['users:id,name', 'assignedByUser:id,name'])
                ->append('calculated_progress')
        );
    }

    public function update(Request $request, Task $task)
    {
        // Hỗ trợ method spoofing (_method=PUT)
        if ($request->input('_method') === 'PUT') {
            $data = $request->only(['status', 'priority', 'progress']);
            $task->update($data);

            // Nếu FE gửi users mới → cập nhật pivot
            if ($request->filled('user_ids')) {
                $task->users()->sync($request->user_ids);
            }

            return response()->json(
                $task->load(['users:id,name', 'assignedByUser:id,name'])
                    ->append('calculated_progress')
            );
        }

        $data = $this->validateData($request, $task->id);
        $userIds = $this->validatedUserIds($request);

        if ($request->has('user_ids')) {
            if (empty($userIds)) {
                $task->users()->sync([]);
                $data['user_id'] = null;
            } else {
                $task->users()->sync($userIds);
                $data['user_id'] = $userIds[0];
            }
        } elseif ($request->filled('user_id')) {
            $data['user_id'] = (int) $request->input('user_id');
        }

        if ($request->filled('assigned_by')) {
            $data['assigned_by'] = (int) $request->input('assigned_by');
        }

        $task->update($data);

        return response()->json(
            $task->load(['users:id,name', 'assignedByUser:id,name'])
                ->append('calculated_progress')
        );
    }

    public function destroy(Task $task)
    {
        $task->delete();
        return response()->json(['success' => true]);
    }

    private function validateData(Request $request, $id = null): array
    {
        return $request->validate([
            'title'     => 'required|string|max:255',
            'task_date' => 'required|date',
            'deadline_at' => 'nullable|date',
            'priority'  => 'nullable|string|in:Khẩn cấp,Cao,Trung bình,Thấp',
            'status'    => 'required|string|in:Chưa hoàn thành,Đã hoàn thành',
            'progress'  => 'nullable|numeric|min:0|max:100',
            'shift'     => 'nullable|string|max:255',
            'type'      => 'nullable|string|max:255',
            'supervisor' => 'nullable|string|max:255',
            'detail'    => 'nullable|string',
            'file_link' => 'nullable|string|max:1000',
            'user_id'   => 'nullable|exists:users,id',
            'assigned_by' => 'nullable|exists:users,id',
        ]);
    }

    private function validatedUserIds(Request $request): array
    {
        if (!$request->has('user_ids')) {
            return [];
        }

        $request->validate([
            'user_ids' => 'array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        return collect($request->input('user_ids', []))
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();
    }
}
