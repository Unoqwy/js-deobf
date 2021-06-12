import { BinaryExpression, Block, BlockStatement, ExpressionStatement } from "shift-ast";
import { ReverseContext } from "..";
import { replaceByNodes, requiredParentOf } from "../../utils";

export function unchain_comma_exprs(ctx: ReverseContext) {
    const $chains = ctx.$tree("ExpressionStatement > BinaryExpression[operator=',']");
    for (const chain of $chains.nodes.reverse() as BinaryExpression[]) {
        const $expr = requiredParentOf($chains, chain);

        let chain_cursor: BinaryExpression | undefined = chain;
        const statements = [];
        do {
            statements.push(
                new ExpressionStatement({
                    expression: chain_cursor.right,
                })
            );
            if (chain_cursor.left.type === "BinaryExpression" && chain_cursor.left.operator == ",") {
                chain_cursor = chain_cursor.left;
            } else {
                statements.push(
                    new ExpressionStatement({
                        expression: chain_cursor.left,
                    })
                );
                chain_cursor = undefined;
            }
        } while (chain_cursor !== undefined);

        const parent_type = requiredParentOf(ctx.$tree, $expr.nodes[0]).nodes[0].type;
        switch (parent_type) {
            case "Script":
            case "FunctionBody":
            case "Block":
                replaceByNodes($expr, statements);
                break;
            case "IfStatement":
            case "WhileStatement":
            case "ForStatement":
                statements.reverse();
                $expr.replace(
                    new BlockStatement({
                        block: new Block({
                            statements: statements,
                        }),
                    })
                );
                break;
        }
    }
}
