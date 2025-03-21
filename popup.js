document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('startGame');
  
  // Normal behavior for all websites
  startButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // First ensure content script is loaded
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      }, () => {
        // Then send the start game message
        chrome.tabs.sendMessage(tabs[0].id, {command: "startInvasion"});
        window.close();
      });
    });
  });
});