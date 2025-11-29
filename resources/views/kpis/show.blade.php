@extends('layouts.app')
@section('content')
<h2>Chi tiết Deadline: {{ $kpi->name }}</h2>

<ul>
    <li><strong>Ngày bắt đầu:</strong> {{ $kpi->start_date }}</li>
    <li><strong>Ngày đến hạn:</strong> {{$kpi->end_date }}</li>
    <li><strong>Ghi chú:</strong> {{$kpi->note ?? '-' }}</li>
</ul>
<p><strong>Mục tiêu tháng:</strong> {{ $kpi->target_progress ?? 0 }}</p>
<p><strong>Đã đạt:</strong> {{ $kpi->actual_progress ?? 0 }}</p>
<p><strong>Tiến độ tổng thể:</strong> {{ $overallProgress }}%</p>
<h4>Công việc liên quan:</h4>
<table class="table">
   <thead>
    <tr>
        <th>Tên công việc</th>
        <th>Tiến độ thực tế</th>
        <th>Mục tiêu</th>
        <th>Tiến độ (%)</th>
    </tr>
</thead>

  <tbody>
    @foreach($tasks as $task)
        <tr>
            <td>{{ $task['title'] }}</td>
            <td>{{ $task['actual'] }}</td>
            <td>{{ $task['target'] }}</td>
            <td>{{ $task['ratio'] ?? 0 }}%</td>
        </tr>
    @endforeach
</tbody>

</table>
@endsection
