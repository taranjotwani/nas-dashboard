import React, { useEffect, useState } from 'react';
import { Play, Square, Terminal } from 'lucide-react';

const POLL_INTERVAL_MS = 10_000;

const RunnerCard = () => {
  const [running, setRunning] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchStatus() {
    try {
      const res = await fetch('/api/runner/status');
      const data = await res.json();
      setRunning(data.running);
      setStatus(data.status);
      setError('');
    } catch (err) {
      setError('Failed to fetch runner status');
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (!cancelled) await fetchStatus();
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/runner/start', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to start runner');
      }
      await fetchStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/runner/stop', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to stop runner');
      }
      await fetchStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusDot = running
    ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm'
    : 'bg-zinc-500';
  const statusText = running
    ? 'Running'
    : status === 'NotFound'
      ? 'Service not found'
      : 'Stopped';
  const statusColor = running ? 'text-emerald-400' : 'text-zinc-400';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Terminal size={18} className="text-emerald-400" />
          <h2 className="text-lg font-semibold text-emerald-300">Actions Runner</h2>
          {running === null ? (
            <span className="text-sm text-zinc-400">Loading...</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${statusDot}`} />
              <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStart}
            disabled={loading || running === true}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={14} />
            Start Runner
          </button>
          <button
            onClick={handleStop}
            disabled={loading || running === false || running === null}
            className="flex items-center gap-2 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Square size={14} />
            Stop Runner
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
};

export default RunnerCard;
