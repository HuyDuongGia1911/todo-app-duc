<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AssignTaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::with(['user:id,name,email', 'assignedByUser:id,name,email']);

        // Lọc theo user nhận
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Lọc theo người giao
        if ($request->boolean('mine')) {
            $query->where('assigned_by', Auth::id());
        }

        if ($request->filled('start')) {
            $query->whereDate('task_date', '>=', $request->start);
        }
        if ($request->filled('end')) {
            $query->whereDate('task_date', '<=', $request->end);
        }

        return response()->json($query->orderBy('task_date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        if (!User::where('id', $data['user_id'])->exists()) {
            return response()->json(['message' => 'User không tồn tại'], 422);
        }

        $data['assigned_by'] = Auth::id();

        $task = Task::create($data)->load(['user:id,name,email', 'assignedByUser:id,name,email']);
        return response()->json($task, 201);
    }

    public function update(Request $request, Task $task)
    {
        $data = $this->validateData($request);

        if (!User::where('id', $data['user_id'])->exists()) {
            return response()->json(['message' => 'User không tồn tại'], 422);
        }

        $task->update($data);
        return response()->json($task->load(['user:id,name,email', 'assignedByUser:id,name,email']));
    }

    public function destroy(Task $task)
    {
        $task->delete();
        return response()->json(['success' => true]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'user_id'    => 'required|exists:users,id',
            'task_date'  => 'required|date',
            'shift'      => 'nullable|string|max:255',
            'type'       => 'nullable|string|max:255',
            'title'      => 'required|string|max:255',
            'supervisor' => 'nullable|string|max:255',
            'status'     => 'required|in:Đã hoàn thành,Chưa hoàn thành',
            'priority'   => 'nullable|in:Khẩn cấp,Cao,Trung bình,Thấp',
            'progress'   => 'nullable|numeric|min:0|max:100',
            'detail'     => 'nullable|string',
            'file_link'  => 'nullable|string',
        ]);
    }
}
