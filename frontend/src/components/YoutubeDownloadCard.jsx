import React, { useState } from 'react';

const YoutubeDownloadCard = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDownload = async (event) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!youtubeUrl.trim()) {
      setErrorMessage('Please enter a YouTube URL.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/music/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim()
        })
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (response.status === 201) {
        setSuccessMessage('Download successful.');
        setYoutubeUrl('');
      } else {
        const fallback = 'Failed to download MP3.';
        setErrorMessage(payload.message || payload.error || fallback);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Network error while downloading.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
      <h2 className="mb-3 text-lg font-semibold text-emerald-300">Youtube Url</h2>

      <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleDownload}>
        <input
          type="url"
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition focus:border-emerald-500"
          required
          disabled={loading}
        />

        <button
          type="submit"
          className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-zinc-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
          disabled={loading}
        >
          {loading ? 'Downloading...' : 'Download MP3'}
        </button>
      </form>

      {successMessage ? (
        <div className="mt-3 rounded-xl border border-emerald-600/40 bg-emerald-900/30 px-4 py-3 text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-red-300">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};

export default YoutubeDownloadCard;
