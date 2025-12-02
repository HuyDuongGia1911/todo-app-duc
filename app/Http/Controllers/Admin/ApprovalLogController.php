<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApprovalLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApprovalLogController extends Controller
{
    public function index(Request $request)
    {
        $this->ensureManager();

        $perPage = max(5, min((int) $request->get('per_page', 15), 100));

        $query = ApprovalLog::query()
            ->when($request->filled('entity_type'), fn($q) => $q->where('entity_type', $request->get('entity_type')))
            ->when($request->filled('action'), fn($q) => $q->where('action', $request->get('action')))
            ->when($request->filled('keyword'), function ($q) use ($request) {
                $kw = $request->get('keyword');
                $q->where(function ($inner) use ($kw) {
                    $inner->where('entity_label', 'like', "%{$kw}%")
                        ->orWhere('actor_name', 'like', "%{$kw}%")
                        ->orWhere('payload', 'like', "%{$kw}%");
                });
            })
            ->when($request->filled('from'), fn($q) => $q->whereDate('created_at', '>=', $request->get('from')))
            ->when($request->filled('to'), fn($q) => $q->whereDate('created_at', '<=', $request->get('to')))
            ->orderByDesc('created_at');

        $paginator = $query->paginate($perPage);
        $items = collect($paginator->items())->map(function (ApprovalLog $log) {
            return [
                'id' => $log->id,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'entity_label' => $log->entity_label,
                'action' => $log->action,
                'actor_id' => $log->actor_id,
                'actor_name' => $log->actor_name,
                'actor_role' => $log->actor_role,
                'payload' => $log->payload,
                'created_at' => optional($log->created_at)->toIso8601String(),
            ];
        })->all();

        return response()->json([
            'data' => $items,
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    private function ensureManager(): void
    {
        $role = Auth::user()?->role;
        if (!in_array($role, ['Admin', 'Trưởng phòng'])) {
            abort(403);
        }
    }
}
