'use client'

import { motion } from 'framer-motion'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface ChartDataPoint {
  name: string
  count: number
  value?: number
}

interface VisitorTrendChartProps {
  data: ChartDataPoint[]
  title?: string
  subtitle?: string
  loading?: boolean
}

export default function VisitorTrendChart({ data, title = 'Visitor Trends', subtitle = 'Last 7 days', loading = false }: VisitorTrendChartProps) {
  const displayData = data.slice(-7).map(d => ({ ...d, value: d.count }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="h-[200px] bg-gray-50 rounded-xl animate-pulse" />
        ) : displayData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={displayData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitorTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B3D91" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0B3D91" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(220 10% 60%)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(220 10% 60%)' }}
                axisLine={false}
                tickLine={false}
                tickCount={5}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                strokeWidth={2}
                stroke="#0B3D91"
                fillOpacity={1}
                fill="url(#visitorTrendGradient)"
                dot={{ r: 4, fill: '#0B3D91' }}
                activeDot={{ r: 6, fill: '#1F6FEB' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400">
            <p className="text-sm">No trend data available</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
