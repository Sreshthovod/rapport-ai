import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsView } from '@rapport/overlay';

export const PopupApp: React.FC = () => {
  return (
    <div style={{ width: '440px', padding: '8px', background: '#0f1114', boxSizing: 'border-box' }}>
      <SettingsView mode="popup" />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
