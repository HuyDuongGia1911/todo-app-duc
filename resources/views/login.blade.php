<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <title>Login</title>

  <link href="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/7.0.0/mdb.min.css" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />

  <style>
    :root {
      --primary:#4f46e5;
      --primary-600:#4338ca;
      --primary-200:#c7d2fe;
      --bg-1:#e0f2ff;
      --bg-2:#eff6ff;
      --muted:#6b7280;
      --card-bg:#ffffff;
    }
    body {
      min-height:100vh;
      background:linear-gradient(145deg, #e0f2ff 0%, #eff6ff 45%, #e0e7ff 100%);
      overflow:hidden;
    }
    .auth-container {
      min-height:100vh;
      position:relative;
    }
    .auth-card {
      width:420px;
      background:var(--card-bg);
      border-radius:18px;
      box-shadow:0 25px 60px rgba(15,23,42,.18);
      border:1px solid rgba(79,70,229,.08);
    }
    h4 {
      font-weight:700;
      margin-bottom:.5rem;
    }
    .subtitle {
      color:var(--muted);
      font-size:.95rem;
      margin-bottom:1.5rem;
    }
    .form-label {font-weight:600;color:#374151;}
    .form-control {
      height:44px;
      border-radius:12px;
      border:1px solid #e2e8f0;
      background:#f8fafc;
    }
    .form-control:focus {
      border-color:var(--primary);
      box-shadow:0 0 0 3px rgba(79,70,229,.12);
    }
    .btn-primary {
      background:var(--primary)!important;border-color:var(--primary)!important;
      border-radius:12px;
      box-shadow:0 15px 25px rgba(79,70,229,.25);
    }
    .btn-primary:hover {
      background:var(--primary-600)!important;border-color:var(--primary-600)!important;
    }
    .text-muted {color:var(--muted)!important;}
    a {color:var(--primary);text-decoration:none;}
    a:hover {text-decoration:underline;}
    .background-blur {
      position:absolute;
      width:420px;
      height:420px;
      border-radius:50%;
      filter:blur(80px);
      opacity:.6;
      z-index:0;
    }
    .bg-1 {background:rgba(79,70,229,.6);top:-120px;left:-120px;}
    .bg-2 {background:rgba(14,165,233,.6);bottom:-140px;right:-120px;}
    .brand-pill {
      display:inline-flex;
      align-items:center;
      gap:.35rem;
      padding:.4rem 1rem;
      border-radius:999px;
      background:rgba(79,70,229,.1);
      color:var(--primary-600);
      font-size:.8rem;
      font-weight:600;
      letter-spacing:.04em;
    }
    .social-actions a {
      width:44px;height:44px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      border:1px solid #e5e7eb;
      background:#fff;
      transition:.25s;
    }
    .social-actions a:hover {
      transform:translateY(-2px);
      border-color:var(--primary-200);
      color:var(--primary);
    }
  </style>
</head>

<body>
  <div class="container auth-container d-flex align-items-center justify-content-center">
    <div class="background-blur bg-1"></div>
    <div class="background-blur bg-2"></div>
    <div class="card auth-card p-4 p-md-5">
      <div class="d-flex justify-content-center mb-3">
        <span class="brand-pill">
          <i class="fa-solid fa-briefcase"></i> Taskflow Portal
        </span>
      </div>
      <h4 class="text-center">Chào mừng trở lại!</h4>
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
          <div class="d-flex justify-content-center gap-3 social-actions">
            <a href="{{ route('facebook.redirect') }}" title="Đăng nhập bằng Facebook">
              <i class="fab fa-facebook-f"></i>
            </a>
            <a href="{{ route('google.redirect') }}" title="Đăng nhập bằng Google">
              <i class="fab fa-google"></i>
            </a>
            <a href="javascript:void(0)" title="Twitter (sắp ra mắt)">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="javascript:void(0)" title="Github (sắp ra mắt)">
              <i class="fab fa-github"></i>
            </a>
          </div>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/7.0.0/mdb.min.js" type="text/javascript"></script>
</body>
</html>
