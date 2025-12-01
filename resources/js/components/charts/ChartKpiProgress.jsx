import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const getMonthKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
};

export default function ChartKpiProgress() {
  const [kpis, setKpis] = useState([]);
  const [selectedKpiId, setSelectedKpiId] = useState(null);
  const [data, setData] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  // Tải danh sách KPI
  useEffect(() => {
    setLoadingList(true);
    fetch('/api/kpis')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load KPIs');
        return res.json();
      })
      .then(list => {
        const normalized = (list || []).map((kpi) => ({
          ...kpi,
          monthKey: getMonthKey(kpi.start_date),
          monthLabel: formatMonthLabel(kpi.start_date),
        }));

        const nowKey = getMonthKey(new Date());
        normalized.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        const currentIndex = normalized.findIndex(kpi => kpi.monthKey === nowKey);
        if (currentIndex > 0) {
          const [current] = normalized.splice(currentIndex, 1);
          normalized.unshift(current);
        }

        setKpis(normalized);
        const preferred = normalized[0];
        setSelectedKpiId(preferred ? String(preferred.id) : null);
        setListError(null);
      })
      .catch(() => {
        setListError('Không thể tải danh sách KPI.');
      })
      .finally(() => setLoadingList(false));
  }, []);

  // Tải dữ liệu KPI progress khi chọn KPI
  useEffect(() => {
    if (!selectedKpiId) return;

    fetch(`/api/dashboard/kpi-progress/${selectedKpiId}`)
      .then(res => {
        if (!res.ok) throw new Error("404 or server error");
        return res.json();
      })
      .then(setData)
      .catch(() => alert('Lỗi tải dữ liệu KPI progress!'));
  }, [selectedKpiId]);

  return (
    <div className="mt-4">
      <h5 className="mb-3"> Tiến độ KPI theo thời gian</h5>

      <div className="mb-3">
        <label className="form-label">Chọn KPI:</label>
        {loadingList ? (
          <div className="text-muted">Đang tải KPI...</div>
        ) : kpis.length === 0 ? (
          <div className="text-muted">Chưa có KPI nào trong hệ thống.</div>
        ) : (
          <select
            className="form-select"
            value={selectedKpiId || ''}
            onChange={e => setSelectedKpiId(e.target.value)}
          >
            {kpis.map(kpi => (
              <option key={kpi.id} value={kpi.id}>
                {kpi.name} — {kpi.monthLabel || 'Không rõ thời gian'}
              </option>
            ))}
          </select>
        )}
        {listError && <small className="text-danger d-block mt-1">{listError}</small>}
      </div>

      {selectedKpiId ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="day" />
            <YAxis domain={[0, 100]} tickFormatter={t => `${t}%`} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'expected') return [`${value}%`, 'Tiến độ kỳ vọng'];
                if (name === 'actual') return [`${value}%`, 'Tiến độ thực tế'];
                return [`${value}%`, name];
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="expected" stroke="#0d6efd" strokeWidth={3} name="Kỳ vọng" />
            <Line type="monotone" dataKey="actual" stroke="#198754" strokeWidth={3} name="Thực tế" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-muted">Hãy thêm và chọn một KPI để xem tiến độ.</div>
      )}
    </div>
  );
}
