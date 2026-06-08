import React, { useEffect, useState } from 'react';
import { Cpu, MemoryStick } from 'lucide-react';

const POLL_INTERVAL_MS = 60_000;

function formatBytes(bytes) {
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
}

function UsageBar({ percent }) {
  const color =
    percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="h-2 w-full rounded-full bg-zinc-700">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const SystemUsageCard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const response = await fetch('/api/system/stats');
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setStats(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to fetch system stats.');
        }
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold text-emerald-300">System Usage</h2>

      {error ? (
        <div className="rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-red-300">
          {error}
        </div>
      ) : !stats ? (
        <div className="text-zinc-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* CPU */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-300">
              <Cpu size={16} className="text-emerald-400" />
              <span className="text-sm font-medium">CPU</span>
              <span className="ml-auto text-sm font-semibold text-zinc-100">{stats.cpu}%</span>
            </div>
            <UsageBar percent={stats.cpu} />
          </div>

          {/* Memory */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-300">
              <MemoryStick size={16} className="text-emerald-400" />
              <span className="text-sm font-medium">Memory</span>
              <span className="ml-auto text-sm font-semibold text-zinc-100">
                {formatBytes(stats.memory.usedBytes)} / {formatBytes(stats.memory.totalBytes)}
              </span>
            </div>
            <UsageBar percent={stats.memory.usedPercent} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemUsageCard;
