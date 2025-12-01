import React, { useEffect, useState } from 'react';
import Modal from '../Modal';

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPercentLabel = (value) => {
  const numeric = normalizeNumber(value);
  const rounded = Math.round(numeric * 100) / 100;
  return `${rounded.toFixed(2).replace(/\.00$/, '')}%`;
};

const evaluatePercent = (value) => {
  const percent = normalizeNumber(value);
  if (percent >= 80) return 'Đạt';
  if (percent <= 30) return 'Không đạt';
  return 'Chưa đạt';
};

export default function SummaryDetailModal({ summary, onClose, onSaveContent, onRegenerate, isOpen }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(summary.content || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(summary.content || '');
  }, [summary.id, summary.content]);

  useEffect(() => {
    setEditing(false);
  }, [summary.id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSaveContent(summary.id, content);
      setEditing(false);
    } catch (error) {
      console.error('Không thể lưu tổng kết', error);
      alert('Không thể lưu nội dung tổng kết!');
    } finally {
      setSaving(false);
    }
  };
  const handleExportExcel = () => {
    // Xuất theo ID của summary hiện tại
    window.open(`/summaries/${summary.id}/export`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      title={`Chi tiết tháng ${summary.month}`}
      onClose={onClose}
      footer={
        <>
          {editing ? (
            <>
              <button
                className="btn btn-success"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                Hủy
              </button>
            </>
          ) : (
            !summary.locked_at && (
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                Sửa
              </button>
            )
          )}
          <button className="btn btn-success" onClick={handleExportExcel}>
            Xuất Excel
          </button>
        </>
      }
    >
      <h6 className="fw-bold">Nội dung tổng kết</h6>
      {editing ? (
        <textarea
          className="form-control mb-3"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      ) : (
        <div className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>
          {summary.content || 'Chưa có nội dung'}
        </div>
      )}

      <h6 className="fw-bold">Danh sách công việc trong tháng</h6>
      {summary.tasks_cache?.length ? (
        <ul className="list-group mb-3">
          {summary.tasks_cache.map((task, i) => (
            <li key={i} className="list-group-item">
              <strong>{task.title}</strong> (Tiến độ: {task.progress})<br />
              <small>Ngày: {task.dates?.join(', ')}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>Không có task nào.</p>
      )}

      {summary.stats && (
        <div className="alert alert-secondary">
          <strong>Thống kê:</strong><br />
          Tổng số task: {summary.stats.total || 0}<br />
          Đã hoàn thành: {summary.stats.done || 0}<br />
          Chưa hoàn thành: {summary.stats.pending || 0}<br />
          Quá hạn: {summary.stats.overdue || 0}
        </div>
      )}
      {Array.isArray(summary.kpis) && summary.kpis.some(kpi => kpi.task_rows?.length) && (
        <>
          <h6 className="fw-bold mt-4">Đánh giá KPI</h6>
          {summary.kpis.map((kpi) => (
            kpi.task_rows?.length ? (
              <div key={kpi.id} className="mb-4">
                <p><strong>{kpi.name}</strong></p>
                <table className="table table-bordered small">
                  <thead>
                    <tr>
                      <th>Hạng mục KPI</th>
                      <th>Thời gian thực hiện</th>
                      <th>KPI</th>
                      <th>Số mục tiêu đạt được</th>
                      <th>Tỷ lệ %</th>
                      <th>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpi.task_rows.map((row, idx) => {
                      const target = normalizeNumber(row.target);
                      const actual = normalizeNumber(row.actual ?? row.result);
                      const percent = row.percent !== undefined ? row.percent : (target > 0 ? (actual / target) * 100 : 0);
                      const rating = row.evaluation || evaluatePercent(percent);

                      return (
                        <tr key={`${kpi.id}-${idx}`}>
                          <td>{row.task_title}</td>
                          <td>{row.time_range || 'Không có'}</td>
                          <td>{target}</td>
                          <td>{actual}</td>
                          <td>{formatPercentLabel(percent)}</td>
                          <td>{rating}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null
          ))}
        </>
      )}


    </Modal>
  );
}