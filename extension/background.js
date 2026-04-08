chrome.runtime.onInstalled.addListener(() => {
    console.log('[MeetMind] Extensão instalada com sucesso!')
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('meet.google.com')) {
        chrome.action.setIcon({
            path: {
                '16': 'icons/icon16.png',
                '48': 'icons/icon48.png',
            },
            tabId,
        })
    }
})

