<?php

namespace App\Exports;

use App\Models\MonthlySummary;
use App\Models\KPI;
use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Style\Conditional;
use Carbon\Carbon;
use App\Models\User;
class SingleMonthlySummaryExport implements FromView, WithEvents, WithColumnWidths, WithColumnFormatting
{
    protected MonthlySummary $summary;
    protected int $kpiRowCount = 0;
    protected User $user;
    protected array $kpiRows = [];

    // Màu theo layout mẫu (có thể chỉnh)
    private string $colKpiBg   = 'F8DDBB'; // nền cam nhạt cho cột "Hạng mục KPI"
    private string $headerBg    = 'EFEFEF'; // header xám nhạt
    private string $footerBg    = 'D8A97C'; // cam đậm cuối bảng "THÁNG x.yyyy"
    private string $okGreen     = '1E7E34'; // xanh chữ "Đạt"
    private string $badRed      = 'C0392B'; // đỏ chữ "Không đạt"

    public function __construct(MonthlySummary $summary)
    {
        $this->summary = $summary;
          $this->user = $summary->user;
    }
   

    public function view(): View
    {
        $summary = $this->summary;

        // Dải ngày của tháng đang export
        $month = Carbon::createFromFormat('Y-m', $summary->month);
        $start = $month->copy()->startOfMonth()->toDateString();
        $end   = $month->copy()->endOfMonth()->toDateString();

        // Lấy KPI của user trong tháng
        $kpis = KPI::with('tasks')
            ->where('user_id', $summary->user_id)
            ->whereDate('start_date', '<=', $end)
            ->whereDate('end_date', '>=', $start)
            ->get();

        // Chuẩn hóa tasks_cache (nếu null)
        $tasksCache = collect($summary->tasks_cache ?? []);

        // Build các dòng đánh giá KPI
        $kpiRows = [];

        foreach ($kpis as $kpi) {
            foreach ($kpi->tasks as $kpiTask) {
                $title = $kpiTask->task_title;

                // Tìm các entry trong tasks_cache trùng title
                $related = $tasksCache->filter(function ($t) use ($title) {
                    return isset($t['title']) && $t['title'] === $title;
                });

                // Gom ngày và tiến độ thực tế
               $allDates = [];
$actual   = 0.0;
$allLinks = [];

foreach ($related as $item) {
    $actual += (float)($item['progress'] ?? 0);

    foreach (($item['dates'] ?? []) as $d) {
        if (!empty($d)) $allDates[] = $d;
    }

    // ✅ hỗ trợ link đơn
    if (!empty($item['link']) && is_string($item['link'])) {
        $allLinks[] = trim($item['link']);
    }

    // ✅ hỗ trợ links dạng mảng (nếu sau này bạn dùng)
    if (!empty($item['links']) && is_array($item['links'])) {
        foreach ($item['links'] as $l) {
            if (is_string($l) && strlen(trim($l))) {
                $allLinks[] = trim($l);
            }
        }
    }
}

sort($allDates);
$timeRange = count($allDates) > 0 ? ($allDates[0] . ' - ' . end($allDates)) : '';
$allLinks = array_values(array_unique(array_filter($allLinks)));
$target  = (float)($kpiTask->target_progress ?? 0);
$percent = $target > 0 ? round(($actual / $target), 4) : 0;
$note    = $percent >= 1 ? 'Đạt' : 'Không đạt';

// ✅ loại trùng & ghép bằng dấu phẩy (để Blade explode(',') hiển thị nhiều link)
$proofLink = implode(', ', array_values(array_unique(array_filter($allLinks))));


               $kpiRows[] = [
    'kpi_name'     => $kpi->name,
    'task_title'   => $title,
    'time_range'   => $timeRange,
    'target'       => $target,
    'result'       => $actual,
    'percent'      => $percent,          // 0..1
    'note'         => $note,
    'proof_links'  => $allLinks,         // ⬅️ danh sách link
    'proof_count'  => count($allLinks),  // ⬅️ số link
];
            }
        }

        $this->kpiRowCount = count($kpiRows);
$this->kpiRows = $kpiRows;
        return view('exports.summary', [
            'summary'     => $summary,
            'mergedTasks' => $summary->tasks_cache ?? [],
            'kpiRows'     => $kpiRows,
               'user'        => $this->user,
        ]);
    }

