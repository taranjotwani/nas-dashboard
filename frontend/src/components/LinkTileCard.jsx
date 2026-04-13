import React from 'react';
import { ExternalLink, Link2, Pencil, Trash2 } from 'lucide-react';

const LinkTileCard = ({ name, url, onEdit, onDelete }) => {
  return (
    <div className="group relative min-h-[200px] rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-zinc-700 hover:bg-zinc-800/50 md:min-h-[250px] md:p-10">
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-2 text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-300"
          aria-label={`Edit ${name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-2 text-zinc-300 transition hover:border-red-500 hover:text-red-300"
          aria-label={`Delete ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col items-center justify-center gap-6"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-lg bg-cyan-500/15 opacity-60 blur-xl transition-opacity" />
          <div className="relative rounded-lg bg-cyan-500/10 p-6">
            <Link2 className="h-16 w-16 text-cyan-300 md:h-20 md:w-20" />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <span className="block text-base font-medium text-zinc-200 transition-colors group-hover:text-white md:text-lg">
            {name}
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors group-hover:text-cyan-200">
            Open link
            <ExternalLink className="h-4 w-4" />
          </span>
        </div>
      </a>
    </div>
  );
};

export const AddLinkCard = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[200px] w-full flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/35 p-8 transition-all hover:border-emerald-500 hover:bg-zinc-800/50 md:min-h-[250px] md:p-10"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-lg bg-emerald-500/20 opacity-50 blur-xl transition-opacity group-hover:opacity-80" />
        <div className="relative rounded-lg bg-emerald-500/10 p-6 text-emerald-300">
          <span className="block text-6xl leading-none md:text-7xl">+</span>
        </div>
      </div>

      <span className="text-base font-medium text-zinc-200 transition-colors group-hover:text-white md:text-lg">
        Add Link
      </span>
    </button>
  );
};

export default LinkTileCard;