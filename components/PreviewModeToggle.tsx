import React from 'react';
import { PreviewMode } from '../types.ts';

interface PreviewModeToggleProps {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}

export const PreviewModeToggle: React.FC<PreviewModeToggleProps> = ({ mode, onChange }) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-100 dark:focus:ring-offset-neutral-950";
    const activeClasses = "bg-indigo-600 text-white";
    const inactiveClasses = "bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-300 hover:bg-neutral-400 dark:hover:bg-neutral-600";

    return (
        <div className="flex items-center space-x-1 bg-neutral-200 dark:bg-neutral-800 p-1 rounded-lg">
            <button
                onClick={() => onChange(PreviewMode.Sandbox)}
                className={`${baseClasses} ${mode === PreviewMode.Sandbox ? activeClasses : inactiveClasses}`}
            >
                Sandbox
            </button>
             <button
                onClick={() => onChange(PreviewMode.Host)}
                className={`${baseClasses} ${mode === PreviewMode.Host ? activeClasses : inactiveClasses}`}
            >
                Host
            </button>
            <button
                onClick={() => onChange(PreviewMode.Python)}
                className={`${baseClasses} ${mode === PreviewMode.Python ? activeClasses : inactiveClasses}`}
            >
                Python
            </button>
        </div>
    );
};