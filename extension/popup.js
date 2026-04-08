// Mostra status real no popup
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    const statusEl = document.getElementById('status')

    if (tab?.url?.includes('meet.google.com')) {
      statusEl.innerHTML = `
        <span class="dot" style="background:#22c55e;display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px"></span>
        Reunião detectada
      `
    } else {
      statusEl.innerHTML = `
        <span class="dot dot-idle"></span>Fora do Google Meet
      `
    }
  })
})