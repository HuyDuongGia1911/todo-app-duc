import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ChartKpiProgress() {
  const [kpis, setKpis] = useState([]);
  const [selectedKpiId, setSelectedKpiId] = useState(null);
  const [data, setData] = useState([]);

  // Tải danh sách KPI
  useEffect(() => {
    fetch('/api/kpis')
      .then(res => res.json())
      .then(data => {
        setKpis(data);
        if (data.length > 0) {
          setSelectedKpiId(data[0].id); // chọn KPI đầu tiên mặc định
        }
      });
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
        <select className="form-select" value={selectedKpiId || ''} onChange={e => setSelectedKpiId(e.target.value)}>
          {kpis.map(kpi => (
            <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
          ))}
        </select>
      </div>

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
    </div>
  );
}
