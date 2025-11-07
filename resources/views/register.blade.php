<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Đăng ký</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/7.0.0/mdb.min.css" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
  <style>
    :root{ --primary:#2563eb; --primary-600:#1e4fd8; --bg-1:#0f172a; --bg-2:#111827; --card-bg:#fff; --muted:#6b7280; }
    body{
      min-height:100vh;
      background: radial-gradient(1200px 600px at 10% -10%, rgba(37,99,235,.12), transparent 60%),
                 radial-gradient(1200px 600px at 110% 110%, rgba(37,99,235,.14), transparent 60%),
                 linear-gradient(180deg, var(--bg-1), var(--bg-2));
    }
    .wrap{min-height:100vh;}
    .card-auth{width:440px;background:var(--card-bg);border-radius:18px;box-shadow:0 10px 30px rgba(2,8,23,.12);}
    h4{font-weight:700;margin-bottom:.5rem;}
    .subtitle{color:var(--muted);font-size:.95rem;margin-bottom:1.5rem;}
    .form-label{font-weight:600;color:#374151;}
    .form-control{height:44px;border-radius:12px;}
    .btn-primary{background:var(--primary)!important;border-color:var(--primary)!important;border-radius:12px;}
    .btn-primary:hover{background:var(--primary-600)!important;border-color:var(--primary-600)!important;}
    a{color:var(--primary);text-decoration:none;} a:hover{text-decoration:underline;}
    .input-group>.form-control,.input-group>.btn{height:44px}
    .input-group>.form-control{border-top-left-radius:12px;border-bottom-left-radius:12px}
    .input-group>.btn{border-top-right-radius:12px;border-bottom-right-radius:12px}
  </style>
</head>
<body>
  <div class="container wrap d-flex align-items-center justify-content-center">
    <div class="card card-auth p-4 p-md-5">
      <h4 class="text-center">Tạo tài khoản</h4>
      <p class="text-center subtitle">Đăng ký để bắt đầu quản lý công việc</p>

      <form method="POST" action="/register" novalidate>
        @csrf

        <div class="mb-3">
          <label class="form-label" for="name">Họ và tên</label>
          <input id="name" name="name" type="text" class="form-control" required>
        </div>

        <div class="mb-3">
          <label class="form-label" for="email">Email</label>
          <input id="email" name="email" type="email" class="form-control" required>
        </div>

        <div class="mb-3">
          <label class="form-label" for="password">Mật khẩu</label>
          <div class="input-group">
            <input id="password" name="password" type="password" class="form-control" required>
            <button type="button" class="btn btn-light border" id="toggle-password" aria-label="Hiện/ẩn mật khẩu">
              <i class="fa-regular fa-eye-slash"></i>
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-100">Đăng ký</button>

        <div class="text-center mt-3">
          <span class="text-muted">Đã có tài khoản?</span>
          <a href="{{ route('login') }}">Đăng nhập</a>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/7.0.0/mdb.min.js"></script>
  <script>
    document.getElementById('toggle-password').addEventListener('click', function(){
      const input = document.getElementById('password');
      const icon = this.querySelector('i');
      if(input.type === 'password'){ input.type='text'; icon.className='fa-regular fa-eye'; }
      else{ input.type='password'; icon.className='fa-regular fa-eye-slash'; }
    });
  </script>
</body>
</html>
