import React from 'react';
import { Icon } from './Icon.tsx';

interface PanelHeaderProps {
  title: string;
  icon: React.ComponentProps<typeof Icon>['icon'];
  isHighlighted: boolean;
  onHighlight: () => void;
  onClose: () => void;
  onDoubleClick?: () => void;
  children?: React.ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  icon,
  isHighlighted,
  onHighlight,
  onClose,
  onDoubleClick,
  children
}) => {
  const highlightClasses = 'bg-neutral-200 dark:bg-neutral-800 ring-1 ring-indigo-500/50';

  return (
    <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 p-2 text-sm font-medium">
      <div className="flex items-center space-x-2">
        <button onClick={onClose} title={`Close ${title} Panel`} className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800">
          <Icon icon={icon} className="w-4 h-4" />
        </button>
        <button
          onClick={onHighlight}
          onDoubleClick={onDoubleClick}
          className={`px-2 py-0.5 rounded-md cursor-pointer transition-all text-neutral-700 dark:text-neutral-300 ${isHighlighted ? highlightClasses : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
          title={`Click to select, double-click for options`}
        >
          <span>{title}</span>
        </button>
      </div>
      <div className="flex items-center">
        {children}
      </div>
    </div>
  );
};
