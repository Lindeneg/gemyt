import type {Token} from "./token.js";

export interface Node {
    token: Token;
}

export interface Program {
    statements: Statement[];
}

export type Statement =
    | LetStatement
    | ConstStatement
    | ReturnStatement
    | BreakStatement
    | ExpressionStatement
    | BlockStatement;

export interface LetStatement extends Node {
    kind: "LetStatement";
    name: Identifier;
    value: Expression;
}

export interface ConstStatement extends Node {
    kind: "ConstStatement";
    name: Identifier;
    value: Expression;
}

export interface ReturnStatement extends Node {
    kind: "ReturnStatement";
    value: Expression;
}

export interface BreakStatement extends Node {
    kind: "BreakStatement";
}

export interface ExpressionStatement extends Node {
    kind: "ExpressionStatement";
    expression: Expression;
}

export interface BlockStatement extends Node {
    kind: "BlockStatement";
    statements: Statement[];
}

export type Expression =
    | Identifier
    | IntegerLiteral
    | FloatLiteral
    | StringLiteral
    | BooleanLiteral
    | NullLiteral
    | ArrayLiteral
    | DictLiteral
    | PrefixExpression
    | InfixExpression
    | IfExpression
    | WhileExpression
    | ForEachExpression
    | FunctionLiteral
    | CallExpression
    | IndexExpression
    | DotExpression
    | PipeExpression
    | MatchExpression
    | OkExpression
    | ErrExpression;

export interface Identifier extends Node {
    kind: "Identifier";
    value: string;
}

export interface IntegerLiteral extends Node {
    kind: "IntegerLiteral";
    value: number;
}

export interface FloatLiteral extends Node {
    kind: "FloatLiteral";
    value: number;
}

export interface StringLiteral extends Node {
    kind: "StringLiteral";
    value: string;
}

export interface BooleanLiteral extends Node {
    kind: "BooleanLiteral";
    value: boolean;
}

export interface NullLiteral extends Node {
    kind: "NullLiteral";
}

export interface ArrayLiteral extends Node {
    kind: "ArrayLiteral";
    elements: Expression[];
}

export interface DictLiteral extends Node {
    kind: "DictLiteral";
    pairs: Map<Expression, Expression>;
}

export interface PrefixExpression extends Node {
    kind: "PrefixExpression";
    operator: string;
    right: Expression;
}

export interface InfixExpression extends Node {
    kind: "InfixExpression";
    left: Expression;
    operator: string;
    right: Expression;
}

export interface IfExpression extends Node {
    kind: "IfExpression";
    condition: Expression;
    consequence: BlockStatement;
    alternative?: BlockStatement | IfExpression;
}

export interface WhileExpression extends Node {
    kind: "WhileExpression";
    condition: Expression;
    body: BlockStatement;
}

export interface ForEachExpression extends Node {
    kind: "ForEachExpression";
    value: Identifier;
    index?: Identifier;
    iterable: Expression;
    body: BlockStatement;
}

export interface FunctionLiteral extends Node {
    kind: "FunctionLiteral";
    params: Identifier[];
    body: BlockStatement;
}

export interface CallExpression extends Node {
    kind: "CallExpression";
    function: Expression;
    args: Expression[];
}

export interface IndexExpression extends Node {
    kind: "IndexExpression";
    left: Expression;
    index: Expression;
}

export interface DotExpression extends Node {
    kind: "DotExpression";
    left: Expression;
    field: Identifier;
}

export interface PipeExpression extends Node {
    kind: "PipeExpression";
    left: Expression;
    right: Expression;
}

export interface MatchArm {
    pattern: Expression;
    body: Expression;
}

export interface MatchExpression extends Node {
    kind: "MatchExpression";
    subject: Expression;
    arms: MatchArm[];
}

export interface OkExpression extends Node {
    kind: "OkExpression";
    value: Expression;
}

export interface ErrExpression extends Node {
    kind: "ErrExpression";
    value: Expression;
}

export function stringify(node: Statement | Expression): string {
    switch (node.kind) {
        case "LetStatement":
            return `lad ${stringify(node.name)} = ${stringify(node.value)};`;
        case "ConstStatement":
            return `stabil ${stringify(node.name)} = ${stringify(node.value)};`;
        case "ReturnStatement":
            return `giv ${stringify(node.value)};`;
        case "BreakStatement":
            return "bryd;";
        case "ExpressionStatement":
            return `${stringify(node.expression)};`;
        case "BlockStatement":
            return `{ ${node.statements.map(stringify).join(" ")} }`;
        case "Identifier":
            return node.value;
        case "IntegerLiteral":
            return String(node.value);
        case "FloatLiteral":
            return String(node.value);
        case "StringLiteral":
            return `"${node.value}"`;
        case "BooleanLiteral":
            return node.value ? "ja" : "nej";
        case "NullLiteral":
            return "intet";
        case "ArrayLiteral":
            return `[${node.elements.map(stringify).join(", ")}]`;
        case "DictLiteral": {
            const pairs = [...node.pairs.entries()]
                .map(([k, v]) => `${stringify(k)}: ${stringify(v)}`)
                .join(", ");
            return `{${pairs}}`;
        }
        case "PrefixExpression":
            return `(${node.operator}${stringify(node.right)})`;
        case "InfixExpression":
            return `(${stringify(node.left)} ${node.operator} ${stringify(node.right)})`;
        case "IfExpression": {
            let out = `hvis (${stringify(node.condition)}) ${stringify(node.consequence)}`;
            if (node.alternative) out += ` ellers ${stringify(node.alternative)}`;
            return out;
        }
        case "WhileExpression":
            return `mens (${stringify(node.condition)}) ${stringify(node.body)}`;
        case "ForEachExpression": {
            const idx = node.index ? `, ${stringify(node.index)}` : "";
            return `kør ${stringify(node.value)}${idx} af ${stringify(node.iterable)} ${stringify(node.body)}`;
        }
        case "FunctionLiteral":
            return `gør(${node.params.map(stringify).join(", ")}) ${stringify(node.body)}`;
        case "CallExpression":
            return `${stringify(node.function)}(${node.args.map(stringify).join(", ")})`;
        case "IndexExpression":
            return `(${stringify(node.left)}[${stringify(node.index)}])`;
        case "DotExpression":
            return `${stringify(node.left)}.${stringify(node.field)}`;
        case "PipeExpression":
            return `(${stringify(node.left)} |> ${stringify(node.right)})`;
        case "MatchExpression": {
            const arms = node.arms
                .map((a) => `${stringify(a.pattern)} => ${stringify(a.body)}`)
                .join(", ");
            return `prøv ${stringify(node.subject)} { ${arms} }`;
        }
        case "OkExpression":
            return `fint ${stringify(node.value)}`;
        case "ErrExpression":
            return `øv ${stringify(node.value)}`;
    }
}

export function stringifyProgram(program: Program): string {
    return program.statements.map(stringify).join(" ");
}
