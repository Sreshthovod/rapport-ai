import React from 'react';
import { createRoot } from 'react-dom/client';

export const SidepanelApp: React.FC = () => {
  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif' }}>
      <h2>Rapport AI Memory Inspector</h2>
      <p>Local-first relationship graph management.</p>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SidepanelApp />);
}
