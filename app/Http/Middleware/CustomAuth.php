<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CustomAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */

     //cơ bản là cơ chế kiểm tra, ngăn ko cho vào nếu ko có quyền
   public function handle($request, Closure $next)
{
    if (!session()->has('user')) {
        return redirect('/login')->with('error', 'Please login first');
    }
    //$next`: là hàm Laravel dùng để **chuyển tiếp request đến bước xử lý tiếp theo**, ví dụ controller.
    return $next($request);

}

}
