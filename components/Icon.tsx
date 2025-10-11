import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: 'file' | 'folder' | 'react' | 'html' | 'css' | 'js' | 'ts' | 'json' | 'preview' | 'ai' | 'terminal' | 'addFile' | 'addFolder' | 'play' | 'upload' | 'download' | 'github' | 'python' | 'md' | 'sun' | 'moon' | 'tailwind' | 'java' | 'cpp' | 'rust' | 'chevronRight' | 'undo' | 'redo' | 'sparkles' | 'search' | 'sunMoon' | 'plus' | 'trash' | 'git' | 'copy' | 'microphone' | 'volumeUp' | 'volumeOff' | 'close' | 'sourceControl' | 'documentSparkle' | 'share' | 'sidebar' | 'scaffold' | 'gear' | 'save' | 'ellipsis';
}

const ICONS: Record<IconProps['icon'], React.ReactElement> = {
  file: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  folder: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
  react: <g><path strokeLinecap="round" strokeLinejoin="round" d="M14.555 5.555a8.98 8.98 0 00-4.555-2.02m-4.555 2.02a8.96 8.96 0 002.02 4.555m2.535-4.555a8.96 8.96 0 014.555 2.02m-2.02 4.555a8.96 8.96 0 01-4.555-2.02m7.09 7.09a8.98 8.98 0 01-4.555 2.02m4.555-2.02a8.96 8.96 0 01-2.02-4.555m-2.535 4.555a8.96 8.96 0 00-4.555-2.02" /><circle cx="12" cy="12" r="2" /></g>,
  html: <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
  css: <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h8a4 4 0 004-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4z" />,
  js: <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m-2 16h4m-12-8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h.01M10 16h.01M14 16h.01" />,
  ts: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4 6h16M4 18h16" />,
  json: <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />,
  python: <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.268-.02.537-.035.815-.042 1.156-.02 2.296.08 3.415.28 2.25.4 4.37 1.39 5.925 2.945a.75.75 0 01-1.06 1.06c-1.3-1.3-3.1-2.125-5.13-2.465-1.025-.175-2.065-.255-3.115-.235a.75.75 0 01-.85-1.043zm-1.65 14.366c-.268.02-.537.035-.815.042-1.156.02-2.296-.08-3.415-.28-2.25-.4-4.37-1.39-5.925-2.945a.75.75 0 111.06-1.06c1.3 1.3 3.1 2.125 5.13 2.465 1.025.175 2.065.255 3.115.235a.75.75 0 01.85 1.043zM4.317 13.675c-.02-.268-.035-.537-.042-.815-.02-1.156.08-2.296.28-3.415.4-2.25 1.39-4.37 2.945-5.925a.75.75 0 011.06 1.06c-1.3 1.3-2.125 3.1-2.465 5.13-.175 1.025-.255 2.065-.235 3.115a.75.75 0 01-1.043.85zm14.366-1.65c.02.268.035.537.042.815.02 1.156-.08 2.296-.28 3.415-.4 2.25-1.39 4.37-2.945 5.925a.75.75 0 11-1.06-1.06c1.3-1.3 2.125-3.1 2.465-5.13.175 1.025-.255 2.065.235-3.115a.75.75 0 011.043-.85z" />,
  preview: <g><path d="M21 12a9 8 0 10-16 0" strokeLinecap="round" /><circle cx="12" cy="12" r="3" /><circle cx="5" cy="12" r="1.5" fill="currentColor" strokeWidth="0" /></g>,
  ai: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  terminal: <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />,
  addFile: <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  addFolder: <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-5 5H5a2 2 0 01-2-2V5a2 2 0 012-2h2.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293h4.172a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 012 2v5a2 2 0 01-2 2h-2" />,
  play: <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  upload: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
  download: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
  github: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />,
  md: <g><path strokeLinecap="round" strokeLinejoin="round" d="M7 15V9l2 3 2-3v6" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12l-2 2-2-2m2-2v4" /></g>,
  sun: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />,
  moon: <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />,
  sunMoon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 18V4a8 8 0 1 0 0 16z" />,
  tailwind: <g><path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6M12 3v18" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 8s-1.5-2-4-2-4 2-4 2 1.5 2 4 2 4-2 4-2zM8 16s1.5 2 4 2 4-2 4-2-1.5-2-4-2-4 2-4 2z" /></g>,
  java: <g><path strokeLinecap="round" strokeLinejoin="round" d="M18 8h2a1 1 0 011 1v4a1 1 0 01-1 1h-2" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2z" /></g>,
  cpp: <g><path strokeLinecap="round" strokeLinejoin="round" d="M11 14a4 4 0 100-8H7" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h2m-1-1v2" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 10h2m-1-1v2" /></g>,
  rust: <g><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 21V3m-4.5 13.5L3 18m13.5-4.5L21 18M7.5 7.5L3 6m13.5 4.5L21 6" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 10v4h1.5a1.5 1.5 0 000-3H10zm0 2.5L12.5 14" /></g>,
  chevronRight: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />,
  undo: <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />,
  redo: <path strokeLinecap="round" strokeLinejoin="round" d="m15 9-6 6m0 0-6-6m6 6V6a6 6 0 0 1 12 0v3" />,
  sparkles: <g><path d="m12 3-1.9 4.8-4.8 1.9 4.8 1.9L12 16l1.9-4.8 4.8-1.9-4.8-1.9L12 3z" /><path d="M5 8.5 3 10l2 1.5L6.5 14l1.5-2L10 10l-2-1.5L6.5 6 5 8.5z" /><path d="m21 14-1.5 2-1.5-2-2-1.5 2-1.5 1.5-2 1.5 2 2 1.5-2 1.5z" /></g>,
  search: <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
  trash: <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.033-2.134H8.71c-1.123 0-2.033.954-2.033 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />,
  git: <g><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M18 6L6 18" /></g>,
  copy: <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 4h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />,
  microphone: <g><path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11v8m-4 0h8" /></g>,
  volumeUp: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5zm8.5 7c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 8.83v6.34c.58-.29 1-.82 1-1.42s-.42-1.13-1-1.42z" />,
  volumeOff: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A11 11 0 0022 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />,
  close: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
  sourceControl: <g><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M18 6L6 18" /></g>, // Reusing git icon
  documentSparkle: <g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/><path d="m12 11-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z"/><path d="m8 16-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z"/></g>,
  share: <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m0-2.186V10.907" />,
  sidebar: <g><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></g>,
  scaffold: <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v16 M9 8h4 M9 14h4 M13 6h4v4h-4z M13 12h4v4h-4z" />,
  gear: <g><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></g>,
  save: <g><path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-8H7v8" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 3v5h8" /></g>,
  ellipsis: <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />,
};

export const Icon: React.FC<IconProps> = ({ icon, className = 'w-6 h-6', ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      {ICONS[icon]}
    </svg>
  );
};