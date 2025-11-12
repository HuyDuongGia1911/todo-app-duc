<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8">
  <title>Todo App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Bootstrap + Icon -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">

  @vite(['resources/css/app.css', 'resources/js/app.jsx'])

  <meta name="csrf-token" content="{{ csrf_token() }}">

  <style>
    html,
    body {
      height: 100%;
      margin: 0;
      overflow: hidden;
      /* Ngăn cuộn toàn trang */
      background-color: #f8f9fa;
    }

    .app-wrapper {
      display: flex;
      height: 100vh;
    }

    .sidebar {
      width: 250px;
      background-color: #343a40;
      color: white;
      display: flex;
      flex-direction: column;
      transition: margin-left 0.3s;
    }

    .sidebar a {
      color: white;
      text-decoration: none;
    }

    .sidebar .nav-link {
      color: #f8f9fa;
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      transition: all 0.2s ease-in-out;
    }

    .sidebar .nav-link.active {
      background-color: #0d6efd;
      font-weight: bold;
    }

    .sidebar .nav-link:hover {
      background-color: #495057;
      color: white !important;
    }

    .main-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      flex-shrink: 0;
      padding: 1rem 1.5rem 0.5rem;
      background-color: #f8f9fa;
    }

    .content-area {
      flex-grow: 1;
      overflow-y: auto;
      padding: 1.5rem;
      min-height: 0;
      background-color: white;
    }

    .sidebar.hidden {
      margin-left: -250px;
    }

    .toggle-sidebar-btn {
      position: absolute;
      top: 50%;
      right: -15px;
      transform: translateY(-50%);
      border-radius: 50%;
      z-index: 999;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    /* submenu trong Quản lý */
    #mgmtMenu .nav-link {
      font-weight: 500;
      font-size: 14px;
      color: #e9ecef;
      border-radius: 6px;
    }

    #mgmtMenu .nav-link:hover {
      background-color: #495057;
      color: #fff;
    }

    /* chevron xoay khi mở */
    a[aria-controls="mgmtMenu"][aria-expanded="true"] .bi-chevron-down {
      transform: rotate(180deg);
      transition: transform .2s ease;
    }
  </style>
</head>

