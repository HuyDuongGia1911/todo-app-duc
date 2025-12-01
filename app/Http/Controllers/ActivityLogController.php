<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $userId = Auth::id();

        $perPage = max(5, min((int)$request->get('per_page', 15), 100));
        $query = ActivityLog::where('user_id', $userId)
            ->when($request->filled('month'), function ($q) use ($request) {
                $month = Carbon::createFromFormat('Y-m', $request->get('month'));
                $q->whereBetween('logged_at', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()]);
            })
            ->when($request->filled('from'), fn($q) => $q->whereDate('logged_at', '>=', $request->get('from')))
            ->when($request->filled('to'), fn($q) => $q->whereDate('logged_at', '<=', $request->get('to')))
            ->when($request->filled('keyword'), function ($q) use ($request) {
                $kw = $request->get('keyword');
                $q->where(function ($inner) use ($kw) {
                    $inner->where('title', 'like', "%{$kw}%")
                        ->orWhere('content', 'like', "%{$kw}%");
                });
            })
            ->when($request->filled('tag'), function ($q) use ($request) {
                $q->whereJsonContains('tags', $request->get('tag'));
            })
            ->orderByDesc('logged_at')
            ->orderByDesc('id');

        $paginator = $query->paginate($perPage);

        $items = collect($paginator->items())->map(fn($log) => $this->transformLog($log))->all();

        return response()->json([
            'data' => $items,
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);
        $data['user_id'] = Auth::id();
        $data['logged_at'] = $data['logged_at'] ?? now();
        $this->assertTaskOwnership($data['task_id'] ?? null);

        $attachments = $this->handleAttachments($request);
        if (!empty($attachments)) {
            $data['attachments'] = $attachments;
        }

        $log = ActivityLog::create($data);

        return response()->json($this->transformLog($log), 201);
    }

    public function update(Request $request, ActivityLog $activityLog)
    {
        $this->authorizeLog($activityLog);

        $data = $this->validatePayload($request, false);
        if (array_key_exists('task_id', $data)) {
            $this->assertTaskOwnership($data['task_id']);
        }
        if (array_key_exists('logged_at', $data) && blank($data['logged_at'])) {
            $data['logged_at'] = $activityLog->logged_at;
        }

        if ($request->boolean('remove_existing_files')) {
            $this->purgeAttachments($activityLog->attachments ?? []);
            $activityLog->attachments = [];
        }

        $newAttachments = $this->handleAttachments($request);
        if (!empty($newAttachments)) {
            $data['attachments'] = array_merge($activityLog->attachments ?? [], $newAttachments);
        }

        $activityLog->update($data);

        return response()->json($this->transformLog($activityLog->refresh()));
    }

    public function destroy(ActivityLog $activityLog)
    {
        $this->authorizeLog($activityLog);
        $this->purgeAttachments($activityLog->attachments ?? []);
        $activityLog->delete();

        return response()->json(['success' => true]);
    }

    private function validatePayload(Request $request, bool $isCreate = true): array
    {
        $rules = [
            'title' => ($isCreate ? 'required' : 'sometimes') . '|string|max:150',
            'content' => 'nullable|string',
            'task_id' => 'nullable|exists:tasks,id',
            'logged_at' => 'nullable|date',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:30',
            'attachments.*' => 'file|max:10240',
        ];

        return $request->validate($rules);
    }

    private function handleAttachments(Request $request): array
    {
        if (!$request->hasFile('attachments')) {
            return [];
        }

        $files = [];
        $filesInput = $request->file('attachments');
        $filesInput = is_array($filesInput) ? $filesInput : [$filesInput];

        foreach ($filesInput as $file) {
            if (empty($file)) {
                continue;
            }
            $path = $file->store('activity-logs', 'public');
            $files[] = [
                'name' => $file->getClientOriginalName(),
                'path' => $path,
                'url' => Storage::url($path),
                'size' => $file->getSize(),
                'mime' => $file->getClientMimeType(),
            ];
        }

        return $files;
    }

    private function purgeAttachments(array $attachments): void
    {
        foreach ($attachments as $attachment) {
            if (!empty($attachment['path']) && Storage::disk('public')->exists($attachment['path'])) {
                Storage::disk('public')->delete($attachment['path']);
            }
        }
    }

    private function authorizeLog(ActivityLog $activityLog): void
    {
        $user = Auth::user();
        $isManager = in_array($user?->role, ['Admin', 'Trưởng phòng']);
        if ($activityLog->user_id !== Auth::id() && !$isManager) {
            abort(403);
        }
    }

    private function assertTaskOwnership(?int $taskId): void
    {
        if (!$taskId) {
            return;
        }

        $user = Auth::user();
        if (!$user) {
            abort(403);
        }

        if (in_array($user->role, ['Admin', 'Trưởng phòng'])) {
            return;
        }

        $hasAccess = Task::where('id', $taskId)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereHas('users', fn($sub) => $sub->where('users.id', $user->id));
            })
            ->exists();

        if (!$hasAccess) {
            abort(422, 'Không thể liên kết với công việc không thuộc quyền của bạn.');
        }
    }

    private function transformLog(ActivityLog $log): array
    {
        return [
            'id' => $log->id,
            'title' => $log->title,
            'content' => $log->content,
            'tags' => $log->tags ?? [],
            'task_id' => $log->task_id,
            'attachments' => array_map(function ($file) {
                $file['url'] = $file['url'] ?? (!empty($file['path']) ? Storage::url($file['path']) : null);
                return $file;
            }, $log->attachments ?? []),
            'synced_summary_id' => $log->synced_summary_id,
            'logged_at' => optional($log->logged_at)->toIso8601String(),
            'created_at' => optional($log->created_at)->toIso8601String(),
        ];
    }
}
