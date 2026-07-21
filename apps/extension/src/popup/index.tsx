import React from 'react';
import { createRoot } from 'react-dom/client';

export const PopupApp: React.FC = () => {
  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', minWidth: '240px' }}>
      <h3>Rapport AI</h3>
      <p>Local-First Interpersonal Intelligence</p>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
