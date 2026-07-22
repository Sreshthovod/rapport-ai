import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsView } from '@rapport/overlay';

export const PopupApp: React.FC = () => {
  return (
    <div style={{ width: '420px', padding: '8px', background: '#14171a', boxSizing: 'border-box' }}>
      <SettingsView />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
