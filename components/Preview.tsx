import React from 'react';

interface PreviewProps {
  previewUrl: string;
  refreshKey: number;
}

export const Preview: React.FC<PreviewProps> = ({ previewUrl, refreshKey }) => {
  return (
    <div className="w-full h-full bg-neutral-50 dark:bg-neutral-900">
      <iframe
        key={refreshKey}
        src={previewUrl}
        title="Live Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        className="w-full h-full border-none"
      />
    </div>
  );
};