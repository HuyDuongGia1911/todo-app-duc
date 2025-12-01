@extends('layouts.app')

@section('content')
<div class="container-fluid py-3">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
            <h1 class="mb-1">Sức khỏe KPI phòng</h1>
            <p class="text-muted mb-0">Theo dõi tình trạng KPI theo tháng để chủ động xử lý các rủi ro.</p>
        </div>
        <a href="{{ route('management') }}" class="btn btn-outline-secondary">&larr; Quay lại quản lý</a>
    </div>
    <div id="management-kpi-health-app" data-default-month="{{ now()->format('Y-m') }}"></div>
</div>
@endsection
