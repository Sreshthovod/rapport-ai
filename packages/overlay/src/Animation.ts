export const ANIMATION_STYLES = `
  @keyframes rapportFadeInScale {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes rapportFadeOutScale {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(6px) scale(0.96);
    }
  }

  .rapport-animate-enter {
    animation: rapportFadeInScale 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: transform, opacity;
  }

  .rapport-animate-exit {
    animation: rapportFadeOutScale 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: transform, opacity;
  }

  .rapport-btn-ripple {
    position: relative;
    overflow: hidden;
  }

  .rapport-btn-ripple::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: currentColor;
    opacity: 0;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    transition: transform 300ms ease, opacity 300ms ease;
  }

  .rapport-btn-ripple:active::after {
    opacity: 0.15;
    transform: translate(-50%, -50%) scale(2);
    transition: 0s;
  }

  @keyframes rapportShimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .rapport-shimmer {
    background: var(--rapport-shimmer-bg);
    background-size: 200% 100%;
    animation: rapportShimmer 1.5s infinite linear;
  }

  @keyframes blinkingCaret {
    from, to { border-color: transparent }
    50% { border-color: var(--rapport-accent) }
  }

  .rapport-caret {
    border-right: 2px solid var(--rapport-accent);
    animation: blinkingCaret 0.75s step-end infinite;
  }

  /* Centralized Premium Interactive Styles */
  button {
    outline: none;
    transition: all 120ms cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  button:hover:not(:disabled) {
    transform: translateY(-0.5px);
    filter: brightness(1.04);
  }
  button:active:not(:disabled) {
    transform: scale(0.97) translateY(0px) !important;
    filter: brightness(0.96);
  }
  button:focus-visible {
    outline: none !important;
    box-shadow: 0 0 0 2px var(--rapport-bg-solid), 0 0 0 4px var(--rapport-accent) !important;
  }

  input, textarea, select {
    outline: none;
    transition: all 120ms cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  input:hover:not(:disabled), textarea:hover:not(:disabled), select:hover:not(:disabled) {
    border-color: var(--rapport-border-hover) !important;
  }
  input:focus:not(:disabled), textarea:focus:not(:disabled), select:focus:not(:disabled) {
    border-color: var(--rapport-accent) !important;
    box-shadow: 0 0 0 1px var(--rapport-accent), 0 0 0 3px var(--rapport-accent-muted) !important;
  }
  input:focus-visible, textarea:focus-visible, select:focus-visible {
    outline: none !important;
  }
`;
