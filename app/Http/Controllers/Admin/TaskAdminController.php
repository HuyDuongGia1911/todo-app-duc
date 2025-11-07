<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskAdminController extends Controller
{
  public function index(Request $request)
{
    $query = Task::with('user:id,name',   'assignedByUser:id,name')   
                 ->orderBy('task_date', 'desc');
                 

    if ($request->wantsJson() || $request->expectsJson()) {
        return $query->get();
    }

    return view('management.tasks');
}


   public function store(Request $request)
{
    $data = $this->validateData($request);

    // Tùy business: user nhận việc. Tạm giữ như cũ nếu bạn chưa có UI chọn user.
    $data['user_id'] = auth()->id();

    // Người giao việc = admin hiện tại
    $data['assigned_by'] = auth()->id();

    $task = Task::create($data);

    // Trả JSON có đủ quan hệ để FE hiển thị ngay
    $task->load('user:id,name', 'assignedByUser:id,name');

    return response()->json($task, 201);
}

    public function update(Request $request, Task $task)
{
    $data = $this->validateData($request, $task->id);

    $task->update($data);
    $task->load('user:id,name', 'assignedByUser:id,name');

    return response()->json($task);
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
           'priority'  => 'required|string|in:Khẩn cấp,Cao,Trung bình,Thấp',
            'status'    => 'required|string|in:Chưa hoàn thành,Đã hoàn thành',
            'progress'  => 'nullable|integer|min:0|max:100',
            // 'user_id' => 'required|exists:users,id' // nếu cho chọn người nhận task
        ]);
    }
    
}
