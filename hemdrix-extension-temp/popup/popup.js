// Hemdrix KDP Wizard Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const statusText = document.getElementById('status-text');
  const statusIndicator = document.querySelector('.status-indicator');

  // Verify Chrome API is available
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        statusText.innerText = 'Error detecting tab status';
        statusIndicator.className = 'status-indicator inactive';
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || '';

      // Check if it is an Amazon domain
      const isAmazon = /amazon\.(com|co\.uk|ca|de|fr|it|es|co\.jp|in|com\.au|com\.mx|com\.br)/i.test(url);
      if (!isAmazon) {
        statusText.innerText = 'Open Amazon to view details';
        statusIndicator.className = 'status-indicator inactive';
        return;
      }

      // Check if URL contains a standard 10-character ASIN pattern
      const hasAsin = /\/([A-Z0-9]{10})(?:[/?]|$)/i.test(url);
      if (hasAsin) {
        statusText.innerText = 'Active on this product page';
        statusIndicator.className = 'status-indicator active';
      } else {
        statusText.innerText = 'Open any product page';
        statusIndicator.className = 'status-indicator inactive';
      }
    });
  } else {
    // Default fallback (e.g. if loaded outside extension context)
    statusText.innerText = 'Extension active';
    statusIndicator.className = 'status-indicator active';
  }
});
