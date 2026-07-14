"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import styles from "@/app/(dashboard)/mentor/analytics/analytics.module.css";
import { PlacementMetric } from "@/app/(dashboard)/mentor/analytics/analytics.interface";

interface PlacementDonutChartProps {
  data: PlacementMetric[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-slate-800 text-white rounded-md shadow-lg">
        <p>{`${payload[0].name}: ${payload[0].value} students`}</p>
      </div>
    );
  }
  return null;
};

export function PlacementDonutChart({ data }: PlacementDonutChartProps) {
  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="count"
            nameKey="status"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
