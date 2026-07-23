import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsView } from '@rapport/overlay';

export const SidepanelApp: React.FC = () => {
  return (
    <div style={{ padding: '12px', background: '#0f1114', minHeight: '100vh', boxSizing: 'border-box' }}>
      <SettingsView mode="sidepanel" />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SidepanelApp />);
}
