<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đặt lại mật khẩu</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/7.0.0/mdb.min.css" rel="stylesheet" />
    <style>
        body {background:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#0f172a;}
        .card {width:400px;border-radius:18px;box-shadow:0 10px 30px rgba(2,8,23,.12);}
        a {text-decoration:none;color:#2563eb;}
    </style>
</head>
<body>
    <div class="card p-4">
        <h4 class="mb-1">Đặt lại mật khẩu</h4>
        <p class="text-muted mb-4">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        @if ($errors->any())
            <div class="alert alert-danger py-2">
                <ul class="mb-0 ps-3">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form method="POST" action="{{ route('password.update') }}">
            @csrf
            <input type="hidden" name="token" value="{{ $token }}">

            <div class="mb-3">
                <label for="email" class="form-label">Địa chỉ email</label>
                <input type="email" id="email" name="email" class="form-control" value="{{ old('email', $email) }}" required />
            </div>

            <div class="mb-3">
                <label for="password" class="form-label">Mật khẩu mới</label>
                <input type="password" id="password" name="password" class="form-control" required />
            </div>

            <div class="mb-3">
                <label for="password_confirmation" class="form-label">Xác nhận mật khẩu</label>
                <input type="password" id="password_confirmation" name="password_confirmation" class="form-control" required />
            </div>

            <button type="submit" class="btn btn-primary w-100">Cập nhật mật khẩu</button>
        </form>

        <div class="text-center mt-3">
            <a href="{{ route('login') }}">Quay về đăng nhập</a>
        </div>
    </div>
</body>
</html>
