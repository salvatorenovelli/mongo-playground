const deepEqual = require("deep-equal");


function filteredDeepEqual(val1, val2) {
    const ignoredFields = ["createDate", "id", "_links", "val", "selected"];
    return deepEqual(filterFields(val1, ignoredFields), filterFields(val2, ignoredFields));
}


function filterFields(currentValue, filteredFields) {

    let copy = Object.assign({}, currentValue);
    filteredFields.forEach(filteredField => {
        copy[filteredField] = undefined;
    });


    return copy;
}


module.exports = filterFields;
