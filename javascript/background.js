
let contextMenus = {};

contextMenus.getElementLocators =
    chrome.contextMenus.create(
        {
            title: 'Analyze DOM For Element IDs',
            contexts: ['all']
        },
        () => {

            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            }
        }
    );

function createContextMenuHandler(info, tab) {

    if (info.menuItemId === contextMenus.getElementLocators) {
        chrome.tabs.executeScript({ file: 'javascript/dom_analyzer.js' });
    }
}

chrome.contextMenus.onClicked.addListener(createContextMenuHandler);

chrome.runtime.onConnect.addListener(function (externalPort) {

    externalPort.onDisconnect.addListener(function () {
        console.log("(o) - Popup has been opened.");
    });

    console.log("(x) - Popup has been closed.");
});

//----------------------------------------------------------------------

chrome.runtime.onConnect.addListener((port) => {

    port.onMessage.addListener((message) => {

        let variable = message.action === 'start-page-analysis' ? 'let ' : '';

        chrome.tabs.executeScript({
            code: variable + 'message = ' + JSON.stringify(message)
        }, function () {
            chrome.tabs.executeScript({ file: 'javascript/element_manager.js' });
        });
    });
});