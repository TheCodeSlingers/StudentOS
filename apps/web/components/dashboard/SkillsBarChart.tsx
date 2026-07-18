"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  TooltipContentProps,
} from "recharts";

import styles from "@/app/(dashboard)/mentor/analytics/analytics.module.css";
import { SkillMetric } from "@/app/(dashboard)/mentor/analytics/analytics.interface";

interface SkillsBarChartProps {
  data: SkillMetric[];
}

const CustomTooltip = ({ active, payload, label }: Partial<TooltipContentProps<number, string>>) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-slate-800 text-white rounded-md shadow-lg">
        <p>{`${label}: ${payload[0].value} students`}</p>
      </div>
    );
  }
  return null;
};

export function SkillsBarChart({ data }: SkillsBarChartProps) {
  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis type="number" stroke="var(--color-text-muted)" />
          <YAxis
            type="category"
            dataKey="skill"
            stroke="var(--color-text-muted)"
            width={80}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-hover)" }}
            content={<CustomTooltip />}
          />
          <Bar
            dataKey="count"
            fill="var(--color-primary)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
