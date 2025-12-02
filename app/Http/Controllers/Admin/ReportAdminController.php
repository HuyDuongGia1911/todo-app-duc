<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlySummary;
use Illuminate\Http\Request;
use App\Services\ApprovalLogger;
use Illuminate\Support\Facades\DB;

class ReportAdminController extends Controller
{
    /**
     * GET /management/reports/data
     * Liệt kê tất cả báo cáo (mọi user) + filter + paginate
     *
     * Query params hỗ trợ:
     * - keyword: tìm theo title/content
     * - user_id: lọc theo user
     * - month:   lọc đúng tháng (ví dụ '2025-07' hoặc giá trị bạn đang lưu)
     * - from:    lọc từ tháng (so sánh >=)  // tuỳ kiểu dữ liệu 'month' của bạn
     * - to:      lọc đến tháng (<=)
     * - locked:  '1' = chỉ báo cáo đã chốt, '0' = chỉ chưa chốt
     * - per_page: số dòng mỗi trang (mặc định 20, tối đa 100)
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = max(1, min($perPage, 100));

        $query = MonthlySummary::with('user')
            ->when($request->filled('keyword'), function ($q) use ($request) {
                $kw = $request->keyword;
                $q->where(function ($inner) use ($kw) {
                    $inner->where('title', 'like', "%{$kw}%")
                          ->orWhere('content', 'like', "%{$kw}%");
                });
            })
            ->when($request->filled('user_id'), function ($q) use ($request) {
                $q->where('user_id', $request->integer('user_id'));
            })
            // Tuỳ kiểu cột month của bạn: nếu là string 'YYYY-MM' thì các so sánh dưới hoạt động bình thường theo lexicographical
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->get('month')))
            ->when($request->filled('from'),  fn ($q) => $q->where('month', '>=', $request->get('from')))
            ->when($request->filled('to'),    fn ($q) => $q->where('month', '<=', $request->get('to')))
            ->when($request->filled('locked'), function ($q) use ($request) {
                if ($request->locked === '1') {
                    $q->whereNotNull('locked_at');
                } elseif ($request->locked === '0') {
                    $q->whereNull('locked_at');
                }
            })
            ->orderByDesc('month')
            ->orderByDesc('id');

       $paginator = $query->paginate($perPage);

// Map các item về cấu trúc FE cần
$items = collect($paginator->items())->map(function (MonthlySummary $s) {
    return [
        'id'        => $s->id,
        'user'      => [
            'id'    => optional($s->user)->id,
            'name'  => optional($s->user)->name,
            'email' => optional($s->user)->email,
        ],
        'month'     => $s->month,
        'title'     => $s->title,
        'locked'    => !is_null($s->locked_at),
        'locked_at' => optional($s->locked_at)->toDateTimeString(),
        'stats'     => $s->stats,
    ];
})->values();

// Trả về data + meta phân trang
return response()->json([
    'data'         => $items,
    'current_page' => $paginator->currentPage(),
    'per_page'     => $paginator->perPage(),
    'total'        => $paginator->total(),
    'last_page'    => $paginator->lastPage(),
    'from'         => $paginator->firstItem(),
    'to'           => $paginator->lastItem(),
]);
    }

    /**
     * POST /management/reports/{report}/unlock
     * Gỡ "Chốt" (đặt locked_at = null)
     */
    public function unlock(MonthlySummary $report)
    {
        if (is_null($report->locked_at)) {
            return response()->json([
                'message' => 'Báo cáo đã ở trạng thái chưa chốt.',
            ], 200);
        }

        DB::transaction(function () use ($report) {
            $report->locked_at = null;
            $report->save();

            ApprovalLogger::record(
                'monthly_summary',
                $report->id,
                'report_unlocked',
                [
                    'month' => $report->month,
                    'title' => $report->title,
                    'user_id' => $report->user_id,
                ],
                $report->title ?? ('Báo cáo ' . $report->month)
            );
        });

        return response()->json([
            'message' => 'Đã gỡ "Chốt" báo cáo thành công.',
            'id'      => $report->id,
            'locked'  => false,
        ]);
    }
}
