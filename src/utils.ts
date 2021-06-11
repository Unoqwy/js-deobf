import { Module, Node, Statement } from "shift-ast";
import { refactor } from "shift-refactor";
import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";

export function parentOf($tree: RefactorQueryAPI, node: Node): RefactorQueryAPI | null {
    const $parents = $tree.$($tree.session.findParents(node));
    if ($parents.nodes.length != 1) {
        return null;
    }
    return $parents;
}

export function requiredParentOf($tree: RefactorQueryAPI, node: Node): RefactorQueryAPI {
    const $parent = parentOf($tree, node);
    if ($parent == null) {
        throw new Error("Expected node to have 1 parent");
    }
    return $parent as RefactorQueryAPI;
}

export function refactorNode(node: Node, refactor_fn: ($tree: RefactorQueryAPI) => void): Node {
    // @ts-ignore it works fine
    const $tree = refactor(new Module({ items: [node], directives: [] }));
    refactor_fn($tree.$(node));
    // @ts-ignore and here too
    return $tree.nodes[0].items[0];
}

export function replaceByStatements($tree: RefactorQueryAPI, statements: Statement[]) {
    statements.forEach($tree.append.bind($tree));
    $tree.delete();
}
