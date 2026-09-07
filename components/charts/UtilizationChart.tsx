"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UtilizationPoint } from "@/lib/types";

export function UtilizationChart({ data }: { data: UtilizationPoint[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        >
          <defs>
            <linearGradient id="utilFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#37B5A8" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#37B5A8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#242A32" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#6B7480"
            tick={{ fontSize: 11, fill: "#6B7480" }}
            tickLine={false}
            axisLine={{ stroke: "#242A32" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="#6B7480"
            tick={{ fontSize: 11, fill: "#6B7480" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: "#2E3540", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "#12151A",
              border: "1px solid #2E3540",
              borderRadius: 4,
              fontSize: 12,
              color: "#E6E9ED",
            }}
            labelStyle={{ color: "#9BA5B1", marginBottom: 2 }}
            formatter={(value: number) => [`${value}%`, "Utilization"]}
          />
          <Area
            type="monotone"
            dataKey="utilization"
            stroke="#37B5A8"
            strokeWidth={1.75}
            fill="url(#utilFill)"
            dot={false}
            activeDot={{ r: 3, fill: "#37B5A8", stroke: "#0B0D10" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
