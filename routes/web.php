<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\KPIController;
use App\Http\Controllers\TaskExportController;
use App\Http\Controllers\MonthlySummaryController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\TaskAdminController;
use App\Http\Controllers\Admin\KpiAdminController;
use App\Http\Controllers\Admin\AssignTaskController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\Admin\ReportAdminController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\ResetPasswordController;
// =============================
// ✔️ AUTH routes
// =============================
Route::get('/', fn() => redirect('/login'));
Route::get('/register', [AuthController::class, 'showRegister']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/logout', [AuthController::class, 'logout']);
Route::get('/forgot-password', [ForgotPasswordController::class, 'showLinkRequestForm'])->name('password.request');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail'])->name('password.email');
Route::get('/reset-password/{token}', [ResetPasswordController::class, 'showResetForm'])->name('password.reset');
Route::post('/reset-password', [ResetPasswordController::class, 'reset'])->name('password.update');

// =============================
// ✔️ APP routes (đã đăng nhập)
// =============================
Route::middleware(['auth'])->group(function () {

    //  Dashboard
    Route::get('/dashboard', [TaskController::class, 'dashboard'])->name('dashboard');

    //  task crud (sau khi gộp controller)
    Route::resource('tasks', TaskController::class)->except(['show']);
    Route::get('/tasks/export', [TaskController::class, 'export'])->name('tasks.export');
    //  kpi quản lý
    Route::get('/kpis/export', [KPIController::class, 'export'])->name('kpis.export'); //lí do đặt trước là do resource che mất
    Route::get('/kpis/{kpi}/json', [KPIController::class, 'showJson']);
    Route::resource('kpis', KPIController::class);




    //cap nha trang thai
    Route::post('/tasks/{task}/status', [TaskController::class, 'updateStatus']);
    Route::post('/kpis/{kpi}/status', [KPIController::class, 'updateStatus']);
    Route::post('/tasks/{task}/user-status', [TaskController::class, 'updateUserStatus']);
    //them 
    Route::post('/tasks/check-exist', [TaskController::class, 'checkExist'])->name('tasks.check-exist');
    //tong ket
    Route::get('/summaries', [MonthlySummaryController::class, 'index']);
    Route::get('/summaries/{summary}', [MonthlySummaryController::class, 'show']);
    Route::post('/summaries', [MonthlySummaryController::class, 'store']);
    Route::put('/summaries/{summary}', [MonthlySummaryController::class, 'update']);
    Route::delete('/summaries/{summary}', [MonthlySummaryController::class, 'destroy']);
    Route::post('/summaries/{summary}/lock', [MonthlySummaryController::class, 'lock']);
    Route::post('/summaries/{summary}/regenerate', [MonthlySummaryController::class, 'regenerate']);
    Route::get('/summaries/{summary}/export', [MonthlySummaryController::class, 'exportById']);

    //admin
    Route::middleware(['auth', 'role:Admin,Trưởng phòng'])->group(function () {
        Route::get('/management', fn() => view('management.index'))->name('management');
        // ---- USERS
        Route::get('/management/users', [UserController::class, 'index']);
        Route::post('/management/users', [UserController::class, 'store']);
        Route::put('/management/users/{user}', [UserController::class, 'update']);
        Route::delete('/management/users/{user}', [UserController::class, 'destroy']);
        // ---- TASKS (mới) ----
        Route::get('/management/tasks',            [TaskAdminController::class, 'index']);
        Route::post('/management/tasks',            [TaskAdminController::class, 'store']);
        Route::put('/management/tasks/{task}', [TaskAdminController::class, 'update']);
        Route::delete('/management/tasks/{task}',     [TaskAdminController::class, 'destroy']);

        // ---- KPI (VIEW + API tách riêng) ----

        // 1) VIEW trang để React mount
        Route::get('/management/kpis', fn() => view('management.kpis'))
            ->name('management.kpis');

        // 2) API JSON cho React
        Route::prefix('management/kpis')->group(function () {
            Route::get('/data', [KpiAdminController::class, 'index']);      // trả JSON list
            Route::post('/',     [KpiAdminController::class, 'store']);      // tạo
            Route::put('/{kpi}', [KpiAdminController::class, 'update']);     // sửa
            Route::delete('/{kpi}', [KpiAdminController::class, 'destroy']); // xoá
        });
    });
    // ---- REPORTS (VIEW + API) -----

    // 1) View để React mount (đã có Blade <div id="management-reports-app"></div>)
    Route::get('/management/reports', fn() => view('management.reports'))
        ->name('management.reports');

    // 2) API JSON cho ReportsTab
    Route::prefix('management/reports')->group(function () {
        Route::get('/data', [ReportAdminController::class, 'index']);          // list + filter + paginate
        Route::post('/{report}/unlock', [ReportAdminController::class, 'unlock']); // gỡ "Chốt"
    });

    // ===== ASSIGN (trang + API) =====
    Route::middleware(['auth', 'role:Admin,Trưởng phòng'])
        ->prefix('management/assign')
        ->group(function () {
            // Trang Blade để mount React
            Route::get('/', fn() => view('management.assign'))->name('management.assign');

            // API JSON cho AssignTaskTab
            Route::get('/tasks',    [AssignTaskController::class, 'index']);
            Route::post('/tasks',   [AssignTaskController::class, 'store']);
            Route::put('/tasks/{task}', [AssignTaskController::class, 'update']);
            Route::delete('/tasks/{task}', [AssignTaskController::class, 'destroy']);
        });
    //user profile
    Route::get('/my-profile', [UserProfileController::class, 'index'])->name('profile.view'); // View React mount
    Route::get('/my-profile/info', [UserProfileController::class, 'show']);
    Route::post('/my-profile/update', [UserProfileController::class, 'update']);
});

use App\Http\Controllers\Api\ShiftApiController;
use App\Http\Controllers\Api\TypeApiController;
use App\Http\Controllers\Api\TitleApiController;
use App\Http\Controllers\Api\SupervisorApiController;
use App\Http\Controllers\Api\StatusApiController;
use App\Http\Controllers\Api\DashboardApiController;
use App\Models\User;

Route::prefix('api')->middleware('auth')->group(function () {
    Route::prefix('shifts')->group(function () {
        Route::get('/', [ShiftApiController::class, 'index']);
        Route::post('/', [ShiftApiController::class, 'store']);
        Route::put('/{id}', [ShiftApiController::class, 'update']);
        Route::delete('/{id}', [ShiftApiController::class, 'destroy']);
    });

    Route::prefix('types')->group(function () {
        Route::get('/', [TypeApiController::class, 'index']);
        Route::post('/', [TypeApiController::class, 'store']);
        Route::put('/{id}', [TypeApiController::class, 'update']);
        Route::delete('/{id}', [TypeApiController::class, 'destroy']);
    });

    Route::prefix('titles')->group(function () {
        Route::get('/', [TitleApiController::class, 'index']);
        Route::post('/', [TitleApiController::class, 'store']);
        Route::put('/{id}', [TitleApiController::class, 'update']);
        Route::delete('/{id}', [TitleApiController::class, 'destroy']);
    });

    Route::prefix('supervisors')->group(function () {
        Route::get('/', [SupervisorApiController::class, 'index']);
        Route::post('/', [SupervisorApiController::class, 'store']);
        Route::put('/{id}', [SupervisorApiController::class, 'update']);
        Route::delete('/{id}', [SupervisorApiController::class, 'destroy']);
    });

    Route::prefix('statuses')->group(function () {
        Route::get('/', [StatusApiController::class, 'index']);
        Route::post('/', [StatusApiController::class, 'store']);
        Route::put('/{id}', [StatusApiController::class, 'update']);
        Route::delete('/{id}', [StatusApiController::class, 'destroy']);
    });
    Route::get('/dashboard/tasks-by-day', [DashboardApiController::class, 'tasksByDay']);
    Route::get('/dashboard/tasks-by-type', [DashboardApiController::class, 'tasksByType']);
    Route::get('/dashboard/kpi-progress/{id}', [DashboardApiController::class, 'kpiProgress']);
    Route::get('/kpis', function () {
        return \App\Models\Kpi::select('id', 'name')->get();
    });
    Route::get('/users', function () {
        return User::select('id', 'name', 'email', 'avatar')->get();
    });
    // web.php
    Route::post('/tasks/{task}/user-status', [TaskController::class, 'updateUserStatus']);
});
