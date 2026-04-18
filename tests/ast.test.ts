import { describe, it, expect } from "vitest";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
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
    type NumberLiteral,
    type PipeExpression,
    type BreakStatement,
    type NullLiteral,
    type BooleanLiteral,
    type StringLiteral,
    type ArrayLiteral,
    type DictLiteral,
    type PrefixExpression,
    type WhileExpression,
    type ForEachExpression,
    type MatchExpression,
    type OkExpression,
    type ErrExpression,
    type DotExpression,
    type IndexExpression,
    type AssignExpression,
    type ImportStatement,
    type ExportStatement,
    type Expression,
    stringify,
    stringifyProgram,
} from "../src/ast.js";

function tok(kind: number, literal: string): Token {
    return { kind, literal, line: 0, col: 0 };
}

function ident(name: string): Identifier {
    return { kind: "Identifier", token: tok(TOKEN.IDENT, name), value: name };
}

function int(n: number): NumberLiteral {
    return { kind: "NumberLiteral", token: tok(TOKEN.INT, String(n)), value: n };
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

    it("break statement uses 'stop'", () => {
        const stmt: BreakStatement = { kind: "BreakStatement", token: tok(TOKEN.BREAK, "stop") };
        expect(stringify(stmt)).toBe("stop;");
    });

    it("null literal", () => {
        const lit: NullLiteral = { kind: "NullLiteral", token: tok(TOKEN.NULL, "niks") };
        expect(stringify(lit)).toBe("niks");
    });

    it("boolean literals", () => {
        const t: BooleanLiteral = { kind: "BooleanLiteral", token: tok(TOKEN.TRUE, "ja"), value: true };
        const f: BooleanLiteral = { kind: "BooleanLiteral", token: tok(TOKEN.FALSE, "nej"), value: false };
        expect(stringify(t)).toBe("ja");
        expect(stringify(f)).toBe("nej");
    });

    it("string literal wraps in quotes", () => {
        const s: StringLiteral = { kind: "StringLiteral", token: tok(TOKEN.STRING, "hej"), value: "hej" };
        expect(stringify(s)).toBe(`"hej"`);
    });

    it("number literal (float)", () => {
        const f: NumberLiteral = { kind: "NumberLiteral", token: tok(TOKEN.FLOAT, "3.14"), value: 3.14 };
        expect(stringify(f)).toBe("3.14");
    });

    it("array literal", () => {
        const a: ArrayLiteral = {
            kind: "ArrayLiteral",
            token: tok(TOKEN.LBRACKET, "["),
            elements: [int(1), int(2), int(3)],
        };
        expect(stringify(a)).toBe("[1, 2, 3]");
    });

    it("dict literal", () => {
        const key: StringLiteral = { kind: "StringLiteral", token: tok(TOKEN.STRING, "a"), value: "a" };
        const d: DictLiteral = {
            kind: "DictLiteral",
            token: tok(TOKEN.LBRACE, "{"),
            pairs: new Map<Expression, Expression>([[key, int(1)]]),
        };
        expect(stringify(d)).toBe(`{"a": 1}`);
    });

    it("prefix expression", () => {
        const p: PrefixExpression = {
            kind: "PrefixExpression",
            token: tok(TOKEN.MINUS, "-"),
            operator: "-",
            right: int(5),
        };
        expect(stringify(p)).toBe("(-5)");
    });

    it("while expression uses 'mens'", () => {
        const body: BlockStatement = {
            kind: "BlockStatement",
            token: tok(TOKEN.LBRACE, "{"),
            statements: [],
        };
        const w: WhileExpression = {
            kind: "WhileExpression",
            token: tok(TOKEN.WHILE, "mens"),
            condition: { kind: "BooleanLiteral", token: tok(TOKEN.TRUE, "ja"), value: true },
            body,
        };
        expect(stringify(w)).toBe("mens ja {  }");
    });

    it("foreach expression uses 'kør' and 'af' (value only)", () => {
        const body: BlockStatement = { kind: "BlockStatement", token: tok(TOKEN.LBRACE, "{"), statements: [] };
        const f: ForEachExpression = {
            kind: "ForEachExpression",
            token: tok(TOKEN.FOREACH, "kør"),
            value: ident("x"),
            iterable: ident("xs"),
            body,
        };
        expect(stringify(f)).toBe("kør x af xs {  }");
    });

    it("foreach expression with index", () => {
        const body: BlockStatement = { kind: "BlockStatement", token: tok(TOKEN.LBRACE, "{"), statements: [] };
        const f: ForEachExpression = {
            kind: "ForEachExpression",
            token: tok(TOKEN.FOREACH, "kør"),
            value: ident("v"),
            index: ident("i"),
            iterable: ident("xs"),
            body,
        };
        expect(stringify(f)).toBe("kør v, i af xs {  }");
    });

    it("match expression uses 'prøv'", () => {
        const m: MatchExpression = {
            kind: "MatchExpression",
            token: tok(TOKEN.MATCH, "prøv"),
            subject: ident("x"),
            arms: [
                { pattern: int(1), body: ident("et") },
                { pattern: int(2), body: ident("to") },
            ],
        };
        expect(stringify(m)).toBe("prøv x { 1 => et, 2 => to }");
    });

    it("ok expression uses 'flot' (not fint)", () => {
        const o: OkExpression = { kind: "OkExpression", token: tok(TOKEN.OK, "flot"), value: int(1) };
        expect(stringify(o)).toBe("flot(1)");
    });

    it("err expression uses 'øv'", () => {
        const e: ErrExpression = { kind: "ErrExpression", token: tok(TOKEN.ERR, "øv"), value: int(1) };
        expect(stringify(e)).toBe("øv(1)");
    });

    it("dot expression", () => {
        const d: DotExpression = {
            kind: "DotExpression",
            token: tok(TOKEN.DOT, "."),
            left: ident("obj"),
            field: ident("felt"),
        };
        expect(stringify(d)).toBe("obj.felt");
    });

    it("index expression", () => {
        const i: IndexExpression = {
            kind: "IndexExpression",
            token: tok(TOKEN.LBRACKET, "["),
            left: ident("xs"),
            index: int(0),
        };
        expect(stringify(i)).toBe("(xs[0])");
    });

    it("assign expression", () => {
        const a: AssignExpression = {
            kind: "AssignExpression",
            token: tok(TOKEN.ASSIGN, "="),
            target: ident("x"),
            value: int(1),
        };
        expect(stringify(a)).toBe("(x = 1)");
    });

    it("import statement uses 'ind' and 'fra' (not hent)", () => {
        const single: ImportStatement = {
            kind: "ImportStatement",
            token: tok(TOKEN.IMPORT, "ind"),
            names: ["foo"],
            source: "./bar.gemyt",
        };
        expect(stringify(single)).toBe(`ind foo fra "./bar.gemyt";`);

        const multi: ImportStatement = {
            kind: "ImportStatement",
            token: tok(TOKEN.IMPORT, "ind"),
            names: ["a", "b"],
            source: "mod",
        };
        expect(stringify(multi)).toBe(`ind a, b fra "mod";`);
    });

    it("export statement uses 'ud stabil' (not eksporter)", () => {
        const e: ExportStatement = {
            kind: "ExportStatement",
            token: tok(TOKEN.EXPORT, "ud"),
            name: ident("foo"),
            value: int(42),
        };
        expect(stringify(e)).toBe("ud stabil foo = 42;");
    });
});

