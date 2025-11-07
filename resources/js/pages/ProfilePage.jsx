import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: '',
    password: '',
    password_confirmation: '',
    avatar: null,
    current_avatar: '', // URL ảnh hiển thị
  });
  const [showPassword, setShowPassword] = useState(false);
const [showConfirm, setShowConfirm] = useState(false);


  useEffect(() => {
    fetch('/my-profile/info', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        setForm(prev => ({
          ...prev,
          name: data.name || '',
          password: '',
          avatar: null,
          current_avatar: data.avatar ? `/storage/${data.avatar}` : '',
        }));
      })
      .catch(console.error);
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = e => {
    setForm(prev => ({ ...prev, avatar: e.target.files[0] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', form.name);
    if (form.password) formData.append('password', form.password);
    if (form.avatar instanceof File) formData.append('avatar', form.avatar);
    if (form.password_confirmation)
  formData.append('password_confirmation', form.password_confirmation);
    fetch('/my-profile/update', {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
  },
  body: formData,
  credentials: 'include',
})
  .then(async res => {
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(JSON.stringify(errorData));
    }
    return res.json();
  })
.then(data => {
  Swal.fire({
    title: 'Thành công',
    text: 'Thông tin của bạn đã được cập nhật.',
    icon: 'success',
    timer: 1500,
    showConfirmButton: false
  }).then(() => {
    window.location.reload(); // 🔁 Reload lại toàn bộ trang và layout
  });
})
  .catch(err => {
    console.error('Lỗi cập nhật:', err.message);
    Swal.fire('Lỗi', 'Cập nhật thất bại: ' + err.message, 'error');
  });

  };

  return (
    <div className="container mt-5">
      <h2>Hồ sơ người dùng</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-3">
          <label className="form-label">Tên</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={form.name || ''}
            onChange={handleChange}
            required
          />
        </div>

       <div className="input-group">
  <input
    type={showPassword ? 'text' : 'password'}
    className="form-control"
    name="password"
    value={form.password || ''}
    onChange={handleChange}
  />
  <button
    type="button"
    className="btn btn-outline-secondary"
    onClick={() => setShowPassword(p => !p)}
    tabIndex={-1}
  >
    {showPassword ? 'Ẩn' : 'Hiện'}
  </button>
</div>

       <div className="input-group">
  <input
    type={showConfirm ? 'text' : 'password'}
    className="form-control"
    name="password_confirmation"
    value={form.password_confirmation}
    onChange={handleChange}
  />
  <button
    type="button"
    className="btn btn-outline-secondary"
    onClick={() => setShowConfirm(p => !p)}
    tabIndex={-1}
  >
    {showConfirm ? 'Ẩn' : 'Hiện'}
  </button>
</div>

        <div className="mb-3">
          <label className="form-label">Ảnh đại diện</label><br />
          {form.current_avatar && (
            <img
              src={form.current_avatar}
              alt="avatar"
              width="100"
              className="rounded-circle shadow-sm mb-2"
            />
          )}
          <input
            type="file"
            className="form-control"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <button type="submit" className="btn btn-primary">Cập nhật</button>
      </form>
    </div>
  );
}
