import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Form, Spinner } from 'react-bootstrap';

interface AttachmentMeta {
  name: string;
  url?: string;
  size?: number;
  mime?: string;
}

interface ActivityLog {
  id: number;
  title: string;
  content?: string;
  tags: string[];
  attachments: AttachmentMeta[];
  logged_at?: string;
  synced_summary_id?: number | null;
}

interface Meta {
  current_page: number;
  last_page: number;
  total: number;
}

const nowLocal = () => new Date().toISOString().slice(0, 16);

export default function ActivityJournalPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [meta, setMeta] = useState<Meta>({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ month: new Date().toISOString().slice(0, 7), keyword: '' });
  const [page, setPage] = useState(1);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [form, setForm] = useState({ title: '', content: '', logged_at: nowLocal() });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters.month, filters.keyword]);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/activity-logs', {
        params: {
          month: filters.month || undefined,
          keyword: filters.keyword || undefined,
          page,
        },
      });
      setLogs(res.data?.data || []);
      setMeta({
        current_page: res.data?.current_page ?? 1,
        last_page: res.data?.last_page ?? 1,
        total: res.data?.total ?? 0,
      });
    } catch (err) {
      console.error(err);
      setError('Không thể tải nhật ký.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append('title', form.title);
      if (form.content) payload.append('content', form.content);
      if (form.logged_at) payload.append('logged_at', new Date(form.logged_at).toISOString());
      tags.forEach((tag, idx) => payload.append(`tags[${idx}]`, tag));
      if (files) {
        Array.from(files).forEach(file => payload.append('attachments[]', file));
      }
      await axios.post('/activity-logs', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm({ title: '', content: '', logged_at: nowLocal() });
      setTags([]);
      setFiles(null);
      await loadLogs();
    } catch (err) {
      console.error(err);
      setError('Không thể lưu nhật ký.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xoá ghi chép này?')) return;
    try {
      await axios.delete(`/activity-logs/${id}`);
      setLogs(prev => prev.filter(log => log.id !== id));
      setMeta(meta => ({ ...meta, total: Math.max(0, meta.total - 1) }));
    } catch (err) {
      console.error(err);
      alert('Không thể xoá ghi chép.');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(event.target.files);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags(prev => [...prev, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const canSubmit = form.title.trim().length > 0 && !saving;

  const monthLabel = useMemo(() => new Date(`${filters.month}-01`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }), [filters.month]);

  return (
    <div className="activity-journal-page">
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 className="mb-1">Nhật ký hoạt động</h3>
              <p className="text-muted mb-0">Ghi chú nhanh, đính kèm bằng chứng và tự động chèn vào báo cáo tháng.</p>
            </div>
            <div className="text-end">
              <Form.Select
                value={filters.month}
                onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                style={{ width: 160 }}
              >
                {Array.from({ length: 12 }).map((_, idx) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - idx);
                  const value = date.toISOString().slice(0, 7);
                  return (
                    <option key={value} value={value}>
                      {date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                    </option>
                  );
                })}
              </Form.Select>
            </div>
          </div>

          <Form onSubmit={handleSubmit} className="activity-form">
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Label className="fw-semibold">Tiêu đề *</Form.Label>
                <Form.Control
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ví dụ: Hoàn tất kiểm thử module A"
                  required
                />
              </div>
              <div className="col-md-3">
                <Form.Label className="fw-semibold">Thời gian</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={form.logged_at}
                  onChange={(e) => setForm(prev => ({ ...prev, logged_at: e.target.value }))}
                />
              </div>
              <div className="col-md-3">
                <Form.Label className="fw-semibold">Tags</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Ví dụ: Họp, Triển khai"
                  />
                  <Button variant="secondary" type="button" onClick={addTag}>Thêm</Button>
                </div>
                <div className="mt-2 d-flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="badge bg-light text-dark">
                      {tag}
                      <button type="button" className="btn btn-sm btn-link text-danger ms-1 p-0" onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-12">
                <Form.Label className="fw-semibold">Nội dung</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Ghi chú chi tiết, link tài liệu..."
                />
              </div>
              <div className="col-md-6">
                <Form.Label className="fw-semibold">Đính kèm (tùy chọn)</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleFileChange}
                />
                <small className="text-muted">Tối đa 10MB mỗi file.</small>
              </div>
              <div className="col-md-6 d-flex align-items-end justify-content-end">
                <Button type="submit" disabled={!canSubmit} className="btn btn-primary px-4">
                  {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                  Lưu nhật ký
                </Button>
              </div>
            </div>
          </Form>
          {error && <div className="alert alert-danger mt-3">{error}</div>}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">Ghi chép {monthLabel}</h5>
              <p className="text-muted mb-0">{meta.total} mục</p>
            </div>
            <Form.Control
              placeholder="Tìm kiếm tiêu đề..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              style={{ maxWidth: 220 }}
            />
          </div>

          {loading ? (
            <div className="text-center my-5"><Spinner animation="border" /></div>
          ) : logs.length === 0 ? (
            <p className="text-muted">Chưa có ghi chép nào trong tháng.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {logs.map(log => (
                <li key={log.id} className="list-group-item px-0">
                  <div className="d-flex justify-content-between gap-3 flex-wrap">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h6 className="mb-1">{log.title}</h6>
                        {log.synced_summary_id && <span className="badge bg-success">Đã chèn báo cáo</span>}
                      </div>
                      <div className="text-muted small mb-2">
                        {log.logged_at ? new Date(log.logged_at).toLocaleString('vi-VN') : 'Không rõ thời gian'}
                      </div>
                      {log.tags?.length > 0 && (
                        <div className="mb-2 d-flex flex-wrap gap-2">
                          {log.tags.map(tag => (
                            <span key={tag} className="badge bg-light text-dark">{tag}</span>
                          ))}
                        </div>
                      )}
                      {log.content && <p className="mb-2">{log.content}</p>}
                      {log.attachments?.length > 0 && (
                        <div className="d-flex flex-column">
                          {log.attachments.map((file, idx) => (
                            <a key={idx} href={file.url} target="_blank" rel="noopener" className="small">
                              📎 {file.name || 'File đính kèm'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Button variant="link" className="text-danger p-0" onClick={() => handleDelete(log.id)}>Xoá</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {meta.last_page > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span>Trang {meta.current_page}/{meta.last_page}</span>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage(1)}
                >
                  « Đầu
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ‹ Trước
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                >
                  Sau ›
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage(meta.last_page)}
                >
                  Cuối »
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
