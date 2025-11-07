import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const getRandomColor = () =>
  `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;

export default function ChartTaskByType() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/dashboard/tasks-by-type')
      .then(res => res.json())
      .then(rawData => {
        const normalized = rawData.map(item => ({
          ...item,
          type: item.type && item.type.trim() !== '' ? item.type : 'Không rõ',
          color: getRandomColor()
        }));
        setData(normalized);
      })
      .catch(() => alert('Lỗi tải dữ liệu loại task!'));
  }, []);

  return (
    <div className="mt-4">
      <h5 className="mb-3">Phân loại công việc</h5>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}`, 'Số lượng']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
