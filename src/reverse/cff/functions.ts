import { ComputedMemberExpression, StaticMemberExpression } from "shift-ast";
import { ReverseContext } from "..";
import { parseScript } from "shift-parser";

export function computed_to_static_fn_object(ctx: ReverseContext) {
    const $exprs = ctx.$tree(
        "CallExpression > ComputedMemberExpression[expression.type='LiteralStringExpression']"
    );
    for (const expr of $exprs.nodes as ComputedMemberExpression[]) {
        if (expr.expression.type != "LiteralStringExpression") {
            // useless check that makes TSC happy
            continue;
        }

        const function_name = expr.expression.value;
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
