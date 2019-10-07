const express = require('express');

const {writePredicatesFile} = require('./dao/predicates-file.js');
const {writeFileAndExecute} = require('./service/plan.js');
const {ROOT} = require('./const/predicate-file');

const router = express.Router();

router.post('/generate-plan', (req, res) => {
    const {constraints: constraintsWrapper, groupsList, guestsList, tablesList} = req.body;
    const {list: constraints} = constraintsWrapper;
    const file = writePredicatesFile(constraints, groupsList, guestsList, tablesList);
    const fileName = `${new Date().getTime()}.pl`;
    const filePath = `${ROOT}${fileName}`;
    writeFileAndExecute(file, fileName, filePath, out => res.send(out));
});

module.exports = router;