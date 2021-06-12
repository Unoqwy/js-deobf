import { LiteralBooleanExpression, VariableDeclarator, WhileStatement, SwitchCase } from "shift-ast";
import { ReverseContext } from "..";
import { parentOf, replaceByNodes } from "../../utils";

export function order_switch(ctx: ReverseContext) {
    const $while_loops = ctx.$tree("WhileStatement");
    for (const while_loop of $while_loops.nodes as WhileStatement[]) {
        const $while = $while_loops.$(while_loop);
        const $test = $while.$(while_loop.test);

        let static_bool;
        try {
            static_bool = ctx.vm.run(`Boolean(${$test.codegen()})`);
        } catch (_) {
            continue;
        }

        if (!static_bool) {
            $while.delete();
            continue;
        }

        let switch_stmt,
            was_cff = false;
        if (
            while_loop.body.type == "BlockStatement" &&
            (switch_stmt = while_loop.body.block.statements[0])?.type == "SwitchStatement" &&
            switch_stmt.discriminant.type == "ComputedMemberExpression" &&
            switch_stmt.discriminant.object.type == "IdentifierExpression" &&
            switch_stmt.discriminant.expression.type == "UpdateExpression"
        ) {
            const $parent = parentOf(ctx.$tree, while_loop);
            if (!$parent) {
                continue;
            }

            const order_screwer_id = switch_stmt.discriminant.object.name;
            const $declarators = $parent(`VariableDeclarator[binding.name='${order_screwer_id}']`);
            for (const declarator of $declarators.nodes as VariableDeclarator[]) {
                if (
                    declarator.init?.type == "CallExpression" &&
                    ((declarator.init.callee.type == "ComputedMemberExpression" &&
                        declarator.init.callee.expression.type == "LiteralStringExpression" &&
                        declarator.init.callee.expression.value == "split") ||
                        (declarator.init.callee.type == "StaticMemberExpression" &&
                            declarator.init.callee.property == "split")) &&
                    declarator.init.callee.object.type == "LiteralStringExpression" &&
                    declarator.init.arguments[0]?.type == "LiteralStringExpression"
                ) {
                    const order_string = declarator.init.callee.object.value;
                    const order_string_splitter = declarator.init.arguments[0].value;
                    const cases_order = order_string.split(order_string_splitter);

                    const mapped_cases: { [switch_case: string]: SwitchCase } = {};
                    for (const switch_case of switch_stmt.cases) {
                        if (switch_case.test.type == "LiteralStringExpression") {
                            mapped_cases[switch_case.test.value] = switch_case;
                        }
                    }

                    const statements = [];
                    for (const case_name of cases_order) {
                        if (!(case_name in mapped_cases)) {
                            continue;
                        }
                        statements.push(...mapped_cases[case_name].consequent.slice(0, -1));
                    }
                    statements.reverse();

                    if (switch_stmt.discriminant.expression.operand.type == "AssignmentTargetIdentifier") {
                        const counter_id = switch_stmt.discriminant.expression.operand.name;
                        $parent(`VariableDeclarator[binding.name='${counter_id}']`).delete();
                    }
                    $parent.$(declarator).delete();
                    replaceByNodes($while, statements);

                    was_cff = true;
                    break;
                }
            }
        }

        if (!was_cff) {
            $test.replace(new LiteralBooleanExpression({ value: static_bool }));
        }
    }
}
