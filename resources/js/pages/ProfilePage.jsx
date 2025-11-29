import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/initials/svg?seed=user';

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    avatar: null,
    current_avatar: '',
    created_at: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/my-profile/info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
      signal: controller.signal,
    })
      .then(res => res.json())
      .then(data => {
        setForm(prev => ({
          ...prev,
          name: data.name || '',
          email: data.email || '',
          password: '',
          password_confirmation: '',
          avatar: null,
          current_avatar: data.avatar ? `/storage/${data.avatar}` : '',
          created_at: data.created_at || '',
        }));
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm(prev => ({ ...prev, avatar: null }));
      setPreviewUrl('');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setForm(prev => ({ ...prev, avatar: file }));
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append('name', form.name);
    if (form.password) formData.append('password', form.password);
    if (form.password_confirmation) {
      formData.append('password_confirmation', form.password_confirmation);
    }
    if (form.avatar instanceof File) {
      formData.append('avatar', form.avatar);
    }

    fetch('/my-profile/update', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
      },
      body: formData,
      credentials: 'include',
    })
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData?.message || 'Đã có lỗi xảy ra');
        }
        return res.json();
      })
      .then(() => {
        Swal.fire({
          title: 'Thành công',
          text: 'Thông tin của bạn đã được cập nhật.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        }).then(() => window.location.reload());
      })
      .catch(err => {
        console.error('Lỗi cập nhật:', err);
        Swal.fire('Lỗi', err.message || 'Cập nhật thất bại', 'error');
      })
      .finally(() => setSaving(false));
  };

  const formatDate = value => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (err) {
      return value;
    }
  };

  const accountAge = useMemo(() => {
    if (!form.created_at) return '0+ tháng';
    const created = new Date(form.created_at);
    const diff = Date.now() - created.getTime();
    const months = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 30)));
    return `${months}+ tháng`;
  }, [form.created_at]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-hero profile-hero--skeleton" />
        <div className="profile-grid">
          <div className="profile-card profile-card--skeleton" />
          <div className="profile-card profile-card--skeleton" />
        </div>
      </div>
    );
  }

  const avatarToShow = previewUrl || form.current_avatar || DEFAULT_AVATAR;

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero__content">
          <span className="profile-hero__eyebrow">Xin chào, {form.name || 'bạn'} ✨</span>
          <h1>Hồ sơ cá nhân</h1>
          <p>Cập nhật thông tin để đồng bộ trên toàn bộ dashboard và giúp đồng nghiệp nhận diện bạn dễ dàng hơn.</p>
        </div>
        <div className="profile-hero__stats">
          <div className="profile-pill">
            <span>Ngày tham gia</span>
            <strong>{formatDate(form.created_at)}</strong>
          </div>
          <div className="profile-pill">
            <span>Thâm niên</span>
            <strong>{accountAge}</strong>
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-card profile-card--highlight">
          <div className="profile-avatar">
            <img src={avatarToShow} alt="avatar" />
            <label className="profile-upload-button">
              <input type="file" accept="image/*" onChange={handleFileChange} />
              Đổi ảnh
            </label>
          </div>
          <div className="profile-quick-info">
            <h3>{form.name || 'Chưa có tên'}</h3>
            <p>{form.email || '—'}</p>
            <ul>
              <li>
                <span className="label">Trạng thái</span>
                <span className="value success">Đang hoạt động</span>
              </li>
              <li>
                <span className="label">Bảo mật</span>
                <span className="value">Mật khẩu đã mã hoá</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="profile-card profile-card--form">
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="profile-section">
              <div>
                <p className="section-eyebrow">Thông tin cơ bản</p>
                <h3>Cập nhật nhanh</h3>
              </div>
              <div className="profile-form-grid">
                <div className="profile-field">
                  <label>Họ tên</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="profile-field">
                  <label>Email</label>
                  <input type="email" value={form.email} disabled />
                  <small>Email được quản trị viên quản lý</small>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <div>
                <p className="section-eyebrow">Bảo mật</p>
                <h3>Đặt lại mật khẩu</h3>
              </div>
              <div className="profile-field">
                <label>Mật khẩu mới</label>
                <div className="profile-password-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu mới"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>
              <div className="profile-field">
                <label>Nhập lại mật khẩu</label>
                <div className="profile-password-group">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="password_confirmation"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    placeholder="Xác nhận mật khẩu"
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <div>
                <p className="section-eyebrow">Ảnh đại diện</p>
                <h3>Tạo dấu ấn cá nhân</h3>
              </div>
              <p className="text-muted mb-3">
                Chọn ảnh có định dạng .jpg, .jpeg, .png với kích thước tối đa 2MB. Nên dùng ảnh vuông để hiển thị đẹp nhất.
              </p>
              <label className="profile-upload-inline">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                Tải ảnh từ thiết bị
              </label>
            </div>

            <div className="profile-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
