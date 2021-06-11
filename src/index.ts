import * as fs from "fs";

import { ArgumentParser } from "argparse";
import chalk from "chalk";

import { VM } from "vm2";
import { refactor } from "shift-refactor";
import reverse, { ReverseContext } from "./reverse";

const parser = new ArgumentParser({
    description: "An experimental JavaScript deobfuscator using shift(-refactor)",
});
parser.add_argument("-V", "--version", { action: "version", version: "0.1.0" });
parser.add_argument("input", {
    help: "Input obfuscated file (must be valid JS without errors)",
    type: "str",
});
parser.add_argument("-o", "--output", {
    help: "Output file to write deobfuscated contents (if not specified, outputs to stdout)",
    type: "str",
});
parser.add_argument("--ignore", { help: "Ignore specific deobfuscation methods", nargs: "*" });

const args = parser.parse_args();
const ignore_methods = args.ignore ?? [];

const show_progress = process.stdout.isTTY;
try {
    const original_source = fs.readFileSync(args.input, { encoding: "utf-8" });
    const $tree = refactor(original_source);

    const vm = new VM({
        timeout: 20,
    });
    const ctx = new ReverseContext($tree, vm);

    for (const group of Object.values(reverse.groups)) {
        const methods = group.methods.filter(fn => !ignore_methods.includes(fn.name));
        if (methods.length == 0) {
            continue;
        }

        if (show_progress) {
            console.log(chalk.dim(`* ${group.display_name}`));
        }
        for (const fn of methods) {
            const prefix = chalk.blue(`[${fn.name}] `);
            if (show_progress) {
                process.stdout.write(prefix + "Attempting to reverse..");
            }
            fn(ctx);
            if (show_progress) {
                process.stdout.cursorTo(0);
                process.stdout.write(prefix + "OK ✓");
                process.stdout.clearLine(1);
                process.stdout.write("\n");
            }
        }
    }

    const deobf_source: string = $tree.print();
    if (args.output !== undefined) {
        const output_file = args.output;
        fs.writeFileSync(output_file, deobf_source, { encoding: "utf-8" });
        console.log(
            chalk.green(
                `File '${output_file}' has been written with (hopefully) deobfuscated contents.`
            )
        );
    } else {
        if (show_progress) {
            console.log();
            console.log(
                chalk.yellow("Output:"),
                chalk.dim("(pipe the output (e.g. to cat) to only print output)")
            );
        }
        console.log(deobf_source.trimEnd());
    }
} catch (error) {
    if (error.code === "ENOENT") {
        console.log(chalk.redBright(`The given input file ('${error.path}') does not exist.`));
    } else {
        console.log(chalk.red(error));
    }
}
