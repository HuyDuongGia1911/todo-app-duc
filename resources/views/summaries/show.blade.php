@extends('layouts.app')

@section('content')
<div class="container py-4">
  <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
    <div>
      <p class="text-muted mb-1">Tháng {{ $summary['month'] }}</p>
      <h1 class="h3 mb-2 text-uppercase">{{ $summary['title'] ?? 'Báo cáo công việc' }}</h1>
      @if(!empty($summary['locked_at']))
          <span class="badge bg-success">Đã chốt: {{ \Carbon\Carbon::parse($summary['locked_at'])->format('d/m/Y H:i') }}</span>
      @else
        <span class="badge bg-warning text-dark">Chưa chốt</span>
      @endif
    </div>
    <div class="d-flex flex-wrap gap-2">
      <a href="/summaries" class="btn btn-outline-secondary">Quay lại danh sách</a>
      <a href="/summaries/{{ $summary['id'] }}/export" class="btn btn-success">Xuất Excel</a>
    </div>
  </div>

  <div class="card mb-4">
    <div class="card-header fw-semibold">Nội dung tổng kết</div>
    <div class="card-body" style="white-space: pre-wrap;">
      {{ $summary['content'] ?: 'Chưa có nội dung' }}
    </div>
  </div>

  @if(!empty($summary['stats']))
  <div class="row g-3 mb-4">
    <div class="col-md-3">
      <div class="border rounded p-3 h-100 text-center">
        <div class="text-muted">Tổng số công việc</div>
        <div class="fs-3 fw-bold">{{ $summary['stats']['total'] ?? 0 }}</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="border rounded p-3 h-100 text-center">
        <div class="text-muted">Đã hoàn thành</div>
        <div class="fs-3 fw-bold text-success">{{ $summary['stats']['done'] ?? 0 }}</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="border rounded p-3 h-100 text-center">
        <div class="text-muted">Chưa hoàn thành</div>
        <div class="fs-3 fw-bold text-primary">{{ $summary['stats']['pending'] ?? 0 }}</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="border rounded p-3 h-100 text-center">
        <div class="text-muted">Quá hạn</div>
        <div class="fs-3 fw-bold text-danger">{{ $summary['stats']['overdue'] ?? 0 }}</div>
      </div>
    </div>
  </div>
  @endif

  <div class="card mb-4">
    <div class="card-header fw-semibold">Danh sách công việc</div>
    <div class="card-body p-0">
      @if(!empty($summary['tasks_cache']))
        <div class="table-responsive">
          <table class="table table-striped table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Tên công việc</th>
                <th>Tiến độ</th>
                <th>Ngày thực hiện</th>
                <th>Trạng thái</th>
                <th>Liên kết</th>
              </tr>
            </thead>
            <tbody>
              @foreach($summary['tasks_cache'] as $task)
                <tr>
                  <td class="fw-semibold">{{ $task['title'] ?? '—' }}</td>
                  <td>{{ $task['progress'] ?? '—' }}</td>
                  <td>{{ collect($task['dates'] ?? [])->filter()->join(', ') ?: '—' }}</td>
                  <td>{{ $task['status'] ?? '—' }}</td>
                  <td>
                    @php $links = collect($task['links'] ?? [])->filter(); @endphp
                    @if($links->isNotEmpty())
                      @foreach($links as $url)
                        <a href="{{ $url }}" target="_blank" rel="noreferrer">Xem</a>@if(!$loop->last), @endif
                      @endforeach
                    @else
                      —
                    @endif
                  </td>
                </tr>
              @endforeach
            </tbody>
          </table>
        </div>
      @else
        <p class="p-3 mb-0">Không có công việc được lưu trong báo cáo.</p>
      @endif
    </div>
  </div>

  @php
    $kpis = collect($summary['kpis'] ?? []);
    $hasKpiRows = $kpis->contains(function ($item) {
        return !empty($item['task_rows']);
    });
  @endphp

  @if($hasKpiRows)
    <h4 class="fw-bold mb-3">Đánh giá KPI</h4>
    @foreach($kpis as $kpi)
      @continue(empty($kpi['task_rows']))
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">{{ $kpi['name'] }}</div>
            @if(!empty($kpi['note']))
              <small class="text-muted">{{ $kpi['note'] }}</small>
            @endif
          </div>
          <span class="badge bg-info text-dark">{{ number_format($kpi['progress'] ?? 0, 2) }}%</span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Hạng mục</th>
                  <th>Thời gian</th>
                  <th>KPI</th>
                  <th>Kết quả</th>
                  <th>Tỷ lệ</th>
                  <th>Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                @foreach($kpi['task_rows'] as $row)
                  @php
                    $target = (float)($row['target'] ?? 0);
                    $actual = (float)($row['actual'] ?? ($row['result'] ?? 0));
                    $percent = isset($row['percent']) ? (float)$row['percent'] : ($target > 0 ? ($actual / max($target, 0.0001)) * 100 : 0);
                    $rating = $row['evaluation'] ?? ($percent >= 80 ? 'Đạt' : ($percent <= 30 ? 'Không đạt' : 'Chưa đạt'));
                  @endphp
                  <tr>
                    <td>{{ $row['task_title'] ?? '—' }}</td>
                    <td>{{ $row['time_range'] ?? '—' }}</td>
                    <td>{{ rtrim(rtrim(number_format($target, 2, '.', ''), '0'), '.') }}</td>
                    <td>{{ rtrim(rtrim(number_format($actual, 2, '.', ''), '0'), '.') }}</td>
                    <td>{{ number_format($percent, 2) }}%</td>
                    <td>{{ $rating }}</td>
                  </tr>
                @endforeach
              </tbody>
            </table>
          </div>
        </div>
      </div>
    @endforeach
  @endif
</div>
@endsection
