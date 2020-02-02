
document.getElementById("credits-toggle").addEventListener("click", toggleCredits);

function toggleCredits() {

    let credits = document.getElementById('credits');
    switchClasses(credits, "hide", "show");
}

function toggleStartPauseButton() {

    let startRecord = document.getElementById('start-record');
    switchClasses(startRecord, "hide", "show");

    let pauseRecord = document.getElementById('pause-record');
    switchClasses(pauseRecord, "hide", "show");
}

function switchClasses(element, class1, class2) {

    if (element.classList.contains(class1)) {

        element.classList.remove(class1);
        element.classList.add(class2);

    } else {

        element.classList.remove(class2);
        element.classList.add(class1);
    }
}

//-------------------------------------

const port = chrome.runtime.connect({ name: 'sync' });
port.onMessage.addListener((message, sender) => {
    console.log(message.status);
});

document.getElementById("start-page-analysis").addEventListener("click", () => {
    port.postMessage({ action: "start-page-analysis" });
});

document.getElementById("start-record").addEventListener("click", () => {

    let file_name = data.length > 0 ? data : 'script ' + getDateTimeStamp();
    data = '';

    port.postMessage({
        action: "start-record",
        file_name: file_name,
        value: '',
    });
});

document.getElementById("stop-record").addEventListener("click", () => {

    port.postMessage({ action: "stop-record" });

    chrome.storage.local.get(null, (result) => {

        let steps = {};

        for (let i = 1; i < result.settings.step_count; i++) {

            let key = 'step_' + i;
            steps[key] = result[key];
        }

        const settings = {
            url: 'data:application/json;base64,' + btoa(JSON.stringify(steps)),
            filename: 'recorded_scripts/' + result.settings.file_name
        };

        chrome.downloads.download(settings, () => {

            for (let key in result) {

                console.log('\n', key + ': ' + result[key]);
                chrome.storage.local.remove(key);
            }
        });
    });
});

//-------------------------------------

document.getElementById("wait-for-element").addEventListener("click", () => {
    postEventMessage('wait-for-element', false, true);
});

document.getElementById("match-element-text").addEventListener("click", () => {
    postEventMessage('match-element-text', true, false);
});

document.getElementById("wait").addEventListener("click", () => {
    postEventMessage('wait', false, true);
});

document.getElementById("remove-last-step").addEventListener("click", () => {
    postEventMessage('remove-last-step', false, false);
});

//-------------------------------------

let data = '';
let name = '';

document.getElementById("data").addEventListener("change", (element) => {
    data = element.target.value;
});

document.getElementById("name").addEventListener("change", (element) => {
    name = element.target.value;
});

document.getElementById("use-element-name").addEventListener("click", () => {
    postEventMessage('use-element-name', false, false);
});

//-------------------------------------

document.getElementById("author").addEventListener("click", () => {
    chrome.tabs.create({ url: document.getElementById("author").getAttribute('href') });
});

//-------------------------------------

function postEventMessage(action, useData, useTime) {

    let message = {
        action: action,
        name: name
    };

    !useData ? message.text = '' : message.text = data;
    !useTime ? message.time = '' :
        data.length > 0 ? message.time = data : message.time = '1';

    port.postMessage(message, () => {
        name = '';
        data = '';
    });
}

function getDateTimeStamp() {

    let date = new Date();
    let dateStamp = (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getFullYear();
    let timeStamp = date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds();
    return '(' + dateStamp + ') (' + timeStamp + ')';
}