    /** Độ rộng cột gần giống mẫu */
    public function columnWidths(): array
    {
        // A: STT | B: Hạng mục KPI | C: Hạng mục công việc | D: Thời gian | E: KPI | F: Kết quả | G: % | H: Đánh giá | I: Chứng minh KQ
        return [
            'A' => 6,
            'B' => 36,
            'C' => 26,
            'D' => 22,
            'E' => 10,
            'F' => 12,
            'G' => 10,
            'H' => 12,
            'I' => 46, // link chứng minh
        ];
    }

    /** Định dạng số & phần trăm */
    public function columnFormats(): array
    {
        return [
            'E' => NumberFormat::FORMAT_NUMBER,          // KPI
            'F' => NumberFormat::FORMAT_NUMBER_00,       // Kết quả
            'G' => NumberFormat::FORMAT_PERCENTAGE_00,   // Tỷ lệ %
        ];
    }

    /** Style sau khi render Blade */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // Tìm hàng header của bảng KPI bằng cách dò "Hạng mục KPI" hoặc "STT"
                $headerRow = null;
                for ($r = 1; $r <= $highestRow; $r++) {
                    $a = (string)$sheet->getCell("A{$r}")->getValue();
                    $b = (string)$sheet->getCell("B{$r}")->getValue();
                    if (mb_stripos($b, 'Hạng mục KPI') !== false || mb_stripos($a, 'STT') !== false) {
                        $headerRow = $r;
                        break;
                    }
                }
                if (!$headerRow) {
                    // Không tìm thấy header – dừng styling để tránh sai lệch
                    return;
                }

                $dataStart = $headerRow + 1;
                $dataEnd   = $headerRow + max($this->kpiRowCount, 0);

                // ===== Header style (A:I) =====
                $headerRange = "A{$headerRow}:I{$headerRow}";
                $event->sheet->getStyle($headerRange)->applyFromArray([
                    'font' => ['bold' => true],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                        'wrapText'   => true,
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['argb' => $this->headerBg],
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['argb' => '999999'],
                        ],
                    ],
                ]);
                $sheet->getRowDimension($headerRow)->setRowHeight(22);

                if ($dataEnd >= $dataStart) {
                    // ===== Body borders & align (A:I) =====
                    $bodyRange = "A{$dataStart}:I{$dataEnd}";
                    $event->sheet->getStyle($bodyRange)->applyFromArray([
                        'alignment' => [
                            'vertical' => Alignment::VERTICAL_CENTER,
                            'wrapText' => true,
                        ],
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => Border::BORDER_THIN,
                                'color' => ['argb' => 'DDDDDD'],
                            ],
                        ],
                    ]);

                    // Căn trái: B (hạng mục KPI), C (hạng mục công việc), I (chứng minh)
                    foreach (['B', 'C', 'I'] as $col) {
                        $event->sheet->getStyle("{$col}{$dataStart}:{$col}{$dataEnd}")
                            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                    }

                    // Căn giữa: A (STT), D (thời gian), G (%), H (đánh giá)
                    foreach (['A', 'D', 'G', 'H'] as $col) {
                        $event->sheet->getStyle("{$col}{$dataStart}:{$col}{$dataEnd}")
                            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }

                    // Căn giữa số cho E (KPI), F (Kết quả)
                    foreach (['E', 'F'] as $col) {
                        $event->sheet->getStyle("{$col}{$dataStart}:{$col}{$dataEnd}")
                            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }

                    // Nền cam nhạt cho cột "Hạng mục KPI" (B)
                    $event->sheet->getStyle("B{$dataStart}:B{$dataEnd}")->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => $this->colKpiBg],
                        ],
                    ]);

                    // ===== Conditional formatting cho cột H (Đánh giá) =====
                    $condOk = new Conditional();
              $condOk->setConditionType(Conditional::CONDITION_EXPRESSION);
