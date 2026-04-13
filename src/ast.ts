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
    | AssignExpression
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

export interface AssignExpression extends Node {
    kind: "AssignExpression";
    target: Expression;
    value: Expression;
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

const ZERO_TOKEN: Token = {kind: 0, literal: "", line: 0, col: 0};

export function makeProgram(statements: Statement[] = []): Program {
    return {statements};
}

export function makeIdentifier(token = ZERO_TOKEN, value = token.literal): Identifier {
    return {kind: "Identifier", token, value};
}

export function makeIntegerLiteral(token = ZERO_TOKEN, value = 0): IntegerLiteral {
    return {kind: "IntegerLiteral", token, value};
}

export function makeFloatLiteral(token = ZERO_TOKEN, value = 0): FloatLiteral {
    return {kind: "FloatLiteral", token, value};
}

export function makeStringLiteral(token = ZERO_TOKEN, value = token.literal): StringLiteral {
    return {kind: "StringLiteral", token, value};
}

export function makeBooleanLiteral(token = ZERO_TOKEN, value = false): BooleanLiteral {
    return {kind: "BooleanLiteral", token, value};
}

export function makeNullLiteral(token = ZERO_TOKEN): NullLiteral {
    return {kind: "NullLiteral", token};
}

export function makeArrayLiteral(token = ZERO_TOKEN, elements: Expression[] = []): ArrayLiteral {
    return {kind: "ArrayLiteral", token, elements};
}

export function makeDictLiteral(
    token = ZERO_TOKEN,
    pairs: Map<Expression, Expression> = new Map()
): DictLiteral {
    return {kind: "DictLiteral", token, pairs};
}

export function makeBlockStatement(
    token = ZERO_TOKEN,
    statements: Statement[] = []
): BlockStatement {
    return {kind: "BlockStatement", token, statements};
}

export function makeLetStatement(
    token = ZERO_TOKEN,
    name = makeIdentifier(),
    value: Expression = makeIdentifier()
): LetStatement {
    return {kind: "LetStatement", token, name, value};
}

export function makeConstStatement(
    token = ZERO_TOKEN,
    name = makeIdentifier(),
    value: Expression = makeIdentifier()
): ConstStatement {
    return {kind: "ConstStatement", token, name, value};
}

export function makeReturnStatement(
    token = ZERO_TOKEN,
    value: Expression = makeIdentifier()
): ReturnStatement {
    return {kind: "ReturnStatement", token, value};
}

export function makeBreakStatement(token = ZERO_TOKEN): BreakStatement {
    return {kind: "BreakStatement", token};
}

export function makeExpressionStatement(
    token = ZERO_TOKEN,
    expression: Expression = makeIdentifier()
): ExpressionStatement {
    return {kind: "ExpressionStatement", token, expression};
}

export function makeAssignExpression(
    token = ZERO_TOKEN,
    target: Expression = makeIdentifier(),
    value: Expression = makeIdentifier()
): AssignExpression {
    return {kind: "AssignExpression", token, target, value};
}

export function makePrefixExpression(
    token = ZERO_TOKEN,
    operator = token.literal,
    right: Expression = makeIdentifier()
): PrefixExpression {
    return {kind: "PrefixExpression", token, operator, right};
}

export function makeInfixExpression(
    token = ZERO_TOKEN,
    left: Expression = makeIdentifier(),
    operator = token.literal,
    right: Expression = makeIdentifier()
): InfixExpression {
    return {kind: "InfixExpression", token, left, operator, right};
}

export function makeIfExpression(
    token = ZERO_TOKEN,
    condition: Expression = makeIdentifier(),
    consequence = makeBlockStatement(),
    alternative?: BlockStatement | IfExpression
): IfExpression {
    const expr: IfExpression = {kind: "IfExpression", token, condition, consequence};
    if (alternative !== undefined) expr.alternative = alternative;
    return expr;
}

export function makeWhileExpression(
    token = ZERO_TOKEN,
    condition: Expression = makeIdentifier(),
    body = makeBlockStatement()
): WhileExpression {
    return {kind: "WhileExpression", token, condition, body};
}

export function makeForEachExpression(
    token = ZERO_TOKEN,
    value = makeIdentifier(),
    iterable: Expression = makeIdentifier(),
    body = makeBlockStatement(),
    index?: Identifier
): ForEachExpression {
    const expr: ForEachExpression = {kind: "ForEachExpression", token, value, iterable, body};
    if (index !== undefined) expr.index = index;
    return expr;
}

export function makeFunctionLiteral(
    token = ZERO_TOKEN,
    params: Identifier[] = [],
    body = makeBlockStatement()
): FunctionLiteral {
    return {kind: "FunctionLiteral", token, params, body};
}

export function makeCallExpression(
    token = ZERO_TOKEN,
    fn: Expression = makeIdentifier(),
    args: Expression[] = []
): CallExpression {
    return {kind: "CallExpression", token, function: fn, args};
}

export function makeIndexExpression(
    token = ZERO_TOKEN,
    left: Expression = makeIdentifier(),
    index: Expression = makeIdentifier()
): IndexExpression {
    return {kind: "IndexExpression", token, left, index};
}

export function makeDotExpression(
    token = ZERO_TOKEN,
    left: Expression = makeIdentifier(),
    field = makeIdentifier()
): DotExpression {
    return {kind: "DotExpression", token, left, field};
}

export function makePipeExpression(
    token = ZERO_TOKEN,
    left: Expression = makeIdentifier(),
    right: Expression = makeIdentifier()
): PipeExpression {
    return {kind: "PipeExpression", token, left, right};
}

export function makeMatchExpression(
    token = ZERO_TOKEN,
    subject: Expression = makeIdentifier(),
    arms: MatchArm[] = []
): MatchExpression {
    return {kind: "MatchExpression", token, subject, arms};
}

export function makeOkExpression(
    token = ZERO_TOKEN,
    value: Expression = makeIdentifier()
): OkExpression {
    return {kind: "OkExpression", token, value};
}

export function makeErrExpression(
    token = ZERO_TOKEN,
    value: Expression = makeIdentifier()
): ErrExpression {
    return {kind: "ErrExpression", token, value};
}

// Stringify

export function stringify(node: Statement | Expression): string {
    switch (node.kind) {
        case "LetStatement":
            return `lad ${stringify(node.name)} = ${stringify(node.value)};`;
        case "ConstStatement":
            return `stabil ${stringify(node.name)} = ${stringify(node.value)};`;
        case "ReturnStatement":
            return `aflever ${stringify(node.value)};`;
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
            return "niks";
        case "ArrayLiteral":
            return `[${node.elements.map(stringify).join(", ")}]`;
        case "DictLiteral": {
            const pairs = [...node.pairs.entries()]
                .map(([k, v]) => `${stringify(k)}: ${stringify(v)}`)
                .join(", ");
            return `{${pairs}}`;
        }
        case "AssignExpression":
            return `(${stringify(node.target)} = ${stringify(node.value)})`;
        case "PrefixExpression":
            return `(${node.operator}${stringify(node.right)})`;
        case "InfixExpression":
            return `(${stringify(node.left)} ${node.operator} ${stringify(node.right)})`;
        case "IfExpression": {
            let out = `hvis ${stringify(node.condition)} ${stringify(node.consequence)}`;
            if (node.alternative) out += ` ellers ${stringify(node.alternative)}`;
            return out;
        }
        case "WhileExpression":
            return `mens ${stringify(node.condition)} ${stringify(node.body)}`;
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
            return `fint(${stringify(node.value)})`;
        case "ErrExpression":
            return `øv(${stringify(node.value)})`;
    }
}

export function stringifyProgram(program: Program): string {
    return program.statements.map(stringify).join(" ");
}
