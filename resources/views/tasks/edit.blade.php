@extends('layouts.app')

@section('content')
<h1>Sửa công việc</h1>

<form method="POST" action="{{ route('tasks.update', $task->id) }}">
    @csrf
    @method('PUT')
    <input type="hidden" name="redirect_back" value="{{ route('tasks.index') }}">

    <div class="mb-3">
        <label>Ngày:</label>
        <input type="date" name="task_date" class="form-control" value="{{ $task->task_date }}">
    </div>

    @foreach ([
        ['name' => 'shift', 'label' => 'Ca', 'api' => '/api/shifts', 'field' => 'shift_name', 'title' => 'Quản lý Ca Làm', 'value' => $task->shift],
        ['name' => 'type', 'label' => 'Loại', 'api' => '/api/types', 'field' => 'type_name', 'title' => 'Quản lý Loại Task', 'value' => $task->type],
        ['name' => 'title', 'label' => 'Tên task', 'api' => '/api/titles', 'field' => 'title_name', 'title' => 'Quản lý Tên Task', 'value' => $task->title],
        ['name' => 'supervisor', 'label' => 'Người phụ trách', 'api' => '/api/supervisors', 'field' => 'supervisor_name', 'title' => 'Quản lý Người phụ trách', 'value' => $task->supervisor],
        ] as $dropdown)
        <div class="mb-3">
            <label>{{ $dropdown['label'] }}:</label>
            <div class="input-group">
                <select name="{{ $dropdown['name'] }}" class="form-control" id="{{ $dropdown['name'] }}-select"
                    data-api="{{ $dropdown['api'] }}"
                    data-field="{{ $dropdown['field'] }}"
                    data-title="{{ $dropdown['title'] }}">
                </select>
                <button type="button" class="btn btn-outline-secondary"
                    onclick="openManageModal('{{ $dropdown['api'] }}', '{{ $dropdown['field'] }}', '{{ $dropdown['title'] }}')">
                    ⚙️
                </button>
            </div>
        </div>
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                setupDropdown('{{ $dropdown['name'] }}-select', '{{ $dropdown['api'] }}', '{{ $dropdown['field'] }}', '{{ $dropdown['title'] }}', '{{ $dropdown['value'] }}');
            });
        </script>
    @endforeach
<div class="mb-3">
    <label>Mức độ ưu tiên:</label>
    <select name="priority" class="form-control">
        <option value="Khẩn cấp" {{ $task->priority === 'Khẩn cấp' ? 'selected' : '' }}>Khẩn cấp</option>
        <option value="Cao" {{ $task->priority === 'Cao' ? 'selected' : '' }}>Cao</option>
        <option value="Trung bình" {{ $task->priority === 'Trung bình' ? 'selected' : '' }}>Trung bình</option>
        <option value="Thấp" {{ $task->priority === 'Thấp' ? 'selected' : '' }}>Thấp</option>
    </select>
</div>

    <div class="mb-3">
        <label>Tiến độ:</label>
        <input type="number" name="progress" class="form-control" value="{{ $task->progress }}">
    </div>

    <div class="mb-3">
        <label>Chi tiết:</label>
        <textarea name="detail" class="form-control" rows="2">{{ $task->detail }}</textarea>
    </div>

    <div class="mb-3">
        <label>File link (cách nhau bằng dấu phẩy ,):</label>
        <input type="text" name="file_link" class="form-control" value="{{ $task->file_link }}">
    </div>

    <button type="submit" class="btn btn-primary">Cập nhật</button>
</form>

<!-- Modal quản lý dùng chung -->
<div class="modal fade" id="manageModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="manageModalTitle">Quản lý</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="manageModalBody">
                <!-- JS sẽ load -->
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

<script>
function setupDropdown(selectId, apiUrl, fieldName, modalTitle, selectedValue = '') {
    const select = $('#' + selectId);

    async function loadOptions() {
        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            select.empty();
            data.forEach(item => select.append(new Option(item[fieldName], item[fieldName])));
            select.select2({ tags: true, placeholder: 'Chọn hoặc nhập...', width: '100%' });

            if (selectedValue) {
                select.val(selectedValue).trigger('change');
            }
        } catch { alert('Lỗi khi load dữ liệu!'); }
    }

    select.off('select2:select').on('select2:select', async (e) => {
        const value = e.params.data.id;
        const exists = Array.from(select[0].options).some(opt => opt.value === value);
        if (!exists && confirm(`Thêm mới: "${value}"?`)) {
            await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
                body: JSON.stringify({ [fieldName]: value })
            });
            await loadOptions();
            alert('Đã thêm!');
        }
    });

    loadOptions();
}

function openManageModal(apiUrl, fieldName, title) {
    document.getElementById('manageModalTitle').textContent = title;
    const body = document.getElementById('manageModalBody');
    body.innerHTML = 'Đang tải...';

    fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
            body.innerHTML = '';
            data.forEach(item => {
                const div = document.createElement('div');
                div.classList.add('d-flex', 'align-items-center', 'mb-2');
                div.innerHTML = `
                    <input type="text" class="form-control me-2" value="${item[fieldName]}" onchange="updateItem('${apiUrl}', ${item.id}, '${fieldName}', this.value)">
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('${apiUrl}', ${item.id})">Xóa</button>
                `;
                body.appendChild(div);
            });
        })
        .catch(() => { body.innerHTML = 'Lỗi khi tải!'; });

    new bootstrap.Modal(document.getElementById('manageModal')).show();
}

async function updateItem(apiUrl, id, fieldName, value) {
    await fetch(`${apiUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
        body: JSON.stringify({ [fieldName]: value })
    });
    alert('Đã cập nhật!');
}

async function deleteItem(apiUrl, id) {
    if (!confirm('Xóa mục này?')) return;
    await fetch(`${apiUrl}/${id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': '{{ csrf_token() }}' } });
    alert('Đã xoá!');
}
</script>
@endsection
