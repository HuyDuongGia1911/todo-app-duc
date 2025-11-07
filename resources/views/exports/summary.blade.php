@php
    $stats = $summary->stats ?? [];
    $mergedTasks = $mergedTasks ?? []; 
@endphp
<table>
    <tr>
        <td colspan="2"><strong>{{ $user->name ?? 'N/A' }}</strong></td>
    </tr>
</table>
<table>
    <td colspan="2" style="font-weight: bold; font-size: 16px;">
    Tổng kết tháng {{ \Carbon\Carbon::parse($summary->month)->format('m/Y') }}
</td>

    <tr><td colspan="2"></td></tr>

    <tr>
        <td style="font-weight: bold;">Tiêu đề</td>
        <td>{{ $summary->title }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">Đã chốt lúc</td>
        <td>{{ $summary->locked_at ?? 'Chưa chốt' }}</td>
    </tr>

    <tr><td colspan="2"></td></tr>

    <tr>
        <td style="font-weight: bold; vertical-align: top;">Nội dung</td>
        <td>{!! nl2br(e($summary->content)) !!}</td>
    </tr>

    <tr><td colspan="2"></td></tr>

    <tr>
        <td colspan="2" style="font-weight: bold;">Thống kê</td>
    </tr>
    <tr>
        <td>Tổng số task</td>
        <td>{{ $stats['total'] ?? 0 }}</td>
    </tr>
    <tr>
        <td>Đã hoàn thành</td>
        <td>{{ $stats['done'] ?? 0 }}</td>
    </tr>
    <tr>
        <td>Chưa hoàn thành</td>
        <td>{{ $stats['pending'] ?? 0 }}</td>
    </tr>
    <tr>
        <td>Quá hạn</td>
        <td>{{ $stats['overdue'] ?? 0 }}</td>
    </tr>

    <tr><td colspan="2"></td></tr>


</table>

{{-- ===================== ĐÁNH GIÁ KPI ===================== --}}
@if(!empty($kpiRows))
    <br>
    <table>
        <tr>
            <td colspan="7"><strong>Đánh giá KPI</strong></td>
        </tr>
    </table>

    <table border="1" cellpadding="4" cellspacing="0">
        <thead>
            <tr>
                <th style="text-align:center;">STT</th>
                <th>Hạng mục KPI</th>
                <th>Hạng mục công việc</th>
                <th>Thời gian thực hiện</th>
                <th style="text-align:right;">KPI</th>
                <th style="text-align:right;">Kết quả</th>
                <th style="text-align:center;">Tỷ lệ %</th>
                <th style="text-align:center;">Đánh giá</th>
                  <th style="text-align:center;">Chứng minh KQ</th> 
            </tr>
        </thead>
        <tbody>
        @foreach($kpiRows as $i => $row)
            <tr>
                <td style="text-align:center;">{{ $i + 1 }}</td>
                <td>{{ $row['kpi_name'] }}</td>
                <td>{{ $row['task_title'] }}</td>
                <td>{{ $row['time_range'] }}</td>
                <td style="text-align:right;">{{ $row['target'] }}</td>
                <td style="text-align:right;">{{ $row['result'] }}</td>
                <td style="text-align:center;">{{ $row['percent'] }}</td>
                <td style="text-align:center;">{{ $row['note'] }}</td>
               <td style="text-align:center;">
    @if(!empty($row['proof_count']) && $row['proof_count'] > 0)
        {{ $row['proof_count'] }} link (xem bên dưới)
    @else
        –
    @endif
</td>
            </tr>
        @endforeach
    </tbody>
    </table>
@else
    <br>
    <table>
        <tr>
            <td><strong>Đánh giá KPI:</strong> Không có KPI nào trong tháng.</td>
        </tr>
    </table>
@endif
