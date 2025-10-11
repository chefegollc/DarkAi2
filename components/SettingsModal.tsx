import React from 'react';
import { Icon } from './Icon.tsx';

interface SettingsModalProps {
  panelName: string;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ panelName, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-neutral-950 bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-2xl p-6 w-full max-w-lg m-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Settings: <span className="text-indigo-500">{panelName}</span>
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Close Settings"
          >
            <Icon icon="close" className="w-5 h-5" />
          </button>
        </div>
        <div className="text-neutral-600 dark:text-neutral-400">
          <p>
            This is a placeholder for the {panelName} settings.
          </p>
          <p className="mt-2 text-sm">
            Future options and configurations for this panel will be available here.
          </p>
        </div>
      </div>
    </div>
  );
};
