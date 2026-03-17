import React from "react"

const ServiceCard = ({Icon,name, isActive, url} ) => {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:bg-zinc-800/50 hover:border-zinc-700"
        >
            {/* Icon with background glow */}
            <div className="relative">
                <div
                    className={`absolute inset-0 rounded-lg blur-xl transition-opacity ${
                        isActive ? 'bg-emerald-500/20 opacity-60' : 'bg-zinc-500/10 opacity-30'
                    }`}
                />
                <div
                    className={`relative rounded-lg p-4 transition-colors ${
                        isActive ? 'bg-emerald-500/10' : 'bg-zinc-800/50'
                    }`}
                >
                    <Icon
                        className={`h-8 w-8 transition-colors ${
                            isActive ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                    />
                </div>
            </div>

            {/* Service name */}
            <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
        {name}
      </span>
        </a>
    );
}

export default ServiceCard;