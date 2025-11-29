<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskCommentController extends Controller
{
    public function index(Task $task)
    {
        $this->ensureAuthorized($task);

        $comments = $task->comments()
            ->with('user:id,name,avatar')
            ->oldest()
            ->get();

        return response()->json($comments);
    }

    public function store(Request $request, Task $task)
    {
        $this->ensureAuthorized($task);

        $validated = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $comment = $task->comments()->create([
            'user_id' => Auth::id(),
            'body'    => trim($validated['body']),
        ]);

        $comment->load('user:id,name,avatar');

        return response()->json($comment, 201);
    }

    private function ensureAuthorized(Task $task): void
    {
        $userId = Auth::id();

        $isOwner = ($task->user_id === $userId) || ($task->assigned_by === $userId);
        $isAssignee = $task->users()->where('user_id', $userId)->exists();

        if (!$isOwner && !$isAssignee) {
            abort(403, 'Bạn không thể bình luận ở công việc này.');
        }
    }
}
