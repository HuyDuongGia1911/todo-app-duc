<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <title>Login</title>

  <link href="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/7.0.0/mdb.min.css" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />

  <style>
    :root {
      --primary:#2563eb;
      --primary-600:#1e4fd8;
      --bg-1:#0f172a;
      --bg-2:#111827;
      --muted:#6b7280;
      --card-bg:#ffffff;
    }
    body {
      min-height:100vh;
      background:
        radial-gradient(1200px 600px at 10% -10%, rgba(37,99,235,.12), transparent 60%),
        radial-gradient(1200px 600px at 110% 110%, rgba(37,99,235,.14), transparent 60%),
        linear-gradient(180deg, var(--bg-1), var(--bg-2));
    }
    .auth-container {
      min-height:100vh;
    }
    .auth-card {
      width:400px;
      background:var(--card-bg);
      border-radius:18px;
      box-shadow:0 10px 30px rgba(2,8,23,.12);
    }
    h4 {
      font-weight:600;
      margin-bottom:.5rem;
    }
    .subtitle {
      color:var(--muted);
      font-size:.95rem;
      margin-bottom:1.5rem;
    }
    .form-label {font-weight:600;color:#374151;}
    .form-control {height:44px;border-radius:12px;}
    .btn-primary {
      background:var(--primary)!important;border-color:var(--primary)!important;
      border-radius:12px;
    }
    .btn-primary:hover {
      background:var(--primary-600)!important;border-color:var(--primary-600)!important;
    }
    .text-muted {color:var(--muted)!important;}
    a {color:var(--primary);text-decoration:none;}
    a:hover {text-decoration:underline;}
  </style>
</head>

<body>
  <div class="container auth-container d-flex align-items-center justify-content-center">
    <div class="card auth-card p-4 p-md-5">
      <h4 class="text-center">Login</h4>
      <p class="text-center subtitle">Đăng nhập để quản lý công việc</p>

      @if(session('error'))
        <div class="alert alert-danger py-2">{{ session('error') }}</div>
      @endif
      @if(session('success'))
        <div class="alert alert-success py-2">{{ session('success') }}</div>
      @endif

      <form method="POST" action="/login">
        @csrf

        <div class="mb-3">
          <label for="email" class="form-label">Email address</label>
          <input type="email" name="email" id="email" class="form-control" required autofocus />
        </div>

        <div class="mb-2">
          <label for="password" class="form-label">Password</label>
          <input type="password" name="password" id="password" class="form-control" required />
        </div>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="remember" />
            <label class="form-check-label" for="remember">Remember me</label>
          </div>
          <a href="{{ route('password.request') }}" class="small">Forgot password?</a>
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-100 mb-3">
          <i class="fa-solid fa-right-to-bracket me-2"></i>Sign in
        </button>

        <div class="text-center mb-3">
          <span class="text-muted">Chưa có tài khoản?</span>
          <a href="/register">Register</a>
        </div>

        <hr class="my-4" />

        <div class="text-center">
          <p class="text-muted mb-2">hoặc đăng nhập với</p>
          <div class="d-flex justify-content-center gap-2">
            <button type="button" class="btn btn-light btn-floating"><i class="fab fa-facebook-f"></i></button>
            <button type="button" class="btn btn-light btn-floating"><i class="fab fa-google"></i></button>
            <button type="button" class="btn btn-light btn-floating"><i class="fab fa-twitter"></i></button>
            <button type="button" class="btn btn-light btn-floating"><i class="fab fa-github"></i></button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/7.0.0/mdb.min.js" type="text/javascript"></script>
</body>
</html>
