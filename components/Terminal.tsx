import React, { useRef, useEffect } from 'react';

interface TerminalProps {
  logs: string[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full h-full bg-neutral-900 text-neutral-200 font-mono text-sm p-4 overflow-y-auto">
      {logs.map((log, index) => (
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-green-400 mr-2">$</span>
          {log}
        </div>
      ))}
      <div ref={terminalEndRef} />
    </div>
  );
};