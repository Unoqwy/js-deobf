import { FunctionDeclaration, VariableDeclarator } from "shift-ast";
import { copy } from "shift-refactor";
import { ReverseContext } from "..";
import { requiredParentOf } from "../../utils";

export function fn_vars_unwrap(ctx: ReverseContext) {
    const $declarators = ctx.$tree(
        "VariableDeclarationStatement > VariableDeclaration > VariableDeclarator[binding.type='BindingIdentifier'][init.type='FunctionExpression']"
    );
    for (const declarator of $declarators.nodes as VariableDeclarator[]) {
        const $var_declaration_stmt = requiredParentOf(ctx.$tree, requiredParentOf(ctx.$tree, declarator).nodes[0]);
        const $declarator = $declarators.$(declarator);

        const fn_declaration_opts = copy(declarator.init);
        delete fn_declaration_opts.type;
        fn_declaration_opts.name = copy(declarator.binding);
        $var_declaration_stmt.append(new FunctionDeclaration(fn_declaration_opts));
        $declarator.delete();
    }
}
