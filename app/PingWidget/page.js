"use client";

import { useEffect, useState } from "react";

export default function PingWidget({ url = "/api/ping", interval = 5000 }) {
  const [ping, setPing] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let timer;

    async function checkPing() {
      const start = performance.now();
      try {
        await fetch(url, { cache: "no-store" });
        const end = performance.now();
        setPing(Math.round(end - start));
      } catch {
        setPing(null);
      }
    }

    checkPing();
    timer = setInterval(checkPing, interval);
    return () => clearInterval(timer);
  }, [url, interval, mounted]);

  if (!mounted) return null;

  // === Styling theo ping ===
  let color = "bg-green-500";
  let glow = "shadow-green-500/60";
  let label = ping !== null ? `${ping} ms` : "Offline";

  if (ping === null) {
    color = "bg-gray-400";
    glow = "shadow-gray-400/40";
  } else if (ping > 200) {
    color = "bg-red-500";
    glow = "shadow-red-500/60";
  } else if (ping > 100) {
    color = "bg-yellow-400";
    glow = "shadow-yellow-400/60";
  }

  return (
    <div className="fixed bottom-3 right-3 z-[9999] select-none">
      <div className="relative group flex items-center justify-center">
        {/* Chấm tròn */}
        <div
          className={`w-3 h-3 rounded-full ${color} shadow-md ${glow} cursor-pointer transition-all duration-300`}
        />

        {/* Tooltip */}
        <div
          className="absolute bottom-6 right-0 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 
                     bg-black/85 text-white text-xs px-2 py-1 rounded-lg shadow-lg 
                     whitespace-nowrap transition-all duration-200 pointer-events-none"
        >
          {label}
        </div>
      </div>
    </div>
  );
}
