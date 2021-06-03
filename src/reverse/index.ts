import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";

import { member_abuse } from "./cff/member-abuse";

interface Reverse {
    groups: { [group: string]: Group };
}

interface Group {
    display_name: string;
    methods: (($tree: RefactorQueryAPI) => void)[];
}

const reverse: Reverse = {
    groups: {
        cff: {
            display_name: "Control Flow Flattening",
            methods: [member_abuse],
        },
    },
};
export default reverse;
