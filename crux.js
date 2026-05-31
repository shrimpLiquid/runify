document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('Button');
  
  btn.addEventListener('click', async function() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const repsData = default_reps; 

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: replaceOnPage, 
      args: [repsData]     
    });
  });
});

function replaceOnPage(repsData) {
  // 1. Sort keys by length descending so "sh" matches before "s" or "h"
  const sortedEntries = Object.entries(repsData).sort((a, b) => b[0].length - a[0].length);
  
  // 2. Build one unified regex pattern
  const regex = new RegExp(
    sortedEntries.map(([key]) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|"),
    "gi"
  );

  // 3. Create a quick-lookup map for case-insensitive matching
  const lookup = new Map(sortedEntries.map(([key, val]) => [key.toLowerCase(), val]));

  function replaceTextNode(node) {
    node.nodeValue = node.nodeValue.replace(regex, match => {
      const rep = lookup.get(match.toLowerCase());
      if (!rep) return match;
      
      // Preserve capitalization
      return match[0] === match[0]?.toUpperCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1)
        : rep;
    });
  }

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: node => {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentNode && ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(node.parentNode.nodeName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    replaceTextNode(node);
  }
}