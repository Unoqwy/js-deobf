// / Control Flow Flattening

import { required_parent_of, parent_of, refactor_node } from "../utils";

import {
    ComputedMemberExpression,
    IdentifierExpression,
    Node,
    StaticMemberExpression,
    VariableDeclaration,
    VariableDeclarator,
} from "shift-ast";
import { copy } from "shift-refactor";
import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";

type MemberAbuseValue = MemberAbuseValueRaw | MemberAbuseValueFunction;

type MemberAbuseValueRaw = { type: "raw"; data: Node };

type BodyReplacements = { [identifier: string]: number };
type MemberAbuseValueFunction = {
    type: "function";
    data: {
        body_replacements: BodyReplacements;
        template: Node;
    };
};

type MemberAbuseMap = {
    name: string;
    delete_declarator: boolean;
    members: { [key: string]: MemberAbuseValue };
};

function member_abuse($tree: RefactorQueryAPI) {
    const $declarations = $tree("VariableDeclaration");
    const declaration_nodes = $declarations.nodes as VariableDeclaration[];
    for (const declaration of declaration_nodes) {
        const abuse_maps: { [key: string]: MemberAbuseMap } = {};
        const to_delete = [];
        for (const declarator of declaration.declarators) {
            const abuse_map = member_abuse_declarator(
                $declarations,
                declarator
            );
            if (abuse_map) {
                abuse_maps[abuse_map.name] = abuse_map;
                if (abuse_map.delete_declarator) {
                    to_delete.push(declarator);
                }
            }
        }

        let $parent = required_parent_of($tree, declaration);
        if ($parent.nodes[0].type == "VariableDeclarationStatement") {
            $parent = required_parent_of($tree, $parent.nodes[0]);
        }
        member_abuse_handle_references($tree, $parent, abuse_maps);

        // shift-refactor already handles deleting the declaration
        to_delete.forEach(node => $declarations.$(node).delete());
    }
}

function member_abuse_handle_references(
    $tree: RefactorQueryAPI,
    $parent: RefactorQueryAPI,
    abuse_maps: { [key: string]: MemberAbuseMap }
) {
    const $map_accessors = $parent(
        "StaticMemberExpression, ComputedMemberExpression"
    );
    const map_accessor_nodes = $map_accessors.nodes as (
        | StaticMemberExpression
        | ComputedMemberExpression
    )[];
    for (const map_accessor of map_accessor_nodes) {
        let map_name, member_name;
        if (map_accessor.object.type == "IdentifierExpression") {
            map_name = map_accessor.object.name;
        } else {
            continue;
        }

        if (map_accessor.type == "StaticMemberExpression") {
            member_name = map_accessor.property;
        } else if (
            map_accessor.type == "ComputedMemberExpression" &&
            map_accessor.expression.type == "LiteralStringExpression"
        ) {
            member_name = map_accessor.expression.value;
        } else {
            continue;
        }

        const map_value = abuse_maps[map_name]?.members[member_name];
        if (map_value === undefined) {
            continue;
        }

        if (map_value.type == "raw") {
            const $query = $map_accessors.$(map_accessor);
            $query.replace(map_value.data);
        } else if (map_value.type == "function") {
            const $parent = parent_of($tree, map_accessor);
            if ($parent?.nodes[0]?.type != "CallExpression") {
                continue;
            }

            console.log("before", $parent.codegen());

            const identifiers_remap = map_value.data.body_replacements;
            console.log(identifiers_remap);
            console.log(map_value.data.template);
            const params = $parent.nodes[0].arguments;
            const refactored_node = refactor_node(
                copy(map_value.data.template),
                $replacement_tree => {
                    const $identifiers = $replacement_tree(
                        "IdentifierExpression"
                    );
                    for (const identifier of $identifiers.nodes as IdentifierExpression[]) {
                        if (identifier.name in identifiers_remap) {
                            const identifier_remap =
                                params[identifiers_remap[identifier.name]];
                            if (!identifier_remap) {
                                throw new Error(
                                    "Body replacements do not match the number of function parameters"
                                );
                            }
                            const $query = $identifiers.$(identifier);
                            $query.replace(identifier_remap);
                        }
                    }

                    member_abuse_handle_references(
                        $replacement_tree,
                        $replacement_tree,
                        abuse_maps
                    );
                }
            );

            $parent.replace(refactored_node);
        }
    }
}

function member_abuse_declarator(
    $parent: RefactorQueryAPI,
    declarator: VariableDeclarator
): MemberAbuseMap | undefined {
    if (
        declarator.binding.type == "BindingIdentifier" &&
        declarator?.init?.type == "ObjectExpression"
    ) {
        const $query = $parent.$(declarator);
        const map_name = declarator.binding.name;
        const map_members = declarator.init.properties;

        let handled_members: [string, MemberAbuseValue, any][] = [];
        it: for (const map_member of map_members) {
            if (map_member.type != "DataProperty") {
                continue;
            }

            const property_name =
                map_member.name.type == "StaticPropertyName"
                    ? map_member.name.value
                    : undefined;
            if (!property_name) {
                continue;
            }

            let member_value;
            const property_value = copy(map_member.expression);
            sw: switch (property_value.type) {
                case "LiteralStringExpression":
                case "LiteralNumericExpression":
                case "LiteralBooleanExpression":
                case "LiteralNullExpression":
                case "LiteralInfinityExpression":
                    member_value = {
                        type: "raw",
                        data: property_value as Node,
                    };
                    break;
                case "FunctionExpression":
                    const body_statements = property_value.body.statements;
                    if (
                        body_statements.length != 1 ||
                        body_statements[0].type != "ReturnStatement"
                    ) {
                        continue it;
                    }

                    const items = property_value.params.items;
                    const body_replacements: BodyReplacements = {};
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.type != "BindingIdentifier") {
                            break sw;
                        }
                        body_replacements[item.name] = i;
                    }

                    const template = body_statements[0].expression;
                    member_value = {
                        type: "function",
                        data: {
                            body_replacements,
                            template,
                        },
                    };
                    break;
                default:
                    continue it;
            }
            handled_members.push([
                property_name,
                member_value as MemberAbuseValue,
                map_member,
            ]);
        }

        const delete_declarator = handled_members.length == map_members.length;
        if (!delete_declarator) {
            handled_members.forEach(([_name, _value, node]) =>
                $query.$(node).delete()
            );
        }

        const members = handled_members.reduce(
            (o, [name, value, _node]) => ({ ...o, [name]: value }),
            {}
        );
        return {
            name: map_name,
            delete_declarator,
            members,
        };
    }
    return undefined;
}

export default {
    "member-abuse": member_abuse,
};