describe("AST stringify round-trip (idempotence)", () => {
    // stringify's output must itself be valid gemyt — re-parsing and re-stringifying
    // must produce the same string. This is the canary for keyword drift: if any
    // stringify case ever emits a stale keyword, the re-parse will fail here.
    function trip(src: string): string {
        const parser = new Parser(new Lexer(src));
        const program = parser.parse();
        if (parser.errors.length > 0) {
            throw new Error(`parse errors for ${JSON.stringify(src)}:\n${parser.errors.join("\n")}`);
        }
        return stringifyProgram(program);
    }

    const cases: Array<{ name: string; src: string }> = [
        { name: "let", src: "lad x = 1" },
        { name: "const", src: "stabil y = 2" },
        { name: "return", src: "gør() { aflever 1 }" },
        { name: "break inside while", src: "mens ja { stop }" },
        { name: "if/else", src: "hvis x < 1 { x } ellers { 1 }" },
        { name: "while", src: "mens x { x }" },
        { name: "foreach value only", src: "kør v af xs { v }" },
        { name: "foreach with index", src: "kør v, i af xs { i }" },
        { name: "function literal", src: "gør(x, y) { x + y }" },
        { name: "call expression", src: "f(1, 2, 3)" },
        { name: "pipe", src: "x |> f |> g" },
        { name: "match", src: `prøv x { 1 => "et", 2 => "to" }` },
        { name: "ok/err", src: "flot(1); øv(2)" },
        { name: "dot and index", src: "obj.felt[0]" },
        { name: "assignment", src: "x = 1" },
        { name: "array and dict", src: `[1, 2]; {"a": 1}` },
        { name: "booleans and niks", src: "ja; nej; niks" },
        { name: "import single", src: `ind foo fra "./bar.gemyt"` },
        { name: "import multi", src: `ind a, b fra "mod"` },
        { name: "export", src: "ud stabil x = 42" },
        { name: "prefix and infix", src: "-(1 + 2) * 3" },
        { name: "not", src: "ikke ja" },
        { name: "floats", src: "3.14 + 0.5" },
        { name: "strings", src: `"hej" + "dig"` },
    ];

    for (const tt of cases) {
        it(tt.name, () => {
            const first = trip(tt.src);
            const second = trip(first);
            expect(second).toBe(first);
        });
    }
});
