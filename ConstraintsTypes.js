export const ConstraintsTypes = {
    BE_NEXT_TO: "BE_NEXT_TO",
    SEAT_AT_SAME_TABLE: "SEAT_AT_SAME_TABLE",
    SEAT_AT_SPECIFIC_TABLE: "SEAT_AT_SPECIFIC_TABLE",
    HAVE_EXCLUSIVE_TABLE: "HAVE_EXCLUSIVE_TABLE",
    HAVE_GROUP_EXCLUSIVE_TABLE: "HAVE_GROUP_EXCLUSIVE_TABLE"
};

export const ConstraintsPredicateLabel = {
    BE_NEXT_TO: {true: "next_to", false:"not_next_to"},
    SEAT_AT_SAME_TABLE: {true:"same_table", false:"different_table"},
    SEAT_AT_SPECIFIC_TABLE: {true:"specific_table"},
    HAVE_EXCLUSIVE_TABLE: {true:"exclusive_table"},
    HAVE_GROUP_EXCLUSIVE_TABLE: {}
};