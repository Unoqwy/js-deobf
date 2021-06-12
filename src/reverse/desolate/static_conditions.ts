import { IfStatement } from "shift-ast";
import { ReverseContext } from "..";
import { replaceByNodes } from "../../utils";

export function static_conditions(ctx: ReverseContext) {
    const $conditions = ctx.$tree("IfStatement");
    // reverse allows to go from right to left (and bottom to top), avoiding recursion
    for (const condition_stmt of $conditions.nodes.reverse() as IfStatement[]) {
        const $condition_stmt = $conditions.$(condition_stmt);
        const test = $condition_stmt.$(condition_stmt.test).codegen();
        try {
            const static_bool = ctx.vm.run(`Boolean(${test})`);
            const statements_scope: any = static_bool ? condition_stmt.consequent : condition_stmt.alternate;
            const statements = statements_scope ? statements_scope.block?.statements ?? [statements_scope] : undefined;
            if (statements) {
                statements.reverse();
                replaceByNodes($condition_stmt, statements);
            } else {
                $condition_stmt.delete();
            }
        } catch (_) {
            continue;
        }
    }
}
