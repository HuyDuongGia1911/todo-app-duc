<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        if ($request->wantsJson()) {
            return User::orderBy('id', 'desc')->get();
        }
        return view('management.users');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:1',
            'role' => 'nullable|string|in:Admin,Trưởng phòng,Nhân viên',
        ]);

        // ✅ Gán mặc định nếu không truyền
        $data['role'] = $data['role'] ?? 'Nhân viên';

        $currentUser = auth()->user();

        // ✅ Chặn Trưởng phòng gán quyền cao hơn
        if ($currentUser->role === 'Trưởng phòng' && $data['role'] !== 'Nhân viên') {
            return response()->json([
                'error' => 'Trưởng phòng chỉ có thể tạo tài khoản Nhân viên.',
            ], 403);
        }

        // ✅ Chặn non-admin tạo admin
        if ($currentUser->role !== 'Admin' && $data['role'] === 'Admin') {
            return response()->json([
                'error' => 'Chỉ Admin có thể tạo tài khoản Admin.',
            ], 403);
        }

        // ✅ Mã hoá mật khẩu
        $data['password'] = Hash::make($data['password']);

        // ✅ Chỉ tạo sau khi kiểm tra quyền hợp lệ
        $user = User::create($data);

        return response()->json($user, 201);
    }



    public function update(Request $request, User $user)
    {
        // Dọn input
        $request->merge([
            'password' => trim($request->password) ?: null,
            'old_password' => trim($request->old_password) ?: null,
        ]);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'role' => 'required|string|in:Admin,Trưởng phòng,Nhân viên',
            'password' => 'nullable|string|min:1',
            'old_password' => 'nullable|string',
        ]);

        $currentUser = auth()->user();

        // =========================================
        // 🧱 1. Giới hạn quyền sửa role
        // =========================================
        if ($currentUser->role === 'Trưởng phòng') {
            // Nếu đang sửa người khác (id khác mình)
            if ($currentUser->id !== $user->id) {
                // Không được sửa Admin hoặc Trưởng phòng khác
                if (in_array($user->role, ['Admin', 'Trưởng phòng'])) {
                    return response()->json([
                        'error' => 'Trưởng phòng không thể chỉnh sửa tài khoản của Admin hoặc Trưởng phòng khác.',
                    ], 403);
                }

                // Không được gán vai trò cao hơn nhân viên
                if ($data['role'] !== 'Nhân viên') {
                    return response()->json([
                        'error' => 'Trưởng phòng chỉ có thể cập nhật tài khoản Nhân viên.',
                    ], 403);
                }
            } else {
                // Nếu sửa chính mình → luôn giữ nguyên role Trưởng phòng
                $data['role'] = 'Trưởng phòng';
            }
        }

        // Không phải admin thì không thể gán admin
        if ($currentUser->role !== 'Admin' && $data['role'] === 'Admin') {
            return response()->json([
                'error' => 'Chỉ Admin mới có thể gán quyền Admin.',
            ], 403);
        }

        // =========================================
        // 🔐 2. Xử lý đổi mật khẩu
        // =========================================
        $isChangingPassword = $data['password'] || $data['old_password'];

        if ($isChangingPassword) {
            // Nếu chỉ nhập mật khẩu cũ mà không nhập mới → lỗi
            if ($data['old_password'] && !$data['password']) {
                return response()->json([
                    'error' => 'Vui lòng nhập mật khẩu mới để đổi mật khẩu.',
                ], 422);
            }

            // Nếu chỉ nhập mật khẩu mới mà không nhập mật khẩu cũ (và không phải admin)
            if ($data['password'] && !$data['old_password'] && $currentUser->role !== 'Admin') {
                return response()->json([
                    'error' => 'Vui lòng nhập mật khẩu cũ để xác nhận thay đổi.',
                ], 422);
            }

            // Kiểm tra đúng mật khẩu cũ
            if ($data['old_password'] && !Hash::check($data['old_password'], $user->password)) {
                return response()->json([
                    'error' => 'Mật khẩu cũ không đúng.',
                ], 422);
            }

            // ✅ Khi qua được tất cả kiểm tra → mã hoá mật khẩu mới
            if (!empty($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            }
        } else {
            // Không đổi mật khẩu thì xoá khỏi request
            unset($data['password']);
        }

        // =========================================
        // ✅ 3. Cập nhật
        // =========================================
        $user->update($data);

        return response()->json($user->fresh());
    }


    public function destroy(User $user)
    {
        $currentUser = auth()->user();

        // 🧱 1. Không cho phép tự xóa chính mình
        if ($currentUser->id === $user->id) {
            return response()->json([
                'error' => 'Bạn không thể tự xóa tài khoản của chính mình.',
            ], 403);
        }

        // 🧱 2. Chỉ Admin có quyền xóa Admin
        if ($user->role === 'Admin' && $currentUser->role !== 'Admin') {
            return response()->json([
                'error' => 'Chỉ Admin có thể xóa tài khoản Admin.',
            ], 403);
        }

        // 🧱 3. Trưởng phòng chỉ được phép xóa nhân viên
        if ($currentUser->role === 'Trưởng phòng' && $user->role !== 'Nhân viên') {
            return response()->json([
                'error' => 'Trưởng phòng chỉ có thể xóa tài khoản Nhân viên.',
            ], 403);
        }

        // ✅ 4. Nếu hợp lệ → cho phép xóa
        $user->delete();

        return response()->json(['success' => true]);
    }
}
