import * as fs from "fs";
import {refactor} from "shift-refactor";

import cff from "./reverse/cff";

const input_file = process.argv[2] || "input.js";
const original_source = fs.readFileSync(input_file, {encoding: "utf-8"});

const $tree = refactor(original_source);
cff["member-abuse"]($tree);

const new_source = $tree.print();
fs.writeFileSync("output.js", new_source, {encoding: "utf-8"});
console.log("Done");
