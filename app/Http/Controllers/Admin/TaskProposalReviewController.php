<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TaskProposal;
use App\Notifications\TaskProposalReviewed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Services\ApprovalLogger;

class TaskProposalReviewController extends Controller
{
    public function index(Request $request)
    {
        $this->ensureManager();

        $perPage = max(5, min((int) $request->get('per_page', 20), 100));

        $query = TaskProposal::with(['user:id,name,avatar', 'reviewer:id,name,avatar'])
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->get('status')))
            ->when($request->filled('type'), fn($q) => $q->where('type', $request->get('type')))
            ->when($request->filled('keyword'), function ($q) use ($request) {
                $keyword = $request->get('keyword');
                $q->where(function ($builder) use ($keyword) {
                    $builder->where('title', 'like', "%{$keyword}%")
                        ->orWhere('description', 'like', "%{$keyword}%")
                        ->orWhereHas('user', fn($userQuery) => $userQuery->where('name', 'like', "%{$keyword}%"));
                });
            })
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->orderByDesc('created_at');

        $paginator = $query->paginate($perPage);
        $items = collect($paginator->items())
            ->map(fn($proposal) => $this->transform($proposal))
            ->all();

        $stats = TaskProposal::selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => $items,
            'meta' => [
                'counts' => [
                    'pending' => (int) ($stats['pending'] ?? 0),
                    'approved' => (int) ($stats['approved'] ?? 0),
                    'rejected' => (int) ($stats['rejected'] ?? 0),
                ],
            ],
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function approve(Request $request, TaskProposal $taskProposal)
    {
        return $this->handleDecision($request, $taskProposal, 'approved');
    }

    public function reject(Request $request, TaskProposal $taskProposal)
    {
        return $this->handleDecision($request, $taskProposal, 'rejected');
    }

    private function handleDecision(Request $request, TaskProposal $proposal, string $status)
    {
        $this->ensureManager();

        if ($proposal->status !== 'pending') {
            return response()->json([
                'message' => 'Đề xuất này đã được xử lý trước đó.',
            ], 422);
        }

        $data = $this->validateDecision($request, $proposal, $status);

        DB::transaction(function () use ($proposal, $status, $data) {
            $proposal->status = $status;
            $proposal->reviewed_by = Auth::id();
            $proposal->reviewed_at = now();
            $proposal->review_note = $data['review_note'] ?? null;
            $proposal->linked_task_id = $data['linked_task_id'] ?? null;
            $proposal->linked_kpi_id = $data['linked_kpi_id'] ?? null;
            $proposal->user_read_at = null; // ép nhân viên phải đọc lại quyết định mới
            $proposal->save();

            ApprovalLogger::record(
                'task_proposal',
                $proposal->id,
                $status === 'approved' ? 'proposal_approved' : 'proposal_rejected',
                [
                    'proposal' => [
                        'title' => $proposal->title,
                        'type' => $proposal->type,
                        'user_id' => $proposal->user_id,
                    ],
                    'decision' => [
                        'status' => $status,
                        'note' => $data['review_note'] ?? null,
                        'linked_task_id' => $data['linked_task_id'] ?? null,
                        'linked_kpi_id' => $data['linked_kpi_id'] ?? null,
                    ],
                ],
                $proposal->title
            );
        });

        $proposal->refresh()->load(['user:id,name,email,avatar', 'reviewer:id,name,avatar']);
        Notification::send($proposal->user, new TaskProposalReviewed($proposal));

        return response()->json($this->transform($proposal));
    }

    private function validateDecision(Request $request, TaskProposal $proposal, string $status): array
    {
        $rules = [
            'review_note' => 'nullable|string|max:2000',
            'linked_task_id' => 'nullable|exists:tasks,id',
            'linked_kpi_id' => 'nullable|exists:kpis,id',
        ];

        $validated = $request->validate($rules);

        if ($proposal->type === 'task' && !empty($validated['linked_kpi_id'])) {
            abort(422, 'Không thể liên kết KPI cho đề xuất công việc.');
        }

        if ($proposal->type === 'kpi' && !empty($validated['linked_task_id'])) {
            abort(422, 'Không thể liên kết công việc cho đề xuất KPI.');
        }

        return $validated;
    }

    private function ensureManager(): void
    {
        $role = Auth::user()?->role;
        if (!in_array($role, ['Admin', 'Trưởng phòng'])) {
            abort(403);
        }
    }

    private function transform(TaskProposal $proposal): array
    {
        $attachments = collect($proposal->attachments ?? [])->map(function ($file) {
            if (empty($file['url']) && !empty($file['path'])) {
                $file['url'] = Storage::url($file['path']);
            }
            return $file;
        })->all();

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
            'reviewer' => $proposal->reviewer?->only(['id', 'name', 'avatar']),
            'user' => $proposal->user?->only(['id', 'name', 'avatar']),
            'linked_task_id' => $proposal->linked_task_id,
            'linked_kpi_id' => $proposal->linked_kpi_id,
            'created_at' => optional($proposal->created_at)->toIso8601String(),
        ];
    }
}
