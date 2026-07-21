export type ThemeMode = 'light' | 'dark';

export interface PositionCoordinates {
  top: number;
  left: number;
  width: number;
  visible: boolean;
}

export interface OverlayManagerOptions {
  theme?: ThemeMode;
  targetElement?: HTMLElement | null;
  offsetY?: number;
  zIndex?: number;
}

export interface ToolbarButtonProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
  tooltipText?: string;
}
