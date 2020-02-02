{
    let characters = '';

    function recordHandler() {

        let dash = '-';

        if (message.action === 'start-page-analysis') {

            document.addEventListener('keydown', evaluateKeyPress);
            document.addEventListener('mousedown', evaluateMouseClick);
            console.log('---> Page Analyzer Activated <---');

        } else if (message.action === 'start-record') {

            chrome.storage.local.set({
                'settings': {
                    'step_count': 1,
                    'file_name': message.file_name,
                    'value': ''
                }
            });

            chrome.storage.local.set({
                'substep': {
                    'action': '',
                    'name': '',
                    'time': '',
                    'text': ''
                }
            });

            console.log(dash.repeat(30));
            console.log('Recording Started...');
            console.log(dash.repeat(30));

        } else if (message.action === 'stop-record') {

            console.log(dash.repeat(30));
            console.log('Recording Stopped...');
            console.log(dash.repeat(30));

        } else if (message.action === 'wait-for-element') {

            setSubStepData(message);

        } else if (message.action === 'match-element-text') {

            setSubStepData(message);

        } else if (message.action === 'wait') {

            addWaitStep(message);

        } else if (message.action === 'remove-last-step') {

            removeLastSavedStep();

        } else if (message.action === 'use-element-name') {

            setSubStepData(message);
        }
    }

    function evaluateKeyPress(event) {

        const list = 'abcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()_-+=,.<>?/;:"[]{}|\\\'';
        const key = event.key.toLowerCase();
        if (list.indexOf(key) === -1) return;
        characters = characters + event.key;
    }

    function evaluateMouseClick(event) {

        if (event.which !== 1) { return; }
        let element = event.target || event.srcElement;

        if (characters.length > 0) {

            chrome.storage.local.get(null, (result) => {

                let typeStep = getStep('type', result, null, characters);
                characters = '';

                let settings = {
                    'settings': {
                        'step_count': result.settings.step_count + 1,
                        'file_name': result.settings.file_name,
                        'value': ''
                    }
                };

                chrome.storage.local.set(typeStep, () => {
                    chrome.storage.local.set(settings, () => {

                        result.settings.step_count = result.settings.step_count + 1;
                        let clickStep = getStep('click', result, element);
                        saveStep(clickStep, result);
                    });
                });
            });

        } else {

            chrome.storage.local.get(null, (result) => {

                let step = getStep('click', result, element);
                saveStep(step, result);
            });
        }
    }

    function getStep(stepType, result, element = null, characters = '') {

        stepType = result.substep.action.length > 0 &&
            result.substep.action !== 'use-element-name' ?
            result.substep.action : stepType;

        let key = 'step_' + result.settings.step_count;
        let name = result.substep.name.length > 0 ? result.substep.name :
            element !== null ? element.tagName : 'target';

        let step = {};
        step[key] = {
            type: stepType,
            description: '',
            name: name,
            tag: '',
            xpath: '',
            timeStamp: getTimeStamp(),
            waitTime: '',
            data: ''
        };

        if (stepType == 'click' || stepType == 'wait-for-element') {

            step[key].xpath = getXpath(element);
            step[key].tag = element.tagName;
        }

        let description = 'Step ' + result.settings.step_count + ' - ';

        if (stepType == 'click') {

            step[key].description = description + 'Click the ( ' + step[key].name + ' ) element';

        } else if (stepType == 'wait-for-element') {

            step[key].waitTime = result.substep.time;
            step[key].description = description + 'Wait for ' + step[key].waitTime + ' second(s) for ' +
                '( ' + step[key].name + ' ) to be visible';

        } else if (stepType == 'match-element-text') {

            step[key].data = result.substep.text;
            let sanitizedText = step[key].data.replace(/[^0-9A-za-z-. ]/g, '');
            step[key].description = description + 'Verify ( ' + step[key].name + ' ) ' +
                'element text matches ( ' + sanitizedText + ' )';

        } else if (stepType == 'type') {

            let lastStepKey = 'step_' + (result.settings.step_count - 1);
            step[key].xpath = result[lastStepKey].xpath;
            step[key].tag = result[lastStepKey].tag;
            step[key].name = result[lastStepKey].name;
            step[key].data = characters;
            characters = '';

            let sanitizedText = step[key].data.replace(/[^0-9A-za-z-.]/g, '');
            step[key].description = description + 'Type ( ' + sanitizedText + ' ) ' +
                'into the ( ' + step[key].name + ' ) textbox';

        } else if (stepType == 'wait') {

            step[key].waitTime = result.substep.time;
            step[key].description = description + 'Wait for ' + step[key].waitTime + ' second(s)';
        }

        console.log(step[key].description);
        let resetText = result.substep.text.length > 0;
        resetSubStepData(resetText);
        return step;
    }

    function saveStep(step, result) {

        chrome.storage.local.set(step, () => {

            chrome.storage.local.set({
                'settings': {
                    'step_count': result.settings.step_count + 1,
                    'file_name': result.settings.file_name,
                    'value': ''
                }
            });
        });
    }

    function addWaitStep(message) {

        chrome.storage.local.set({
            'substep': {
                'action': message.action,
                'name': message.name,
                'time': message.time,
                'text': message.text
            }
        }, () => {

            chrome.storage.local.get(null, (result) => {

                let step = getStep('wait', result);
                saveStep(step, result);
            });
        }
        );
    }

    function removeLastSavedStep() {

        chrome.storage.local.get(null, (result) => {

            let key = 'step_' + [result.settings.step_count - 1];
            if (!result.hasOwnProperty(key)) { return; }

            console.log('REMOVED: ' + result[key].description);

            chrome.storage.local.remove(key, () => {
                chrome.storage.local.set({
                    'settings': {
                        'step_count': result.settings.step_count - 1,
                        'file_name': result.settings.file_name,
                        'value': ''
                    }
                });
            });
        });
    }

    function setSubStepData(message) {

        chrome.storage.local.set({
            'substep': {
                'action': message.action,
                'name': message.name,
                'time': message.time,
                'text': message.text
            }
        });
    }

    function resetSubStepData(resetText) {

        chrome.storage.local.set({
            'substep': {
                'action': '',
                'name': '',
                'time': '',
                'text': ''
            }
        });
    }



    // ---------------------------------------------------------------------------



    function getXpath(element) {

        if (element.id !== '') {
            return "//*[@id='" + element.id + "']";
        } else if (element === document.body) {
            return element.tagName;
        }

        let nodeIndex = 0;
        let siblings = element.parentNode.childNodes;

        for (let i = 0; i < siblings.length; i++) {

            let sibling = siblings[i];

            if (sibling === element) {
                return getXpath(element.parentNode) + '/' +
                    element.tagName + '[' + (nodeIndex + 1) + ']';
            }

            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                nodeIndex++;
            }
        }
    }

    function getTimeStamp() {

        const date = new Date();
        return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    }

    recordHandler();
}