import React, { useState, useMemo } from 'react';
import Modal from '../Modal';

export default function SummaryDetailModal({ summary, onClose, onSaveContent, onRegenerate, isOpen }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(summary.content || '');
  const [selectedKpiId, setSelectedKpiId] = useState(null);
  const selectedKpi = summary.kpis?.find(kpi => kpi.id === selectedKpiId);
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
                onClick={() => onSaveContent(summary.id, content)}
              >
                Lưu
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
      {summary.kpis?.length > 0 && (
        <>
          <h6 className="fw-bold mt-4">Đánh giá KPI</h6>
          <p><strong>{summary.kpis[0].name}</strong></p>

          <table className="table table-bordered small">
            <thead>
              <tr>
                <th>Hạng mục KPI</th>
                <th>Thời gian thực hiện</th>
                <th>KPI</th>
                <th>Kết quả</th>
                <th>Tỷ lệ %</th>
                <th>Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {(summary.kpis[0].task_names_array || []).map((taskTitle, idx) => {
                const relatedTasks = summary.tasks_cache?.filter(t => t.title === taskTitle) || [];
                const dates = relatedTasks.flatMap(t => t.dates || []);
                const formattedDates = dates.length
                  ? `${dates[0]} - ${dates[dates.length - 1]}`
                  : 'Không có';
                const resultCount = relatedTasks.reduce((sum, t) => sum + (parseFloat(t.progress || 0)), 0);
                const target = summary.kpis[0].task_targets?.[taskTitle] || 0;
                const percent = target > 0 ? Math.round((resultCount / target) * 100) : 0;
                const note = percent >= 100 ? 'Đạt' : 'Không đạt';

                return (
                  <tr key={idx}>
                    <td>{taskTitle}</td>
                    <td>{formattedDates}</td>
                    <td>{target}</td>
                    <td>{resultCount}</td>
                    <td>{percent}%</td>
                    <td>{note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}


    </Modal>
  );
}