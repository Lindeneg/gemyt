import { describe, it, expect } from "vitest";
import { TOKEN, type Token } from "../src/token.js";
import {
    type Program,
    type LetStatement,
    type ConstStatement,
    type ReturnStatement,
    type ExpressionStatement,
    type FunctionLiteral,
    type CallExpression,
    type InfixExpression,
    type IfExpression,
    type BlockStatement,
    type Identifier,
    type IntegerLiteral,
    type PipeExpression,
    stringify,
    stringifyProgram,
} from "../src/ast.js";

function tok(kind: number, literal: string): Token {
    return { kind, literal, line: 0, col: 0 };
}

function ident(name: string): Identifier {
    return { kind: "Identifier", token: tok(TOKEN.IDENT, name), value: name };
}

function int(n: number): IntegerLiteral {
    return { kind: "IntegerLiteral", token: tok(TOKEN.INT, String(n)), value: n };
}

describe("AST stringify", () => {
    it("let statement", () => {
        const program: Program = {
            statements: [
                {
                    kind: "LetStatement",
                    token: tok(TOKEN.LET, "lad"),
                    name: ident("foo"),
                    value: ident("bar"),
                } satisfies LetStatement,
            ],
        };
        expect(stringifyProgram(program)).toBe("lad foo = bar;");
    });

    it("const statement", () => {
        const program: Program = {
            statements: [
                {
                    kind: "ConstStatement",
                    token: tok(TOKEN.CONST, "stabil"),
                    name: ident("x"),
                    value: int(42),
                } satisfies ConstStatement,
            ],
        };
        expect(stringifyProgram(program)).toBe("stabil x = 42;");
    });

    it("return statement", () => {
        const stmt: ReturnStatement = {
            kind: "ReturnStatement",
            token: tok(TOKEN.RETURN, "aflever"),
            value: ident("resultat"),
        };
        expect(stringify(stmt)).toBe("aflever resultat;");
    });

    it("function literal and call expression", () => {
        const fn: FunctionLiteral = {
            kind: "FunctionLiteral",
            token: tok(TOKEN.FUNCTION, "gør"),
            params: [ident("x"), ident("y")],
            body: {
                kind: "BlockStatement",
                token: tok(TOKEN.LBRACE, "{"),
                statements: [
                    {
                        kind: "ReturnStatement",
                        token: tok(TOKEN.RETURN, "aflever"),
                        value: {
                            kind: "InfixExpression",
                            token: tok(TOKEN.PLUS, "+"),
                            left: ident("x"),
                            operator: "+",
                            right: ident("y"),
                        } satisfies InfixExpression,
                    } satisfies ReturnStatement,
                ],
            } satisfies BlockStatement,
        };

        const call: CallExpression = {
            kind: "CallExpression",
            token: tok(TOKEN.LPAREN, "("),
            function: ident("sum"),
            args: [int(1), int(2)],
        };

        expect(stringify(fn)).toBe("gør(x, y) { aflever (x + y); }");
        expect(stringify(call)).toBe("sum(1, 2)");
    });

    it("if/else expression in a program", () => {
        const program: Program = {
            statements: [
                {
                    kind: "ExpressionStatement",
                    token: tok(TOKEN.IF, "hvis"),
                    expression: {
                        kind: "IfExpression",
                        token: tok(TOKEN.IF, "hvis"),
                        condition: {
                            kind: "InfixExpression",
                            token: tok(TOKEN.LT, "<"),
                            left: ident("a"),
                            operator: "<",
                            right: ident("b"),
                        } satisfies InfixExpression,
                        consequence: {
                            kind: "BlockStatement",
                            token: tok(TOKEN.LBRACE, "{"),
                            statements: [
                                {
                                    kind: "ReturnStatement",
                                    token: tok(TOKEN.RETURN, "aflever"),
                                    value: ident("a"),
                                } satisfies ReturnStatement,
                            ],
                        } satisfies BlockStatement,
                        alternative: {
                            kind: "BlockStatement",
                            token: tok(TOKEN.LBRACE, "{"),
                            statements: [
                                {
                                    kind: "ReturnStatement",
                                    token: tok(TOKEN.RETURN, "aflever"),
                                    value: ident("b"),
                                } satisfies ReturnStatement,
                            ],
                        } satisfies BlockStatement,
                    } satisfies IfExpression,
                } satisfies ExpressionStatement,
            ],
        };
        expect(stringifyProgram(program)).toBe(
            "hvis (a < b) { aflever a; } ellers { aflever b; };"
        );
    });

    it("pipe expression", () => {
        const pipe: PipeExpression = {
            kind: "PipeExpression",
            token: tok(TOKEN.PIPE, "|>"),
            left: ident("liste"),
            right: ident("sorter"),
        };
        expect(stringify(pipe)).toBe("(liste |> sorter)");
    });
});
