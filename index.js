const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const {execFile}= require('child_process');

const app = express();

app.use(cors()); //TODO: /!\ for tests purposes only requests from any origin are accepted, to change later
app.use(bodyParser.json());

const ROOT = '/Users/pierrecuni/table-plan-ai/temp/';

app.post('/generate-plan', (req, res) => {
    const {constraints: constraintsWrapper, groupsList, guestsList, tablesList} = req.body;
    const {list: constraints} = constraintsWrapper;
    const file = getPredicatesFile(constraints, groupsList, guestsList, tablesList);
    const fileName = `${new Date().getTime()}.pl`;
    const filePath = `${ROOT}${fileName}`;
    const maybeCreateRootPromise = fs.promises.access(ROOT)
        .then(
            function(){},
            () => fs.promises.mkdir(ROOT, { recursive: true })
        );
    maybeCreateRootPromise
        .then(() => fs.promises.writeFile(filePath, file, {
            mode: 0o755
        }))
        .then(
            () => {
                const child = execFile(`${filePath}`, (err, stdOut, stdErr) => {
                    if (err) {
                        throw new Error(`Error while executing swipl \n${file}`, err);
                    }
                    res.send(stdOut);
                });
            },
            err => {
                throw new Error(`Cannot write file ${fileName}`, err);
            }
        )
});

const promiseFromChildProcess = (child) => {
    return new Promise(function (resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", resolve);
    });
}

const getPredicatesFile = (constraints, groupsList, guestsList, tablesList) => {
    const execFileMarker = '#!/usr/bin/env swipl';
    const importInstruction = ':-["../src/table_plan_ai"].';
    const tablesPredicates = getTablesPredicates(tablesList);
    const seatsPredicates = getSeatsPredicates(tablesList);
    const getGuestIdsList = getGuestIdsListFactory(groupsList, guestsList);
    const constraintsPredicates = getConstraintsPredicates(constraints, getGuestIdsList);
    const initialize = ':- initialization(main, main).';
    const main = `main(_):-seat_guests([${guestsList.reduce((acc, guest) => `${acc}, ${guest.id}`, guestsList[0].id)}], TP), get_json_table_plan(TP, JSON), write(JSON).`
    const file = [execFileMarker, importInstruction, tablesPredicates, seatsPredicates, constraintsPredicates, initialize, main]
        .reduce((acc, block) => `${acc}\n\n${block}`);
    return file;
}

const getTablesPredicates = (tablesList) => {
    return tablesList
        .map(table => `table(${table.id}, ${table.seatsWidth}).`)
        .reduce((acc, predicate) => `${acc}\n${predicate}`);
};

const getSeatsPredicates = (tablesList) => {
    return tablesList
        .map(table => {
            const {id:tableId, seatsWidth: nbSeats} = table;
            return [...Array(parseInt(nbSeats)).keys()]
                    .map(v => `seat(${tableId}, ${v}).`)
                    .reduce((acc, predicate) => `${acc}\n${predicate}`);
        })
        .reduce((acc, predicates) => `${acc}\n\n${predicates}`);
};

const getConstraintsPredicates = (constraints, getGuestIdsList) => {
    const constraintsWithDefaults = getConstraintsWithDefault(constraints);
    const contraintsByTypeWithDefaults = getConstraintsByType(constraintsWithDefaults);
    return contraintsByTypeWithDefaults
        .map(constraint => getConstraintPredicate(constraint, getGuestIdsList))
        .reduce((acc, predicate) => `${acc}\n${predicate}`);
}

const getDefaultConstraint = (type, affirmative) => {return {type, guestsIdList: [], groupsIdList: [], tablesIdList: [], affirmative}};

const getConstraintsWithDefault = (constraints) => {
    return Object.keys(ConstraintsTypes)
        .map(type => [getDefaultConstraint(type, true), getDefaultConstraint(type, false)])
        .reduce((acc, defaultsConstraints) => acc.concat(defaultsConstraints), constraints);
}

const getConstraintsByType = (constraints) => {
    return Object.keys(ConstraintsTypes)
        .map(type => {
            const posConstOfType = constraints.filter(constraint => constraint.type === type && constraint.affirmative);
            const negConstOfType = constraints.filter(constraint => constraint.type === type && !constraint.affirmative);
            return posConstOfType.concat(negConstOfType);
        })
        .reduce((acc, constraints) => acc.concat(constraints));
}

const getConstraintPredicate = (constraint, getGuestIdsList) => {
    const {type, affirmative, guestsIdList, groupsIdList, tablesIdList} = constraint;
    const guestIdsList = getGuestIdsList(guestsIdList, groupsIdList);
    const strGuestIdsList = guestIdsList.length > 0 ? guestIdsList.reduce((acc, guestId)=> `${acc}, ${guestId}`) : '';
    const predicateName = ConstraintsPredicateLabel[type] ? ConstraintsPredicateLabel[type][affirmative] : undefined;
    if (predicateName === undefined) {
        console.warn(`Cannot find predicate name for constraint type: ${type} and affirmative value: ${affirmative}`);
        return '';
    }
    switch(type) {
        case(ConstraintsTypes.BE_NEXT_TO):
        case(ConstraintsTypes.HAVE_EXCLUSIVE_TABLE):
        case(ConstraintsTypes.SEAT_AT_SAME_TABLE):
            return `${predicateName}([${strGuestIdsList}]).`;
        case(ConstraintsTypes.SEAT_AT_SPECIFIC_TABLE):
            const tableId = tablesIdList.length > 0 ? tablesIdList[0] : 'nil';
            return `${predicateName}([${strGuestIdsList}], ${tableId}).`;
        default:
            console.warb(`Unknown constraint type: ${type}`);
            return '';
    }
};

const getGuestIdsListFactory = (groupsList, guestsList) => {
    const groupToGuestsMap = groupsList.reduce((map, group) => {
        const {id:groupId} = group;
        const guestIdsList = guestsList
            .filter(guest => guest.groupId === groupId)
            .map(guest => guest.id);
        map[groupId] = guestIdsList;
        return map;
    }, {});

    const getGuestIdsList = (guestsIdsList, groupsIdsList) => {
        const arr =  groupsIdsList
            .map(groupId => groupToGuestsMap[groupId])
            .reduce((acc, guestIdsList) => acc.concat(guestIdsList), [])
            .concat(guestsIdsList);
        return [...new Set(arr)];
    }

    return getGuestIdsList;
};

const ConstraintsTypes = {
    BE_NEXT_TO: "BE_NEXT_TO",
    SEAT_AT_SAME_TABLE: "SEAT_AT_SAME_TABLE",
    SEAT_AT_SPECIFIC_TABLE: "SEAT_AT_SPECIFIC_TABLE",
    HAVE_EXCLUSIVE_TABLE: "HAVE_EXCLUSIVE_TABLE",
    HAVE_GROUP_EXCLUSIVE_TABLE: "HAVE_GROUP_EXCLUSIVE_TABLE"
};

const ConstraintsPredicateLabel = {
    BE_NEXT_TO: {true: "next_to", false:"not_next_to"},
    SEAT_AT_SAME_TABLE: {true:"same_table", false:"different_table"},
    SEAT_AT_SPECIFIC_TABLE: {true:"specific_table"},
    HAVE_EXCLUSIVE_TABLE: {true:"exclusive_table"},
    HAVE_GROUP_EXCLUSIVE_TABLE: {}
};

app.listen(8080);
