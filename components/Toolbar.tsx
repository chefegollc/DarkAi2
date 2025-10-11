import React from 'react';
import { Icon } from './Icon.tsx';

type Theme = 'light' | 'dark' | 'auto';

const ToolbarButton: React.FC<React.PropsWithChildren<{ onClick?: () => void; title: string, isPrimary?: boolean, disabled?: boolean, isActive?: boolean }>> = ({ children, onClick, title, isPrimary = false, disabled = false, isActive = false }) => {
  const baseClasses = "flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950";
  // The Run button is always primary, but its background gets darker when the panel is active.
  const primaryClasses = `font-semibold text-white ${isActive ? 'bg-indigo-700' : 'bg-indigo-600'} hover:bg-indigo-700`;
  const secondaryClasses = "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700";
  const disabledClasses = "disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-500 dark:disabled:text-neutral-500 disabled:cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${baseClasses} ${isPrimary ? primaryClasses : secondaryClasses} ${disabledClasses}`}
    >
      {children}
    </button>
  );
}

const ToolbarIconButton: React.FC<{ onClick?: () => void; title: string; icon: React.ComponentProps<typeof Icon>['icon']; disabled?: boolean, isActive?: boolean }> = ({ onClick, title, icon, disabled = false, isActive = false }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded-md transition-colors disabled:text-neutral-500 disabled:cursor-not-allowed ${
        isActive
          ? 'bg-indigo-600 text-white'
          : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700'
      }`}
    >
      <Icon icon={icon} className="w-5 h-5" />
    </button>
  );
};


interface ToolbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  buildStatus: 'idle' | 'building' | 'success' | 'error';
  theme: Theme;
  onToggleTheme: () => void;
  onToggleActivityBar: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectName, onProjectNameChange,
  onUndo, onRedo, canUndo, canRedo, buildStatus, theme, onToggleTheme,
  onToggleActivityBar,
}) => {
  const statusIndicator = {
    idle: { text: 'Idle', color: 'text-cyan-500 dark:text-cyan-400' },
    building: { text: 'Building...', color: 'text-yellow-500 dark:text-yellow-400 animate-pulse' },
    success: { text: 'Build Success', color: 'text-indigo-500 dark:text-indigo-400' },
    error: { text: 'Build Failed', color: 'text-indigo-400' },
  };
  
  const getThemeIcon = (): React.ComponentProps<typeof Icon>['icon'] => {
    if (theme === 'light') return 'sun';
    if (theme === 'dark') return 'moon';
    return 'sunMoon'; // for 'auto'
  };

  return (
    <div className="flex items-center space-x-4 p-2 bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
      
      <div className="flex items-center space-x-2">
         <button onClick={onToggleActivityBar} title="Toggle Activity Bar" className="p-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors">
           <Icon icon="ai" className="w-5 h-5 text-indigo-500" />
         </button>
         <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700"></div>
         <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className={`bg-transparent text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-0.5 w-[20ch] transition-colors ${statusIndicator[buildStatus].color}`}
         />
         <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700"></div>
         <ToolbarIconButton onClick={onUndo} title="Undo (Ctrl+Z)" icon="undo" disabled={!canUndo} />
         <ToolbarIconButton onClick={onRedo} title="Redo (Ctrl+Y)" icon="redo" disabled={!canRedo} />
      </div>

      <div className="flex-grow"></div>

      <div className="flex items-center space-x-2">
        <div className={`text-sm font-mono px-3 ${statusIndicator[buildStatus].color}`}>
            {statusIndicator[buildStatus].text}
        </div>
        
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700"></div>
        
        <button 
          onClick={onToggleTheme} 
          title="Toggle Theme"
          className="p-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors"
        >
          <Icon icon={getThemeIcon()} className="w-5 h-5 text-yellow-400" />
        </button>
      </div>
    </div>
  );
};