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

        $data['assigned_by'] = auth()->id();
        $data['user_id'] = $data['user_id'] ?? auth()->id();

        $task = Task::create($data);

        // Nếu có users[] gửi lên → lưu vào bảng pivot
        if ($request->filled('user_ids')) {
            $task->users()->sync($request->user_ids);
        }

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
        $task->update($data);
        if ($request->filled('user_ids')) {
            $task->users()->sync($request->user_ids);
        }

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
        ]);
    }
}