$condOk->setConditions(["EXACT(H{$dataStart},\"Đạt\")"]);
                $condOk->getStyle()->applyFromArray([
                    'font' => ['color' => ['argb' => 'FF1E7E34'], 'bold' => true],
                ]);

                $condBad = new Conditional();
            $condBad->setConditionType(Conditional::CONDITION_EXPRESSION);
$condBad->setConditions(["EXACT(H{$dataStart},\"Không đạt\")"]);
                $condBad->getStyle()->applyFromArray([
                    'font' => ['color' => ['argb' => 'FFC0392B'], 'bold' => true],
                ]);

                $sheet->getStyle("H{$dataStart}:H{$dataEnd}")->setConditionalStyles([
                    $condOk,
                    $condBad,
                ]);
                    // ===== Hyperlink cho cột I nếu là URL =====
                    for ($r = $dataStart; $r <= $dataEnd; $r++) {
                        $val = (string)$sheet->getCell("I{$r}")->getValue();
                        if (preg_match('~^https?://~i', trim($val))) {
                            $sheet->getCell("I{$r}")
                                  ->getHyperlink()->setUrl($val);
                            $event->sheet->getStyle("I{$r}")->applyFromArray([
                                'font' => ['color' => ['argb' => Color::COLOR_BLUE], 'underline' => true],
                            ]);
                        }
                    }
                }
                $rowStart = $dataEnd + 2;
$sheet->setCellValue("A{$rowStart}", "Danh sách link chứng minh");
$event->sheet->getStyle("A{$rowStart}")->applyFromArray([
    'font' => ['bold' => true],
]);

$r = $rowStart + 1;
foreach ($this->kpiRows as $idx => $row) {
    $links = $row['proof_links'] ?? [];
    if (empty($links)) continue;

    // Tiêu đề nhóm theo từng dòng KPI
    $title = "Hàng KPI #".($idx + 1)." — ".($row['task_title'] ?? '');
    $sheet->setCellValue("A{$r}", $title);
    $event->sheet->getStyle("A{$r}")->applyFromArray([
        'font' => ['bold' => true],
    ]);
    $r++;

    // Mỗi link 1 ô I{r} để click
    $stt = 1;
    foreach ($links as $link) {
        $sheet->setCellValue("I{$r}", "Link {$stt}");
        $sheet->getCell("I{$r}")->getHyperlink()->setUrl($link);
        $event->sheet->getStyle("I{$r}")->applyFromArray([
            'font' => [
                'color' => ['argb' => \PhpOffice\PhpSpreadsheet\Style\Color::COLOR_BLUE],
                'underline' => true
            ],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT],
        ]);
        $stt++;
        $r++;
    }

    $r++; // dòng trống ngăn cách nhóm
}
                // ===== Freeze header =====
                $sheet->freezePane("A" . ($headerRow + 1));

                // ===== Tô nền cam đậm cho dòng "THÁNG x.yyyy" (nếu có) sau bảng =====
                $highestRow2 = $sheet->getHighestRow();
                for ($r = $dataEnd + 1; $r <= min($dataEnd + 12, $highestRow2); $r++) {
                    $rowText = trim((string)$sheet->getCell("A{$r}")->getValue() . ' ' . (string)$sheet->getCell("B{$r}")->getValue());
                    if (preg_match('/THÁNG\s+\d{1,2}\.\d{4}/u', $rowText)) {
                        $event->sheet->getStyle("A{$r}:I{$r}")->applyFromArray([
                            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFF']],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['argb' => $this->footerBg],
                            ],
                            'alignment' => [
                                'horizontal' => Alignment::HORIZONTAL_LEFT,
                                'vertical'   => Alignment::VERTICAL_CENTER,
                            ],
                        ]);
                        break;
                    }
                }
            },
        ];
    }
}
