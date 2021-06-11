import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";
import { VM } from "vm2";
import { computed_to_static_fn_object } from "./cff/functions";

import { member_abuse } from "./cff/member-abuse";
import { order_switch } from "./cff/switch";
import { static_conditions } from "./misc/static_conditions";

interface Reverse {
    groups: { [group: string]: Group };
}

interface Group {
    display_name: string;
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
            methods: [member_abuse, order_switch, computed_to_static_fn_object],
        },
        misc: {
            display_name: "Miscellaneous",
            // TODO: is this the right group for static conditions?
            methods: [static_conditions],
        },
    },
};
export default reverse;
