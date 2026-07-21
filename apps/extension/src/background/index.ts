// Background Service Worker Entry Point
console.log('[Rapport AI] Background Service Worker initialized.');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Rapport AI] Extension installed successfully.');
});
