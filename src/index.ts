import * as fs from "fs";

import chalk from "chalk";

import { refactor } from "shift-refactor";
import reverse, { ReverseContext } from "./reverse";
import { VM } from "vm2";

const input_file = process.argv[2] || "input.js";
const original_source = fs.readFileSync(input_file, { encoding: "utf-8" });

const $tree = refactor(original_source);
const vm = new VM({
    timeout: 20,
});
const ctx = new ReverseContext($tree, vm);

for (const group of Object.values(reverse.groups)) {
    console.log(chalk.dim(`* ${group.display_name}`));
    for (const fn of group.methods) {
        const prefix = chalk.blue(`[${fn.name}] `);
        process.stdout.write(prefix + "Attempting to reverse..");
        fn(ctx);
        process.stdout.cursorTo(0);
        process.stdout.write(prefix + "OK ✓");
        process.stdout.clearLine(1);
        process.stdout.write("\n");
    }
}

fs.writeFileSync("output.js", $tree.print(), { encoding: "utf-8" });
console.log(
    chalk.green("File 'output.js' has been written with (hopefully) deobfuscated contents.")
);
