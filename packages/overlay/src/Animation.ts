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
`;
