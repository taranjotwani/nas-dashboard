import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Play, Square, Terminal } from 'lucide-react';

const POLL_INTERVAL_MS = 10_000;
const LOG_POLL_INTERVAL_MS = 5_000;

const RunnerCard = () => {
  const [running, setRunning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [logFile, setLogFile] = useState('');
  const logBoxRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/runner/status');
      const data = await res.json();
      setRunning(data.running);
      setError('');
    } catch {
      setError('Failed to fetch runner status');
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/runner/logs');
      const data = await res.json();
      setLogLines(data.lines ?? []);
      setLogFile(data.file ?? '');
    } catch {
      // silently ignore log fetch errors
    }
  }, []);

  // Status polling
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Log polling when panel is open
  useEffect(() => {
    if (!logsOpen) return;
    fetchLogs();
    const interval = setInterval(fetchLogs, LOG_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [logsOpen, fetchLogs]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logLines]);

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/runner/start', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to start runner');
      }
      // Give the process a moment to start before re-checking status
      setTimeout(fetchStatus, 2000);
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
      setTimeout(fetchStatus, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusDot = running
    ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm'
    : 'bg-zinc-500';
  const statusText = running ? 'Running' : 'Stopped';
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
          <button
            onClick={() => setLogsOpen((v) => !v)}
            className="flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            Logs
            {logsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {logsOpen && (
        <div className="mt-4">
          {logFile && (
            <p className="mb-1 text-xs text-zinc-500 font-mono">{logFile}</p>
          )}
          <div
            ref={logBoxRef}
            className="h-64 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 space-y-0.5"
          >
            {logLines.length === 0 ? (
              <span className="text-zinc-500">No log entries found.</span>
            ) : (
              logLines.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all leading-5">{line}</div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RunnerCard;
