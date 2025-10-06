"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function UserFinanceChartPage({ user }) {
  const userId = user?.id;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("day"); // 1h | 2h | 4h | day | week

  // --- Hàm format số viết tắt (cho trục Y & Legend)
  const formatNumberShort = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return num?.toString() || "0";
  };

  // --- Gom mẫu theo 5 phút
  const groupBy5Min = (rows) => {
    const result = {};
    rows.forEach((row) => {
      const time = new Date(row.created_at);
      const block =
        Math.floor(time.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000);

      if (
        !result[block] ||
        new Date(row.created_at) > new Date(result[block].created_at)
      ) {
        result[block] = row;
      }
    });
    return Object.values(result).sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  };

  // --- Fetch dữ liệu ban đầu
  const fetchData = async () => {
    if (!userId) return;

    try {
      const { data: rows, error } = await supabase
        .from("financial_history")
        .select("id, user_id, coin, balance, accrued_interest, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formatted = (rows || []).map((d) => ({
        created_at: new Date(d.created_at),
        coin: Number(d.coin || 0),
        balance: Number(d.balance || 0),
        accrued_interest: Number(d.accrued_interest || 0),
      }));

      // thêm trường total
      formatted.forEach((d) => {
        d.total = d.coin + d.balance + d.accrued_interest;
      });

      setData(groupBy5Min(formatted));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Lần đầu + Realtime
  useEffect(() => {
    fetchData();

    if (!userId) return;

    const subscription = supabase
      .channel("finance-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "financial_history" },
        (payload) => {
          if (payload.new.user_id !== userId) return;
          const d = payload.new;
          const point = {
            created_at: new Date(d.created_at),
            coin: Number(d.coin || 0),
            balance: Number(d.balance || 0),
            accrued_interest: Number(d.accrued_interest || 0),
          };
          point.total = point.coin + point.balance + point.accrued_interest;

          setData((prev) => groupBy5Min([...prev, point]));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [userId]);

  // --- Filter theo timeRange
  const filterByRange = (data) => {
    if (!data.length) return [];
    const now = new Date();
    let startDate;

    if (timeRange.endsWith("h")) {
      const hours = parseInt(timeRange);
      startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
    } else {
      switch (timeRange) {
        case "day":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 1);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        default:
          startDate = new Date(0);
      }
    }

    return data.filter((d) => d.created_at >= startDate);
  };

  const filteredData = useMemo(() => filterByRange(data), [data, timeRange]);

  if (!userId)
    return (
      <p className="text-center mt-4 text-gray-400">
        Please login to see finance chart.
      </p>
    );
  if (loading)
    return <p className="text-center mt-4 text-gray-400">Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-gray-100 min-h-screen rounded-xl">
      <h2 className="text-2xl font-bold text-center mb-6">
        📊 User Finance Chart
      </h2>

      {/* Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {["1h", "2h", "4h", "day", "week"].map((range) => (
          <button
            key={range}
            className={`px-4 py-2 rounded-lg border transition ${
              timeRange === range
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
            }`}
            onClick={() => setTimeRange(range)}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
        <ResponsiveContainer width="100%" height={450}>
          <LineChart
            data={filteredData}
            margin={{ top: 20, right: 40, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="created_at"
              tick={{ fill: "#9CA3AF" }}
              tickFormatter={(d) => {
                const date = new Date(d);
                if (timeRange.endsWith("h")) {
                  return date.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                }
                if (timeRange === "day") {
                  return date.toLocaleTimeString("en-GB", { hour: "2-digit" });
                }
                if (timeRange === "week") {
                  return date.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                }
                return date.toLocaleString();
              }}
            />
            <YAxis tick={{ fill: "#9CA3AF" }} tickFormatter={formatNumberShort} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F3F4F6",
              }}
              labelFormatter={(d) => new Date(d).toLocaleString()}
              formatter={(value) => value.toLocaleString()}
            />
            <Legend
              verticalAlign="top"
              height={40}
              wrapperStyle={{ color: "#E5E7EB" }}
            />

            <Line
              type="monotone"
              dataKey="accrued_interest"
              stroke="#f59e0b"
              dot={false}
            />
            <Line type="monotone" dataKey="balance" stroke="#10b981" dot={false} />
            <Line type="monotone" dataKey="coin" stroke="#3b82f6" dot={false} />
            <Line type="monotone" dataKey="total" stroke="#ef4444" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
