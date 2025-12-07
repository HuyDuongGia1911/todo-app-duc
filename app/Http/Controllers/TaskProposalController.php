<?php

namespace App\Http\Controllers;

use App\Models\TaskProposal;
use App\Models\User;
use App\Notifications\TaskProposalSubmitted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TaskProposalController extends Controller
{
    public function index(Request $request)
    {
        $userId = Auth::id();
        $perPage = max(5, min((int) $request->get('per_page', 15), 100));

        $query = TaskProposal::with(['reviewer:id,name,avatar', 'recipients:id,name,avatar,role'])
            ->where('user_id', $userId)
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->get('status')))
            ->when($request->filled('type'), fn($q) => $q->where('type', $request->get('type')))
            ->when($request->filled('keyword'), function ($q) use ($request) {
                $keyword = $request->get('keyword');
                $q->where(function ($builder) use ($keyword) {
                    $builder->where('title', 'like', "%{$keyword}%")
                        ->orWhere('description', 'like', "%{$keyword}%");
                });
            })
            ->orderByDesc('created_at');

        $paginator = $query->paginate($perPage);
        $items = collect($paginator->items())
            ->map(fn($proposal) => $this->transformProposal($proposal))
            ->all();

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
        $payload = $this->validatePayload($request);
        $payload['user_id'] = Auth::id();
        $recipientIds = array_unique($payload['recipient_ids']);
        unset($payload['recipient_ids']);

        $attachments = $this->handleAttachments($request);
        if (!empty($attachments)) {
            $payload['attachments'] = $attachments;
        }

        $proposal = DB::transaction(function () use ($payload, $recipientIds) {
            $proposal = TaskProposal::create($payload);
            $proposal->recipients()->sync($recipientIds);

            return $proposal->load(['reviewer:id,name,avatar', 'user:id,name,avatar', 'recipients:id,name,avatar,role']);
        });

        $this->notifyManagers($proposal);

        return response()->json($this->transformProposal($proposal), 201);
    }

    public function show(TaskProposal $taskProposal)
    {
        $this->authorizeAccess($taskProposal);
        return response()->json($this->transformProposal($taskProposal->load(['reviewer', 'recipients:id,name,avatar,role'])));
    }

    public function destroy(TaskProposal $taskProposal)
    {
        $this->ensureOwner($taskProposal);
        if ($taskProposal->status !== 'pending') {
            return response()->json([
                'message' => 'Chỉ có thể xoá đề xuất ở trạng thái chờ duyệt.',
            ], 422);
        }

        $this->purgeAttachments($taskProposal->attachments ?? []);
        $taskProposal->delete();

        return response()->json(['success' => true]);
    }

    public function markAsRead(TaskProposal $taskProposal)
    {
        $this->ensureOwner($taskProposal);
        $taskProposal->update(['user_read_at' => now()]);

        return response()->json([
            'success' => true,
            'user_read_at' => optional($taskProposal->user_read_at)->toIso8601String(),
        ]);
    }

    public function recipients()
    {
        $currentUserId = Auth::id();

        $managersQuery = User::query()
            ->whereIn('role', ['Admin', 'Trưởng phòng'])
            ->orderByRaw("FIELD(role, 'Trưởng phòng', 'Admin')")
            ->orderBy('name')
            ->select(['id', 'name', 'role', 'avatar']);

        if ($currentUserId) {
            $managersQuery->where('id', '!=', $currentUserId);
        }

        $managers = $managersQuery->get();

        return response()->json(['data' => $managers]);
    }

    private function validatePayload(Request $request): array
    {
        $notInRule = Auth::id() ? Rule::notIn([Auth::id()]) : null;

        $rules = [
            'type' => 'required|in:task,kpi',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|string|max:50',
            'expected_deadline' => 'nullable|date',
            'kpi_month' => 'nullable|date_format:Y-m',
            'kpi_target' => 'nullable|integer|min:0|max:100000',
            'attachments.*' => 'file|max:10240',
            'recipient_ids' => 'required|array|min:1',
            'recipient_ids.*' => array_filter([
                'integer',
                'distinct',
                Rule::exists('users', 'id')->where(fn($q) => $q->whereIn('role', ['Admin', 'Trưởng phòng'])),
                $notInRule,
            ]),
        ];

        if ($request->input('type') === 'kpi') {
            $rules['kpi_month'] = 'required|date_format:Y-m';
            $rules['kpi_target'] = 'required|integer|min:1|max:100000';
        }

        return $request->validate($rules);
    }

    private function handleAttachments(Request $request): array
    {
        if (!$request->hasFile('attachments')) {
            return [];
        }

        $files = [];
        $input = $request->file('attachments');
        $input = is_array($input) ? $input : [$input];

        foreach ($input as $file) {
            if (!$file) {
                continue;
            }
            $path = $file->store('task-proposals', 'public');
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
        foreach ($attachments as $file) {
            if (!empty($file['path']) && Storage::disk('public')->exists($file['path'])) {
                Storage::disk('public')->delete($file['path']);
            }
        }
    }

    private function notifyManagers(TaskProposal $proposal): void
    {
        $recipients = $proposal->recipients;

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new TaskProposalSubmitted($proposal));
    }

    private function authorizeAccess(TaskProposal $proposal): void
    {
        $user = Auth::user();
        $isManager = in_array($user?->role, ['Admin', 'Trưởng phòng']);

        if ($proposal->user_id !== ($user?->id) && !$isManager) {
            abort(403);
        }
    }

    private function ensureOwner(TaskProposal $proposal): void
    {
        if ($proposal->user_id !== Auth::id()) {
            abort(403);
        }
    }

    private function transformProposal(TaskProposal $proposal): array
    {
        $attachments = collect($proposal->attachments ?? [])->map(function ($file) {
            if (empty($file['url']) && !empty($file['path'])) {
                $file['url'] = Storage::url($file['path']);
            }
            return $file;
        })->all();

        $recipients = $proposal->recipients->map(fn($recipient) => [
            'id' => $recipient->id,
            'name' => $recipient->name,
            'avatar' => $recipient->avatar,
            'role' => $recipient->role,
        ])->all();

        return [
            'id' => $proposal->id,
            'type' => $proposal->type,
            'title' => $proposal->title,
            'description' => $proposal->description,
            'priority' => $proposal->priority,
            'expected_deadline' => optional($proposal->expected_deadline)->toDateString(),
            'kpi_month' => $proposal->kpi_month,
            'kpi_target' => $proposal->kpi_target,
            'attachments' => $attachments,
            'status' => $proposal->status,
            'review_note' => $proposal->review_note,
            'reviewed_at' => optional($proposal->reviewed_at)->toIso8601String(),
            'reviewed_by' => $proposal->reviewer?->only(['id', 'name', 'avatar']),
            'linked_task_id' => $proposal->linked_task_id,
            'linked_kpi_id' => $proposal->linked_kpi_id,
            'user_read_at' => optional($proposal->user_read_at)->toIso8601String(),
            'created_at' => optional($proposal->created_at)->toIso8601String(),
            'recipients' => $recipients,
        ];
    }
}
