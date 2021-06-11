import { ComputedMemberExpression, LiteralStringExpression, StaticMemberExpression } from "shift-ast";
import { parseScript } from "shift-parser";
import { ReverseContext } from "..";

export function computer_to_static_members(ctx: ReverseContext) {
    const $exprs = ctx.$tree("ComputedMemberExpression[expression.type='LiteralStringExpression']");
    for (const expr of $exprs.nodes as ComputedMemberExpression[]) {
        const function_name = (expr.expression as LiteralStringExpression).value;
        try {
            parseScript(`function ${function_name}(){}`);
        } catch (_) {
            continue;
        }
        $exprs.$(expr).replace(
            new StaticMemberExpression({
                object: expr.object,
                property: function_name,
            })
        );
    }
}
