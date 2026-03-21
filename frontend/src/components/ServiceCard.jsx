import React from "react"

const ServiceCard = ({Icon, name, url, isActive = false}) => {


    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-center justify-center gap-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 md:p-10 transition-all hover:bg-zinc-800/50 hover:border-zinc-700 min-h-[200px] md:min-h-[250px]"
        >
            {/* Icon with background glow */}
            <div className="relative">
                <div
                    className={`absolute inset-0 rounded-lg blur-xl transition-opacity ${
                        isActive ? 'bg-emerald-500/20 opacity-60' : 'bg-zinc-500/10 opacity-30'
                    }`}
                />
                <div
                    className={`relative rounded-lg p-6 transition-colors ${
                        isActive ? 'bg-emerald-500/10' : 'bg-zinc-800/50'
                    }`}
                >
                    <Icon
                        className={`h-16 w-16 md:h-20 md:w-20 transition-colors ${
                            isActive ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                    />
                </div>
            </div>

            {/* Service name */}
            <span className="text-base md:text-lg font-medium text-zinc-200 group-hover:text-white transition-colors text-center">
        {name}
      </span>
        </a>
    );
}

export default ServiceCard;