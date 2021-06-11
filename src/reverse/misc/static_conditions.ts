import { IfStatement } from "shift-ast";
import { ReverseContext } from "..";
import { replaceByStatements } from "../../utils";

export function static_conditions(ctx: ReverseContext) {
    const $conditions = ctx.$tree("IfStatement");
    for (const condition_stmt of $conditions.nodes as IfStatement[]) {
        const $condition_stmt = $conditions.$(condition_stmt);

        const test = $condition_stmt.$(condition_stmt.test).codegen();
        let statements;
        if (condition_stmt.consequent.type == "BlockStatement") {
            statements = condition_stmt.consequent.block.statements;
        } else {
            continue;
        }

        try {
            const static_bool = ctx.vm.run(`Boolean(${test})`);
            if (static_bool) {
                replaceByStatements($condition_stmt, statements);
            } else {
                $condition_stmt.delete();
            }
        } catch (_) {
            continue;
        }
    }
}
