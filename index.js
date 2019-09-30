import express from 'express';
import bodyParser from 'body-parser';
import {fs} from 'fs';
import { exec } from 'child_process';
import {ConstraintsTypes, ConstraintsPredicateLabel} from './ConstraintsTypes';

const app = express();
app.use(bodyParser.json());

app.post('/compute-table-plan', (req, res) => {
    const {constraints, groupsList, guestsList, tablesList} = req.body;
    const importInstruction = ':-[./src/table_plan_ai].';
    const tablesPredicates = getTablesPredicates(tablesList);
    const seatsPredicates = getSeatsPredicates(tablesList);
    const getGuestIdsList = getGuestIdsListFactory(groupsList, guestsList);
    const constraintsPredicates = getConstraintsPredicates(constraints, getGuestIdsList);
    const computeTablePlanInstruction = `:-seat_guests([
                                        ${guestsList.map(guest => guest.id).reduce((acc, guestId)=> `${acc}, ${guestId}`)}
                                        ], S), print_table_plan(S), halt.`
    const file = [importInstruction, tablesPredicates, seatsPredicates, constraintsPredicates, computeTablePlanInstruction]
        .reduce((acc, block) => `${acc}\n\n${block}`);
    fs.writeFile('~/table-plan-ai/temp/toto.pl', file, (err) => {
        if(err) {
            throw(err);
        }
        exec('swipl -s ~/table-plan-ai/temp/toto.pl', (err, stdout, stderr) => {
            if (err) {
                throw(err);
            }
            res.send(stdout);
        });

    })
    res.send(`Hello ${name}`);
});

const getTablesPredicates = (tablesList) => {
    return tablesList
        .map(table => `table(${table.id}, ${table.seatWidth}).`)
        .reduce((acc, predicate) => `${acc}\n${predicate}`);
};

const getSeatsPredicates = (tablesList) => {
    return tablesList
        .map(table => {
            const {id:tableId, seatsWidth: nbSeats} = table;
            return Array(nbSeats)
                    .map((v, i) => `seat(${tableId}, ${i}).`)
                    .reduce((acc, predicate) => `${acc}\n${predicate}`);
        })
        .reduce((acc, predicates) => `${acc}\n\n${predicates}`);
};

const getConstraintsPredicates = (constraints, getGuestIdsList) => {
    return constraints
        .map(constraint => getConstraintPredicate(constraint, getGuestIdsList))
        .reduce((acc, predicate) => `${acc}\n${predicate}`);
}

const getConstraintPredicate = (constraint, getGuestIdsList) => {
    const {type, affirmative, guestsIdList, groupsIdList} = constraint;
    const guestIdsList = getGuestIdsList(guestsIdList, groupsIdList);
    const predicateName = ConstraintsPredicateLabel[type] ? ConstraintsPredicateLabel[type][affirmative] : undefined;
    if (predicateName === undefined) {
        throw new Error(`Cannot find predicate name for constraint type: ${type}`);
    }
    switch(type) {
        case(ConstraintsTypes.BE_NEXT_TO):
        case(ConstraintsTypes.HAVE_EXCLUSIVE_TABLE):
        case(ConstraintsTypes.SEAT_AT_SAME_TABLE):
            return `${predicateName}([${guestIdsList.reduce((acc, guestId)=> `${acc}, ${guestId}`)}]).`;
        case(ConstraintsTypes.SEAT_AT_SPECIFIC_TABLE):
            return `${predicateName}([${guestIdsList.reduce((acc, guestId)=> `${acc}, ${guestId}`)}], ${tablesIdList[0]}).`;
        default:
            throw new Error(`Unknown constraint type: ${type}`);
    }
};

const getGuestIdsListFactory = (groupsList, guestsList) => {
    const groupToGuestsMap = groupsList.reduce((map, group) => {
        const {groupId} = group;
        map[groupId].guestIdsList = guestsList
            .filter(guest => guest.groupId === groupId)
            .map(guest => guest.id);
        return map;
    });

    const getGuestIdsList = (guestsIdsList, groupsIdsList) => {
        const arr =  groupsIdsList
            .map(groupId => groupToGuestsMap[groupId].guestIdsList)
            .reduce((acc, guestIdsList) => acc.concat(guestIdsList))
            .concat(guestsIdsList);
        return [...new Set(arr)];
    }

    return getGuestIdsList;
};

app.listen(8080);
