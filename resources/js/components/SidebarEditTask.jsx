import React, { useEffect, useState } from 'react';
import AsyncDropdownSelect from '../components/AsyncDropdownSelect'; // thay bằng đường dẫn đúng

function DropdownSelect({ label, name, field, api, value, onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    fetch(api)
      .then(res => res.json())
      .then(data => setOptions(data))
      .catch(err => console.error(`Lỗi khi load ${label}:`, err));
  }, [api]);

  return (
    <div className="mb-2">
      <label className="form-label">{label}</label>
      <select name={name} className="form-select" value={value || ''} onChange={onChange}>
        <option value="">-- Chọn --</option>
        {options.map((item, i) => (
          <option key={i} value={item[field]}>{item[field]}</option>
        ))}
      </select>
    </div>
  );
}

export default function SidebarEditTask({ task, onClose, onSave }) {
  const [form, setForm] = useState({ ...task });

  useEffect(() => {
    setForm({ ...task });
  }, [task]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await fetch(`/tasks/${task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrf
      },
      body: JSON.stringify(form)
    });

    if (!res.ok) {
      const errText = await res.text(); // 👈 lấy lỗi rõ ràng
      console.error('LỖI SERVER:', errText);
      throw new Error('Update failed');
    }

    const updatedTask = await res.json();
    onSave(updatedTask);
  } catch (err) {
    alert('Lỗi khi cập nhật task!');
    console.error(err);
  }
};

   return (
   <div
    className="position-fixed top-0 end-0 bg-white border-start shadow d-flex flex-column"
    style={{
      width: '360px',
      height: '100vh',       // cố định chiều cao toàn trang
      zIndex: 1050,          // đảm bảo hiển thị trên mọi thành phần
    }}
  >
      {/* Header cố định */}
      <div className="p-3 border-bottom">
        <h5 className="mb-0">Chỉnh sửa công việc</h5>
      </div>

      {/* Body cuộn được */}
      <div className="flex-grow-1 overflow-auto px-3 py-2">
        <div className="mb-2">
          <label className="form-label">Ngày</label>
          <input type="date" className="form-control" name="task_date" value={form.task_date || ''} onChange={handleChange} />
        </div>
        <div className="mb-2">
  <label className="form-label">Hạn hoàn thành (Deadline)</label>
  <input
    type="date"
    className="form-control"
    name="deadline_at"
    value={form.deadline_at || ''}
    onChange={handleChange}
  />
</div>


<AsyncDropdownSelect
          label="Ca" name="shift" field="shift_name" api="/api/shifts"
          value={form.shift} onChange={handleChange} creatable
        />
        <AsyncDropdownSelect
          label="Loại" name="type" field="type_name" api="/api/types"
          value={form.type} onChange={handleChange} creatable
        />
        <AsyncDropdownSelect
          label="Tên task" name="title" field="title_name" api="/api/titles"
          value={form.title} onChange={handleChange} creatable
        />
        <AsyncDropdownSelect
          label="Người phụ trách" name="supervisor" field="supervisor_name" api="/api/supervisors"
          value={form.supervisor} onChange={handleChange} creatable
        />

          {/* Mức độ ưu tiên: KHÔNG CHO THÊM MỚI */}
        <div className="mb-2">
          <label className="form-label">Mức độ ưu tiên</label>
          <select name="priority" className="form-select" value={form.priority || ''} onChange={handleChange}>
            <option value="">-- Chọn --</option>
            <option value="Khẩn cấp">Khẩn cấp</option>
            <option value="Cao">Cao</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Thấp">Thấp</option>
          </select>
        </div>

        <div className="mb-2">
          <label className="form-label">Tiến độ</label>
          <input type="number" className="form-control" name="progress" value={form.progress || 0} onChange={handleChange} />
        </div>

        <div className="mb-2">
          <label className="form-label">Chi tiết</label>
          <textarea className="form-control" name="detail" rows={2} value={form.detail || ''} onChange={handleChange} />
        </div>

        <div className="mb-3">
          <label className="form-label">File link (ngăn cách bằng dấu phẩy)</label>
          <input type="text" className="form-control" name="file_link" value={form.file_link || ''} onChange={handleChange} />
        </div>
      </div>

      {/* Footer cố định */}
      <div className="p-3 border-top d-flex justify-content-between">
        <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Lưu</button>
      </div>
    </div>
  );
}