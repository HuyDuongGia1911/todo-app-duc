@extends('layouts.app')

@section('content')
  <div id="kpi-app"
       data-kpis='@json($kpis)'
       data-filters='@json(["start_date" => request("start_date"), "end_date" => request("end_date")])'>
  </div>
@endsection


@section('scripts')
<script>
function updateKPIStatus(kpiId, statusValue) {
    fetch(`/kpis/${kpiId}/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': '{{ csrf_token() }}'
        },
        body: JSON.stringify({ status: statusValue })
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(() => {
        const row = document.getElementById(`kpi-row-${kpiId}`);
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        if (statusValue === 'Đã hoàn thành') {
            row.classList.add('opacity-50');
            editBtn.disabled = true;
            deleteBtn.disabled = true;
        } else {
            row.classList.remove('opacity-50');
            editBtn.disabled = false;
            deleteBtn.disabled = false;
        }
    })
    .catch(() => alert('Lỗi khi cập nhật trạng thái KPI!'));
}
</script>
<style>
/* Switch toggle (Uiverse - mobinkakei) */
.toggler {
  width: 72px;
  margin: auto;
}

.toggler input {
  display: none;
}

.toggler label {
  display: block;
  position: relative;
  width: 72px;
  height: 36px;
  border: 1px solid #d6d6d6;
  border-radius: 36px;
  background: #e4e8e8;
  cursor: pointer;
}

.toggler label::after {
  display: block;
  position: absolute;
  top: 50%;
  left: 25%;
  width: 26px;
  height: 26px;
  background-color: #d7062a;
  content: '';
  border-radius: 100%;
  transform: translate(-50%, -50%);
  transition: 0.25s ease-in-out;
  animation: toggler-size 0.15s ease-out forwards;
}

.toggler input:checked + label::after {
  background-color: #50ac5d;
  left: 75%;
  animation-name: toggler-size2;
}

.toggler label .toggler-on,
.toggler label .toggler-off {
  position: absolute;
  top: 50%;
  left: 25%;
  width: 26px;
  height: 26px;
  transform: translate(-50%, -50%);
  transition: all 0.15s ease-in-out;
  z-index: 2;
}

.toggler .toggler-on,
.toggler .toggler-off {
  opacity: 1;
}

.toggler input:checked + label .toggler-off,
.toggler input:not(:checked) + label .toggler-on {
  width: 0;
  height: 0;
  opacity: 0;
}

.toggler .path {
  fill: none;
  stroke: #fff;
  stroke-width: 7px;
  stroke-linecap: round;
  stroke-miterlimit: 10;
}

@keyframes toggler-size {
  0%, 100% { width: 26px; height: 26px; }
  50% { width: 20px; height: 20px; }
}

@keyframes toggler-size2 {
  0%, 100% { width: 26px; height: 26px; }
  50% { width: 20px; height: 20px; }
}
</style>
@endsection
