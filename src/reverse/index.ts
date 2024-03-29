import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";
import { VM } from "vm2";
import { unchain_comma_exprs } from "./cff/commas";

import { member_abuse } from "./cff/member-abuse";
import { computer_to_static_members } from "./cff/member-misc";
import { order_switch } from "./cff/switch";
import { static_conditions } from "./desolate/static_conditions";
import { fn_vars_unwrap } from "./transform/vars";

interface Reverse {
    groups: { [group: string]: Group };
}

interface Group {
    display_name: string;
    description: string;
    methods: ((ctx: ReverseContext) => void)[];
}

export class ReverseContext {
    $tree: RefactorQueryAPI;
    vm: VM;

    constructor($tree: RefactorQueryAPI, vm: VM) {
        this.$tree = $tree;
        this.vm = vm;
    }
}

const reverse: Reverse = {
    groups: {
        cff: {
            display_name: "Control Flow Flattening",
            description: "Structure transformations making the code harder to read",
            methods: [member_abuse, order_switch, unchain_comma_exprs, computer_to_static_members],
        },
        desolate: {
            display_name: "Desolate",
            description: "Code that is never executed or has static values to increase the indent level",
            methods: [static_conditions],
        },
        transform: {
            display_name: "Transform",
            description: "Miscellaneous transformations impacting code readability",
            methods: [fn_vars_unwrap],
        },
    },
};
export default reverse;
