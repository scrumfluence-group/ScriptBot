
const elements = document.body.getElementsByTagName("*");
const dash = '-';
let elementsWithId = 0;
let elementsWithoutId = 0;

for (let i = 0; i < elements.length; i++) {

    if (elements[i].hasAttribute('id')) {
        elementsWithId = elementsWithId + 1;
    } else {
        elementsWithoutId = elementsWithoutId + 1;
    }
}

console.log(dash.repeat(30));
console.log('Elements With ID: ' + elementsWithId);
console.log('Elements Without ID: ' + elementsWithoutId);
console.log('Total Elements: ' + (elementsWithId + elementsWithoutId));
console.log(dash.repeat(30));