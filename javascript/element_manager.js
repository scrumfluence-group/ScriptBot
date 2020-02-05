{
    /* --------------------------------------------------
    ACTION MANAGER
    -------------------------------------------------- */

    
    
    let characters = '';

    function recordHandler() {

        if (message.action === 'start-page-analysis') {

            startPageAnalysis();

        } else if (message.action === 'start-record') {

            resetSettingsAndSubstep(message);
            recordingStatusMessage(message.action);

        } else if (message.action === 'stop-record') {

            recordingStatusMessage(message.action);

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

    function resetSettingsAndSubstep(message) {

        chrome.storage.local.set({
            'settings': {
                'step_count': 1,
                'file_name': message.file_name,
                'status': message.status
            },
            'substep': {
                'action': '',
                'name': '',
                'time': '',
                'text': ''
            }
        });
    }

    function startPageAnalysis() {

        document.addEventListener('keydown', evaluateKeyPress);
        document.addEventListener('mousedown', evaluateMouseClick);
        console.log('---> Page Analysis Activated <---');
    }

    function recordingStatusMessage(action) {

        const dash = '-';
        const status = action === 'start-record' ? 'Started' : 'Stopped';

        console.log(dash.repeat(30));
        console.log('Recording ' + status + '...');
        console.log(dash.repeat(30));
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
        chrome.storage.local.get(null, (result) => {

            if (characters.length > 0) {

                let step = getStep('type', result, null, characters);
                result.settings.step_count = result.settings.step_count + 1;
                characters = '';

                chrome.storage.local.set(step, () => {
                    chrome.storage.local.set(result.settings, () => {
                        addClickStep(result, element);
                    });
                });

            } else {

                addClickStep(result, element);
            }
        });
    }

    function addClickStep(result, element) {

        let step = getStep('click', result, element);
        saveStep(step, result);
    }

    function saveStep(step, result) {

        chrome.storage.local.set(step, () => {
            updateSettingsData(result, 'add');
        });
    }

    function addWaitStep(message) {

        chrome.storage.local.set({ 'substep': message }, () => {

            chrome.storage.local.get(null, (result) => {

                let step = getStep('wait', result);
                saveStep(step, result);
            });
        });
    }

    function removeLastSavedStep() {

        chrome.storage.local.get(null, (result) => {

            let key = 'step_' + [result.settings.step_count - 1];
            if (!result.hasOwnProperty(key)) { return; }
            console.log('REMOVED: ' + result[key].description);

            chrome.storage.local.remove(key, () => {
                updateSettingsData(result, 'remove');
            });
        });
    }



    /* --------------------------------------------------
    STEP BUILDER
    -------------------------------------------------- */



    function getStep(stepType, result, element = null, characters = '') {

        let key = 'step_' + result.settings.step_count;
        stepType = getStepType(stepType, result);
        let name = getElementName(result, element);

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

        step[key].description = 'Step ' + result.settings.step_count + ' - ';
        getXpathForSpecificStepTypes(step, key, stepType, element);

        if (stepType == 'click') {

            buildClickActionStep(step, key);

        } else if (stepType == 'wait-for-element') {

            buildWaitForElementActionStep(step, key, result);

        } else if (stepType == 'match-element-text') {

            buildMatchElementTextActionStep(step, key, result);

        } else if (stepType == 'type') {

            buildTypeActionStep(step, key, result, characters);

        } else if (stepType == 'wait') {

            buildWaitActionStep(step, key, result);
        }

        console.log(step[key].description);
        resetSubStepData();
        return step;
    }

    function getStepType(stepType, result) {

        return result.substep.action.length > 0 &&
            result.substep.action !== 'use-element-name' ?
            result.substep.action : stepType;
    }

    function getElementName(result, element) {

        return result.substep.name.length > 0 ?
            result.substep.name :
            element !== null ?
                element.tagName :
                'target';
    }

    function getXpathForSpecificStepTypes(step, key, stepType, element) {

        if (stepType != 'click' && stepType != 'wait-for-element') { return; }
        step[key].xpath = getXpath(element);
        step[key].tag = element.tagName;
    }

    function buildClickActionStep(step, key) {
        step[key].description = step[key].description + 'Click the ( ' + step[key].name + ' ) element';
    }

    function buildWaitForElementActionStep(step, key, result) {

        step[key].waitTime = result.substep.time;
        step[key].description = step[key].description + 'Wait for ' + step[key].waitTime +
            ' second(s) for ( ' + step[key].name + ' ) to be visible';
    }

    function buildMatchElementTextActionStep(step, key, result) {

        step[key].data = result.substep.text;
        step[key].description = step[key].description + 'Verify ( ' + step[key].name + ' ) ' +
            'element text matches ( ' + step[key].data.replace(/[^0-9A-za-z-. ]/g, '') + ' )';
    }

    function buildTypeActionStep(step, key, result, characters) {

        let lastStepKey = 'step_' + (result.settings.step_count - 1);
        step[key].xpath = result[lastStepKey].xpath;
        step[key].tag = result[lastStepKey].tag;
        step[key].name = result[lastStepKey].name;
        step[key].data = characters;

        let cleanText = step[key].data.replace(/[^0-9A-za-z-.]/g, '');
        step[key].description = step[key].description + 'Type ( ' + cleanText + ' ) ' +
            'into the ( ' + step[key].name + ' ) textbox';
    }

    function buildWaitActionStep(step, key, result) {

        step[key].waitTime = result.substep.time;
        step[key].description = step[key].description + 'Wait for ' + step[key].waitTime + ' second(s)';
    }



    /* --------------------------------------------------
    SETTING & SUBSTEP DATA MANAGERS
    -------------------------------------------------- */



    function updateSettingsData(result, action) {

        let count = action === 'add' ?
            result.settings.step_count + 1 :
            result.settings.step_count - 1;

        chrome.storage.local.set({
            'settings': {
                'step_count': count,
                'file_name': result.settings.file_name,
                'status': result.settings.status
            }
        });
    }

    function setSubStepData(message) {

        chrome.storage.local.set({
            'substep': message
        });
    }

    function resetSubStepData() {

        chrome.storage.local.set({
            'substep': {
                'action': '',
                'name': '',
                'time': '',
                'text': ''
            }
        });
    }



    /* --------------------------------------------------
    UTILITY FUNCTIONS
    -------------------------------------------------- */



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