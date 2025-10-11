import React from 'react';
import { Icon } from './Icon.tsx';

type LeftPanelTab = 'files' | 'git';

interface ActivityBarProps {
  activeLeftTab: LeftPanelTab;
  onTabChange: (tab: LeftPanelTab) => void;
  isAssistantVisible: boolean;
  onToggleAssistant: () => void;
  isPreviewVisible: boolean;
  onTogglePreview: () => void;
  isTerminalVisible: boolean;
  onToggleTerminal: () => void;
  onRun: () => void;
  onImportZip: () => void;
  onExportZip: () => void;
  onImportGithub: () => void;
  onSaveProject: () => void;
  onCopyProject: () => void;
  onDeployProject: () => void;
  onShareProject: () => void;
  onSettingsClick: () => void;
}

const ActivityBarButton: React.FC<{
  icon: React.ComponentProps<typeof Icon>['icon'];
  title: string;
  onClick: () => void;
  isActive?: boolean;
}> = ({ icon, title, onClick, isActive = false }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-full flex justify-center p-3 transition-colors duration-200 relative ${
        isActive 
          ? 'text-indigo-400' 
          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
      }`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
      <Icon icon={icon} className="w-6 h-6" />
    </button>
  );
};

export const ActivityBar: React.FC<ActivityBarProps> = ({ 
    activeLeftTab, onTabChange, 
    isAssistantVisible, onToggleAssistant,
    isPreviewVisible, onTogglePreview,
    isTerminalVisible, onToggleTerminal,
    onRun, onImportZip, onExportZip, onImportGithub,
    onSaveProject, onCopyProject, onDeployProject, onShareProject, onSettingsClick
}) => {
  const Divider = () => <div className="w-8/12 h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-auto"></div>;
  
  return (
    <div className="h-full w-14 flex-shrink-0 flex flex-col bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 animate-fade-in">
        {/* Main Panels */}
        <ActivityBarButton icon="file" title="Explorer" onClick={() => onTabChange('files')} isActive={activeLeftTab === 'files'} />
        <ActivityBarButton icon="ai" title="AI Assistant" onClick={onToggleAssistant} isActive={isAssistantVisible} />
        <ActivityBarButton icon="preview" title="Preview" onClick={onTogglePreview} isActive={isPreviewVisible} />
        <ActivityBarButton icon="terminal" title="Terminal" onClick={onToggleTerminal} isActive={isTerminalVisible} />
        
        <div className="flex-grow"></div>

        {/* Project & App Actions (from bottom up) */}
        <ActivityBarButton icon="play" title="Run Project" onClick={onRun} />
        <Divider />
        <ActivityBarButton icon="upload" title="Import from ZIP" onClick={onImportZip} />
        <ActivityBarButton icon="github" title="Import from GitHub" onClick={onImportGithub} />
        <ActivityBarButton icon="download" title="Export to ZIP" onClick={onExportZip} />
        <Divider />
        <ActivityBarButton icon="save" title="Save Project Snapshot" onClick={onSaveProject} />
        <ActivityBarButton icon="copy" title="Copy Project as ZIP" onClick={onCopyProject} />
        <ActivityBarButton icon="share" title="Deploy Project" onClick={onDeployProject} />
        <ActivityBarButton icon="ellipsis" title="Share Project Link" onClick={onShareProject} />
        <Divider />
        <ActivityBarButton icon="gear" title="Settings" onClick={onSettingsClick} />
    </div>
  );
};