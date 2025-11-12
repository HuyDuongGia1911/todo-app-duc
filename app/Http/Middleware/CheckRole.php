<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * Chỉ cho phép user có role phù hợp truy cập
     * Ví dụ: Admin, Trưởng phòng
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, $roles)) {
            abort(403, 'Bạn không có quyền truy cập.');
        }

        return $next($request);
    }
}