<body>
  <div class="app-wrapper">

    <!-- Sidebar -->
    <div id="sidebar" class="sidebar position-relative p-3">
      <!-- Nút toggle -->
      <button id="sidebarToggleBtn" class="btn btn-sm btn-light text-dark toggle-sidebar-btn" onclick="toggleSidebar()" title="Thu gọn / Mở rộng sidebar">
        <i class="bi bi-chevron-left" id="sidebarToggleIcon"></i>
      </button>

      <div class="text-center mb-4 mt-3">
        <i class="bi bi-check2-square fs-3"></i>
        <div class="fw-bold mt-2">TODO APP</div>
      </div>
      <hr class="border-light my-2 opacity-25">
      <!-- Avatar + Tên người dùng: căn giữa trái thật sự -->
      <div class="mb-4 px-2">
        <div class="d-flex align-items-center" style="height: 48px;">
          @php
          $avatarPath = Auth::user()->avatar
          ? asset('storage/' . Auth::user()->avatar)
          : 'https://www.w3schools.com/howto/img_avatar.png';
          @endphp

          <img
            src="{{ $avatarPath }}"
            alt="Avatar"
            class="rounded-circle shadow-sm me-2"
            width="48"
            height="48"
            onerror="this.onerror=null;this.src='https://www.w3schools.com/howto/img_avatar.png';" />



          <div class="fw-semibold text-white">
            {{ Auth::user()->name ?? 'Khách' }}
          </div>
        </div>
      </div>



      <!-- Phân cách avatar & menu -->
      <hr class="border-light opacity-25 my-2">
      <ul class="nav nav-pills flex-column gap-2">
        <li><a href="/dashboard" class="nav-link {{ request()->is('dashboard') ? 'active' : '' }}"><i class="bi bi-house-door-fill"></i> Trang chủ</a></li>
        <li><a href="/tasks" class="nav-link {{ request()->is('tasks*') ? 'active' : '' }}"><i class="bi bi-journal-text"></i> Công việc</a></li>
        <li><a href="/kpis" class="nav-link {{ request()->is('kpis*') ? 'active' : '' }}"><i class="bi bi-speedometer2"></i> KPI</a></li>
        <li><a href="/summaries" class="nav-link {{ request()->is('summaries*') ? 'active' : '' }}"><i class="bi bi-clipboard-check"></i> Báo cáo</a></li>


        @auth
        @if(in_array(Auth::user()->role, ['Admin', 'Trưởng phòng']))
        <li>
          <a class="nav-link d-flex justify-content-between align-items-center"
            data-bs-toggle="collapse"
            href="#mgmtMenu"
            role="button"
            aria-expanded="{{ request()->is('management*') ? 'true' : 'false' }}"
            aria-controls="mgmtMenu">
            <span><i class="bi bi-gear-fill me-2"></i> Quản lý</span>
            <i class="bi bi-chevron-down small"></i>
          </a>

          <div class="collapse mt-1 {{ request()->is('management*') ? 'show' : '' }}" id="mgmtMenu">
            <ul class="list-unstyled ps-3 mb-0">
              <li>
                <a href="/management/users"
                  class="nav-link py-1 {{ request()->is('management/users') ? 'active' : '' }}">
                  <i class="bi bi-people me-2"></i> Người dùng
                </a>
              </li>
              <li>
                <a href="/management/tasks"
                  class="nav-link py-1 {{ request()->is('management/tasks') ? 'active' : '' }}">
                  <i class="bi bi-journal-text me-2"></i> Công việc
                </a>
              </li>
              <li>
                <a href="/management/kpis"
                  class="nav-link py-1 {{ request()->is('management/kpis') ? 'active' : '' }}">
                  <i class="bi bi-speedometer2 me-2"></i> KPI
                </a>
              </li>
              <li>
                <a href="/management/reports"
                  class="nav-link py-1 {{ request()->is('management/reports') ? 'active' : '' }}">
                  <i class="bi bi-clipboard-check me-2"></i> Báo cáo
                </a>
              </li>
              <li>
                <a href="/management/assign"
                  class="nav-link py-1 {{ request()->is('management/assign') ? 'active' : '' }}">
                  <i class="bi bi-send-check me-2"></i> Giao việc
                </a>
              </li>
            </ul>
          </div>
        </li>
        @endif
        @endauth

        <li>
          <a href="/my-profile" class="nav-link {{ request()->is('my-profile') ? 'active' : '' }}">
            <i class="bi bi-person-circle"></i> Hồ sơ cá nhân
          </a>
        </li>


        <li class="mt-4">
          <a href="/logout" class="nav-link text-danger"><i class="bi bi-box-arrow-right"></i> Logout</a>
        </li>
      </ul>
    </div>

    <!-- Nội dung chính -->
    <div class="main-content">
      <div class="topbar">
        @if(session('success'))
        <div class="alert alert-success alert-dismissible fade show mb-3" role="alert">
          {{ session('success') }}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
        @endif

      </div>

      <div class="content-area">
        @yield('content')
      </div>
    </div>
  </div>
  <script>
    window.currentUserRole = "{{ Auth::user()->role ?? '' }}";
  </script>

  <!-- Toggle Sidebar Script -->
  <script>
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const icon = document.getElementById('sidebarToggleIcon');

      const isHidden = sidebar.classList.toggle('hidden');
      icon.classList.toggle('bi-chevron-left', !isHidden);
      icon.classList.toggle('bi-chevron-right', isHidden);
    }

    window.onload = () => {
      const sidebar = document.getElementById('sidebar');
      const icon = document.getElementById('sidebarToggleIcon');
      const isHidden = sidebar.classList.contains('hidden');
      icon.classList.toggle('bi-chevron-left', !isHidden);
      icon.classList.toggle('bi-chevron-right', isHidden);
    };
  </script>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  @yield('scripts')
</body>

</html>