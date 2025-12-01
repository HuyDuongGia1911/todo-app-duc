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
  @php
    $currentUserMeta = Auth::user()
        ? Auth::user()->only(['id', 'name', 'email', 'avatar'])
        : null;
  @endphp
  <meta name="current-user" content='@json($currentUserMeta)'>

  <style>
    :root {
      --sidebar-width: 280px;
      --sidebar-collapsed-width: 72px;
    }

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
      width: var(--sidebar-width);
      flex: 0 0 var(--sidebar-width);
      background: radial-gradient(circle at top, #3a3f96, #1b2238 45%, #111827 100%);
      color: white;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: width 0.3s ease;
      position: relative;
      box-shadow: 18px 0 40px rgba(15, 23, 42, 0.35);
      isolation: isolate;
    }

    .sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 28px 28px;
      opacity: 0.6;
      pointer-events: none;
      mix-blend-mode: screen;
      z-index: -1;
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
      position: relative;
    }

    .sidebar .nav-link i {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.06);
      font-size: 1.1rem;
    }

    .sidebar .nav-link::before {
      content: '';
      position: absolute;
      inset: 2px;
      border-radius: 12px;
      background: linear-gradient(120deg, rgba(59, 130, 246, 0.35), rgba(14, 165, 233, 0.5));
      opacity: 0;
      transform: scale(0.95);
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: -1;
    }

    .sidebar .nav-link.active {
      background-color: transparent;
      color: #fff;
    }

    .sidebar .nav-link.active::before {
      opacity: 1;
      transform: scale(1);
      animation: sidebarPulse 1.8s ease-in-out infinite;
    }

    .sidebar .nav-link.active i {
      background: linear-gradient(135deg, rgba(248, 250, 252, 0.14), rgba(255, 255, 255, 0.28));
      border-color: rgba(255, 255, 255, 0.6);
      color: #111827;
    }

    .sidebar .nav-link:hover {
      color: white !important;
    }

    .sidebar .nav-link:hover::before {
      opacity: 0.35;
      transform: scale(1);
    }

    @keyframes sidebarPulse {
      0% {
        box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.5);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(14, 165, 233, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(14, 165, 233, 0);
      }
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

    .app-wrapper.sidebar-collapsed .sidebar {
      width: var(--sidebar-collapsed-width);
      flex-basis: var(--sidebar-collapsed-width);
    }

    .toggle-sidebar-btn {
      position: absolute;
      top: 50%;
      right: -18px;
      transform: translateY(-50%);
      border-radius: 50%;
      width: 38px;
      height: 38px;
      background: radial-gradient(circle at 30% 30%, #ffffff, #dfe3eb);
      border: 2px solid rgba(0, 0, 0, 0.08);
      z-index: 1001;
      box-shadow: 0 8px 16px rgba(15, 23, 42, 0.25);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease, right 0.2s ease;
    }

    .toggle-sidebar-btn i {
      color: #0f172a;
      font-size: 1rem;
    }

    .toggle-sidebar-btn:hover {
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.3);
      transform: translateY(-50%) scale(1.04);
    }

    .app-wrapper.sidebar-collapsed .toggle-sidebar-btn {
      right: -18px;
      background: radial-gradient(circle at 30% 30%, #ffffff, #cfd6e3);
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

    .sidebar-brand-text,
    .sidebar-user-name,
    .nav-label {
      transition: opacity 0.2s ease;
    }

    .app-wrapper.sidebar-collapsed .sidebar .nav-link {
      justify-content: center;
    }

    .app-wrapper.sidebar-collapsed .sidebar .nav-link::before {
      inset: 6px;
      border-radius: 50%;
    }

    .app-wrapper.sidebar-collapsed .sidebar .nav-link.active::before {
      box-shadow: 0 0 20px rgba(14, 165, 233, 0.7);
    }

    .app-wrapper.sidebar-collapsed .sidebar-brand-text,
    .app-wrapper.sidebar-collapsed .sidebar-user-name,
    .app-wrapper.sidebar-collapsed .nav-label,
    .app-wrapper.sidebar-collapsed .sidebar .collapse.show {
      opacity: 0;
      pointer-events: none;
      height: 0;
      overflow: hidden;
    }

    .app-wrapper.sidebar-collapsed .mgmt-chevron {
      display: none;
    }

    .app-wrapper.sidebar-collapsed hr {
      margin: 0.5rem 0;
    }

    .app-wrapper.sidebar-collapsed .sidebar .nav-link::after {
      content: attr(data-label);
      position: absolute;
      left: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%) translateX(6px);
      background: rgba(15, 23, 42, 0.95);
      color: #fff;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.85rem;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.35);
    }

    .app-wrapper.sidebar-collapsed .sidebar .nav-link:hover::after,
    .app-wrapper.sidebar-collapsed .sidebar .nav-link:focus-visible::after {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
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
        <div class="fw-bold mt-2 sidebar-brand-text">TODO APP</div>
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



          <div class="fw-semibold text-white sidebar-user-name">
            {{ Auth::user()->name ?? 'Khách' }}
          </div>
        </div>
      </div>



      <!-- Phân cách avatar & menu -->
      <hr class="border-light opacity-25 my-2">
      <ul class="nav nav-pills flex-column gap-2">
        <li>
          <a href="/dashboard" class="nav-link {{ request()->is('dashboard') ? 'active' : '' }}" data-label="Trang chủ">
            <i class="bi bi-house-door-fill"></i>
            <span class="nav-label">Trang chủ</span>
          </a>
        </li>
        <li>
          <a href="/tasks" class="nav-link {{ request()->is('tasks*') ? 'active' : '' }}" data-label="Công việc">
            <i class="bi bi-journal-text"></i>
            <span class="nav-label">Công việc</span>
          </a>
        </li>
        <li>
          <a href="/activity" class="nav-link {{ request()->is('activity') ? 'active' : '' }}" data-label="Nhật ký">
            <i class="bi bi-journal-check"></i>
            <span class="nav-label">Nhật ký</span>
          </a>
        </li>
        <li>
          <a href="/proposals" class="nav-link {{ request()->is('proposals') ? 'active' : '' }}" data-label="Đề xuất">
            <i class="bi bi-lightbulb"></i>
            <span class="nav-label">Đề xuất</span>
          </a>
        </li>
        <li>
          <a href="/kpis" class="nav-link {{ request()->is('kpis*') ? 'active' : '' }}" data-label="KPI">
            <i class="bi bi-speedometer2"></i>
            <span class="nav-label">KPI</span>
          </a>
        </li>
        <li>
          <a href="/summaries" class="nav-link {{ request()->is('summaries*') ? 'active' : '' }}" data-label="Báo cáo">
            <i class="bi bi-clipboard-check"></i>
            <span class="nav-label">Báo cáo</span>
          </a>
        </li>
        <li>
          <div id="sidebar-notifications-root"></div>
        </li>


        @auth
        @if(in_array(Auth::user()->role, ['Admin', 'Trưởng phòng']))
        <li>
          <a class="nav-link d-flex justify-content-between align-items-center"
            data-bs-toggle="collapse"
            href="#mgmtMenu"
            role="button"
            aria-expanded="{{ request()->is('management*') ? 'true' : 'false' }}"
            aria-controls="mgmtMenu"
            data-label="Quản lý">
            <span class="d-flex align-items-center gap-2">
              <i class="bi bi-gear-fill"></i>
              <span class="nav-label">Quản lý</span>
            </span>
            <i class="bi bi-chevron-down small mgmt-chevron"></i>
          </a>

          <div class="collapse mt-1 {{ request()->is('management*') ? 'show' : '' }}" id="mgmtMenu">
            <ul class="list-unstyled ps-3 mb-0">
              <li>
                <a href="/management/users"
                  class="nav-link py-1 {{ request()->is('management/users') ? 'active' : '' }}"
                  data-label="Người dùng">
                  <i class="bi bi-people me-2"></i>
                  <span class="nav-label">Người dùng</span>
                </a>
              </li>
              <li>
                <a href="/management/tasks"
                  class="nav-link py-1 {{ request()->is('management/tasks') ? 'active' : '' }}"
                  data-label="Công việc">
                  <i class="bi bi-journal-text me-2"></i>
                  <span class="nav-label">Công việc</span>
                </a>
              </li>
              <li>
                <a href="/management/kpis"
                  class="nav-link py-1 {{ request()->is('management/kpis') ? 'active' : '' }}"
                  data-label="KPI">
                  <i class="bi bi-speedometer2 me-2"></i>
                  <span class="nav-label">KPI</span>
                </a>
              </li>
              <li>
                <a href="/management/kpi-health"
                  class="nav-link py-1 {{ request()->is('management/kpi-health') ? 'active' : '' }}"
                  data-label="Sức khỏe KPI">
                  <i class="bi bi-heart-pulse me-2"></i>
                  <span class="nav-label">Sức khỏe KPI</span>
                </a>
              </li>
              <li>
                <a href="/management/reports"
                  class="nav-link py-1 {{ request()->is('management/reports') ? 'active' : '' }}"
                  data-label="Báo cáo">
                  <i class="bi bi-clipboard-check me-2"></i>
                  <span class="nav-label">Báo cáo</span>
                </a>
              </li>
              <li>
                <a href="/management/proposals"
                  class="nav-link py-1 {{ request()->is('management/proposals') ? 'active' : '' }}"
                  data-label="Đề xuất">
                  <i class="bi bi-lightbulb me-2"></i>
                  <span class="nav-label">Đề xuất</span>
                </a>
              </li>
              <li>
                <a href="/management/assign"
                  class="nav-link py-1 {{ request()->is('management/assign') ? 'active' : '' }}"
                  data-label="Giao việc">
                  <i class="bi bi-send-check me-2"></i>
                  <span class="nav-label">Giao việc</span>
                </a>
              </li>
            </ul>
          </div>
        </li>
        @endif
        @endauth

        <li>
          <a href="/my-profile" class="nav-link {{ request()->is('my-profile') ? 'active' : '' }}" data-label="Hồ sơ cá nhân">
            <i class="bi bi-person-circle"></i>
            <span class="nav-label">Hồ sơ cá nhân</span>
          </a>
        </li>


        <li class="mt-4">
          <a href="/logout" class="nav-link text-danger" data-label="Logout">
            <i class="bi bi-box-arrow-right"></i>
            <span class="nav-label">Logout</span>
          </a>
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
      const wrapper = document.querySelector('.app-wrapper');
      const icon = document.getElementById('sidebarToggleIcon');
      if (!wrapper || !icon) return;

      const isCollapsed = wrapper.classList.toggle('sidebar-collapsed');
      icon.classList.toggle('bi-chevron-left', !isCollapsed);
      icon.classList.toggle('bi-chevron-right', isCollapsed);
      try {
        localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
      } catch (e) {
        console.warn('Sidebar preference not persisted', e);
      }
    }

    window.addEventListener('load', () => {
      const wrapper = document.querySelector('.app-wrapper');
      const icon = document.getElementById('sidebarToggleIcon');
      if (!wrapper || !icon) return;

      let storedCollapse = null;
      try {
        storedCollapse = localStorage.getItem('sidebarCollapsed');
      } catch (e) {
        storedCollapse = null;
      }

      if (storedCollapse === '1') {
        wrapper.classList.add('sidebar-collapsed');
      }

      const isCollapsed = wrapper.classList.contains('sidebar-collapsed');
      icon.classList.toggle('bi-chevron-left', !isCollapsed);
      icon.classList.toggle('bi-chevron-right', isCollapsed);
    });
  </script>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  @stack('scripts')
  @yield('scripts')
</body>

</html>