import express from 'express';
import bodyParser from 'body-parser';
import ConstraintsTypes from './ConstraintsTypes';

const app = express();
app.use(bodyParser.json());

app.post('/compute-table-plan', (req, res) => {
    const {constraints, groupsList, guestsList, tablesList} = req.body;
    const seatsPreducates = getSeatsPredicates(tablesList);
    const getGuestIdsList = getGuestIdsListFactory(groupsList, guestsList);
    const constraintsPredicates = getConstraintsPredicates(constraints, getGuestIdsList);
    res.send(`Hello ${name}`);
});

const getSeatsPredicates = (tablesList) => {
    return tablesList
        .map(table => {
            const {id:tableId, seatsWidth: nbSeats} = table;
            return Array(nbSeats)
                    .map((v, i) => `seat(${tableId}, ${i}).`)
                    .reduce((acc, predicate) => `${acc}\n${predicate}`);
        })
        .reduce((acc, predicates) => (acc, predicate) => `${acc}\n\n${predicates}`);
};

const getConstraintsPredicates = (constraints, getGuestIdsList) => {
    return constraints
        .map(getConstraintPredicate(constraint, getGuestIdsList))
        .reduce((acc, predicate) => `${acc}\n${predicate}`);
}

const getConstraintPredicate = (constraint, getGuestIdsList) => {
    const {type} = constraint;
    switch(type) {
        case(ConstraintsTypes.BE_NEXT_TO):
            return getBeNextToConstraint(constraint, getGuestIdsList);
        case(ConstraintsTypes.HAVE_EXCLUSIVE_TABLE):
            return getHaveExclusiveTableConstraint(constraint, getGuestIdsList);
        case(ConstraintsTypes.SEAT_AT_SAME_TABLE):
            return getSeatAtSameTableConstraint(constraint, getGuestIdsList);
        case(ConstraintsTypes.SEAT_AT_SPECIFIC_TABLE):
            return getSeatAtSpecificTableConstraint(constraint, getGuestIdsList);
        default:
            throw new Error(`Unknown constraint type: ${type}`);
    }
}

const getBeNextToConstraint = (constraint, getGuestIdsList) => {
    const {affirmative, guestsIdList, groupsIdList} = constraint;
    const predicateName = affirmative ? 'next_to' : 'not_next_to';
    const guestIdsList = getGuestIdsList(guestsIdList, groupsIdList);
    return `${predicateName}(${guestIdsList.reduce((acc, guestId)=> `${acc}, ${guestId}`)})`;
}

const getHaveExclusiveTableConstraint = (constraint, getGuestIdsList) => {

};

const getSeatAtSameTableConstraint = (constraint, getGuestIdsList) => {

};

const getSeatAtSpecificTableConstraint = (constraint, getGuestIdsList) => {

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
}

app.listen(8080);
