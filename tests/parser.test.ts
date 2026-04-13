import {describe, expect, it} from "vitest";
import {Lexer} from "../src/lexer.js";
import {Parser} from "../src/parser.js";
import {stringifyProgram} from "../src/ast.js";
import type {
    Expression,
    ExpressionStatement,
    LetStatement,
    ConstStatement,
    ReturnStatement,
    Identifier,
    IntegerLiteral,
    FloatLiteral,
    BooleanLiteral,
    StringLiteral,
    PrefixExpression,
    InfixExpression,
    IfExpression,
    WhileExpression,
    ForEachExpression,
    FunctionLiteral,
    CallExpression,
    IndexExpression,
    DotExpression,
    PipeExpression,
    MatchExpression,
    OkExpression,
    ErrExpression,
    ArrayLiteral,
    DictLiteral,
    Statement,
} from "../src/ast.js";

function parse(input: string) {
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parse();
    checkParserErrors(parser);
    return program;
}

function checkParserErrors(parser: Parser) {
    const errors = parser.errors;
    if (errors.length > 0) {
        throw new Error(`parser has ${errors.length} error(s):\n${errors.join("\n")}`);
    }
}

function asExpressionStatement(stmt?: Statement): ExpressionStatement {
    expect(stmt?.kind).toBe("ExpressionStatement");
    return stmt as ExpressionStatement;
}

function testIdentifier(exp?: Expression, value?: string) {
    expect(exp?.kind).toBe("Identifier");
    const ident = exp as Identifier;
    expect(ident?.value).toBe(value);
    expect(ident?.token.literal).toBe(value);
}

function testIntegerLiteral(exp?: Expression, value?: number) {
    expect(exp?.kind).toBe("IntegerLiteral");
    const lit = exp as IntegerLiteral;
    expect(lit?.value).toBe(value);
    expect(lit?.token.literal).toBe(String(value));
}

function testFloatLiteral(exp?: Expression, value?: number) {
    expect(exp?.kind).toBe("FloatLiteral");
    const lit = exp as FloatLiteral;
    expect(lit?.value).toBe(value);
}

function testBooleanLiteral(exp?: Expression, value?: boolean) {
    expect(exp?.kind).toBe("BooleanLiteral");
    const lit = exp as BooleanLiteral;
    expect(lit?.value).toBe(value);
    expect(lit?.token.literal).toBe(value ? "ja" : "nej");
}

function testLiteralExpression(exp?: Expression, expected?: string | number | boolean) {
    if (typeof expected === "string") {
        testIdentifier(exp, expected);
    } else if (typeof expected === "boolean") {
        testBooleanLiteral(exp, expected);
    } else if (typeof expected === "number" && Number.isInteger(expected)) {
        testIntegerLiteral(exp, expected);
    } else {
        testFloatLiteral(exp, expected as number);
    }
}

function testInfixExpression(
    exp?: Expression,
    left?: string | number | boolean,
    operator?: string,
    right?: string | number | boolean
) {
    expect(exp?.kind).toBe("InfixExpression");
    const infix = exp as InfixExpression;
    testLiteralExpression(infix?.left, left);
    expect(infix?.operator).toBe(operator);
    testLiteralExpression(infix?.right, right);
}

// --- Statements ---

describe("LetStatement", () => {
    const tests: Array<{input: string; name: string; value: string | number | boolean}> = [
        {input: "lad x = 5;", name: "x", value: 5},
        {input: "lad y = ja;", name: "y", value: true},
        {input: "lad foobar = y;", name: "foobar", value: "y"},
    ];

    for (const tt of tests) {
        it(`parses '${tt.input}'`, () => {
            const program = parse(tt.input);
            expect(program.statements).toHaveLength(1);

            const stmt = program.statements[0];
            expect(stmt.kind).toBe("LetStatement");
            const letStmt = stmt as LetStatement;
            expect(letStmt.token.literal).toBe("lad");
            expect(letStmt.name.value).toBe(tt.name);
            testLiteralExpression(letStmt.value, tt.value);
        });
    }
});

describe("ConstStatement", () => {
    const tests: Array<{input: string; name: string; value: string | number | boolean}> = [
        {input: "stabil x = 5;", name: "x", value: 5},
        {input: "stabil y = nej;", name: "y", value: false},
        {input: "stabil foobar = y;", name: "foobar", value: "y"},
    ];

    for (const tt of tests) {
        it(`parses '${tt.input}'`, () => {
            const program = parse(tt.input);
            expect(program.statements).toHaveLength(1);

            const stmt = program.statements[0];
            expect(stmt.kind).toBe("ConstStatement");
            const constStmt = stmt as ConstStatement;
            expect(constStmt.token.literal).toBe("stabil");
            expect(constStmt.name.value).toBe(tt.name);
            testLiteralExpression(constStmt.value, tt.value);
        });
    }
});

describe("ReturnStatement", () => {
    const tests: Array<{input: string; value: string | number | boolean}> = [
        {input: "giv 5;", value: 5},
        {input: "giv ja;", value: true},
        {input: "giv foobar;", value: "foobar"},
    ];

    for (const tt of tests) {
        it(`parses '${tt.input}'`, () => {
            const program = parse(tt.input);
            expect(program.statements).toHaveLength(1);

            const stmt = program.statements[0];
            expect(stmt.kind).toBe("ReturnStatement");
            const returnStmt = stmt as ReturnStatement;
            expect(returnStmt.token.literal).toBe("giv");
            testLiteralExpression(returnStmt.value, tt.value);
        });
    }
});

describe("BreakStatement", () => {
    it("parses bryd", () => {
        const program = parse("bryd;");
        expect(program.statements).toHaveLength(1);
        expect(program.statements[0].kind).toBe("BreakStatement");
    });
});

// --- Literals ---

describe("IdentifierExpression", () => {
    it("parses a simple identifier", () => {
        const program = parse("foobar;");
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        testIdentifier(stmt.expression, "foobar");
    });
});

describe("IntegerLiteralExpression", () => {
    it("parses an integer", () => {
        const program = parse("5;");
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        testIntegerLiteral(stmt.expression, 5);
    });
});

describe("FloatLiteralExpression", () => {
    it("parses a float", () => {
        const program = parse("3.14;");
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        testFloatLiteral(stmt.expression, 3.14);
    });
});

describe("StringLiteralExpression", () => {
    it("parses a string", () => {
        const program = parse('"hello world";');
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("StringLiteral");
        expect((stmt.expression as StringLiteral).value).toBe("hello world");
    });
});

describe("BooleanExpression", () => {
    it("parses ja as true", () => {
        const program = parse("ja;");
        const stmt = asExpressionStatement(program.statements[0]);
        testBooleanLiteral(stmt.expression, true);
    });

    it("parses nej as false", () => {
        const program = parse("nej;");
        const stmt = asExpressionStatement(program.statements[0]);
        testBooleanLiteral(stmt.expression, false);
    });
});

describe("NullLiteral", () => {
    it("parses intet", () => {
        const program = parse("intet;");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("NullLiteral");
    });
});

// --- Collections ---

describe("ArrayLiteral", () => {
    it("parses [1, 2 * 2, 3 + 3]", () => {
        const program = parse("[1, 2 * 2, 3 + 3]");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("ArrayLiteral");
        const array = stmt.expression as ArrayLiteral;
        expect(array.elements).toHaveLength(3);
        testIntegerLiteral(array.elements[0], 1);
        testInfixExpression(array.elements[1], 2, "*", 2);
        testInfixExpression(array.elements[2], 3, "+", 3);
    });

    it("parses an empty array", () => {
        const program = parse("[]");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("ArrayLiteral");
        expect((stmt.expression as ArrayLiteral).elements).toHaveLength(0);
    });
});

describe("DictLiteral", () => {
    it("parses string keys", () => {
        const program = parse('{"one": 1, "two": 2, "three": 3}');
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("DictLiteral");
        const dict = stmt.expression as DictLiteral;
        expect(dict.pairs.size).toBe(3);

        const expected: Record<string, number> = {one: 1, two: 2, three: 3};
        for (const [key, value] of dict.pairs) {
            expect(key.kind).toBe("StringLiteral");
            const k = key as StringLiteral;
            testIntegerLiteral(value, expected[k.value]);
        }
    });

    it("parses boolean keys", () => {
        const program = parse("{ja: 1, nej: 2}");
        const stmt = asExpressionStatement(program.statements[0]);
        const dict = stmt.expression as DictLiteral;
        expect(dict.pairs.size).toBe(2);

        const expected = new Map([[true, 1], [false, 2]]);
        for (const [key, value] of dict.pairs) {
            expect(key.kind).toBe("BooleanLiteral");
            testIntegerLiteral(value, expected.get((key as BooleanLiteral).value)!);
        }
    });

    it("parses integer keys", () => {
        const program = parse('{1: "hello", 2: "there"}');
        const stmt = asExpressionStatement(program.statements[0]);
        const dict = stmt.expression as DictLiteral;
        expect(dict.pairs.size).toBe(2);

        const expected = new Map([[1, "hello"], [2, "there"]]);
        for (const [key, value] of dict.pairs) {
            expect(key.kind).toBe("IntegerLiteral");
            const expectedVal = expected.get((key as IntegerLiteral).value)!;
            expect((value as StringLiteral).value).toBe(expectedVal);
        }
    });

    it("parses values that are expressions", () => {
        const program = parse('{"one": 0 + 1, "two": 10 - 8, "three": 15 / 5}');
        const stmt = asExpressionStatement(program.statements[0]);
        const dict = stmt.expression as DictLiteral;
        expect(dict.pairs.size).toBe(3);

        const expected: Record<string, [number, string, number]> = {
            one: [0, "+", 1],
            two: [10, "-", 8],
            three: [15, "/", 5],
        };
        for (const [key, value] of dict.pairs) {
            const k = key as StringLiteral;
            const [l, op, r] = expected[k.value];
            testInfixExpression(value, l, op, r);
        }
    });

    it("parses an empty dict", () => {
        const program = parse("{}");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("DictLiteral");
        expect((stmt.expression as DictLiteral).pairs.size).toBe(0);
    });
});

// --- Expressions ---

describe("PrefixExpression", () => {
    const tests: Array<{input: string; operator: string; value: string | number | boolean}> = [
        {"input": "ikke 5;", operator: "ikke", value: 5},
        {"input": "-15;", operator: "-", value: 15},
        {"input": "ikke foobar;", operator: "ikke", value: "foobar"},
        {"input": "-foobar;", operator: "-", value: "foobar"},
        {"input": "ikke ja;", operator: "ikke", value: true},
        {"input": "ikke nej;", operator: "ikke", value: false},
    ];

    for (const tt of tests) {
        it(`parses '${tt.input}'`, () => {
            const program = parse(tt.input);
            expect(program.statements).toHaveLength(1);
            const stmt = asExpressionStatement(program.statements[0]);
            expect(stmt.expression.kind).toBe("PrefixExpression");
            const exp = stmt.expression as PrefixExpression;
            expect(exp.operator).toBe(tt.operator);
            testLiteralExpression(exp.right, tt.value);
        });
    }
});

describe("InfixExpression", () => {
    const tests: Array<{input: string; left: string | number | boolean; op: string; right: string | number | boolean}> = [
        {input: "5 + 5;", left: 5, op: "+", right: 5},
        {input: "5 - 5;", left: 5, op: "-", right: 5},
        {input: "5 * 5;", left: 5, op: "*", right: 5},
        {input: "5 / 5;", left: 5, op: "/", right: 5},
        {input: "5 > 5;", left: 5, op: ">", right: 5},
        {input: "5 < 5;", left: 5, op: "<", right: 5},
        {input: "5 <= 5;", left: 5, op: "<=", right: 5},
        {input: "5 >= 5;", left: 5, op: ">=", right: 5},
        {input: "5 == 5;", left: 5, op: "==", right: 5},
        {input: "5 != 5;", left: 5, op: "!=", right: 5},
        {input: "foobar + barfoo;", left: "foobar", op: "+", right: "barfoo"},
        {input: "ja == ja", left: true, op: "==", right: true},
        {input: "ja != nej", left: true, op: "!=", right: false},
        {input: "nej == nej", left: false, op: "==", right: false},
    ];

    for (const tt of tests) {
        it(`parses '${tt.input}'`, () => {
            const program = parse(tt.input);
            expect(program.statements).toHaveLength(1);
            const stmt = asExpressionStatement(program.statements[0]);
            testInfixExpression(stmt.expression, tt.left, tt.op, tt.right);
        });
    }
});

describe("OperatorPrecedence", () => {
    // Uses stringify output to verify precedence via parenthesisation
    const tests: Array<{input: string; expected: string}> = [
        {input: "-a * b", expected: "((-a) * b);"},
        {input: "ikke -a", expected: "(ikke(-a));"},
        {input: "a + b + c", expected: "((a + b) + c);"},
        {input: "a + b - c", expected: "((a + b) - c);"},
        {input: "a * b * c", expected: "((a * b) * c);"},
        {input: "a * b / c", expected: "((a * b) / c);"},
        {input: "a + b / c", expected: "(a + (b / c));"},
        {input: "a + b * c + d / e - f", expected: "(((a + (b * c)) + (d / e)) - f);"},
        {input: "5 > 4 == 3 < 4", expected: "((5 > 4) == (3 < 4));"},
        {input: "5 < 4 != 3 > 4", expected: "((5 < 4) != (3 > 4));"},
        {input: "1 + (2 + 3) + 4", expected: "((1 + (2 + 3)) + 4);"},
        {input: "(5 + 5) * 2", expected: "((5 + 5) * 2);"},
        {input: "2 / (5 + 5)", expected: "(2 / (5 + 5));"},
        {input: "-(5 + 5)", expected: "(-(5 + 5));"},
        {input: "ikke (ja == ja)", expected: "(ikke(ja == ja));"},
        {input: "a + sæt(b * c) + d", expected: "((a + sæt((b * c))) + d);"},
        {input: "myArray[1 + 1]", expected: "(myArray[(1 + 1)]);"},
    ];

    for (const tt of tests) {
        it(`'${tt.input}' => '${tt.expected}'`, () => {
            const program = parse(tt.input);
            expect(stringifyProgram(program)).toBe(tt.expected);
        });
    }
});

describe("IfExpression", () => {
    it("parses hvis without ellers", () => {
        const program = parse("hvis (x < y) { x }");
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("IfExpression");
        const exp = stmt.expression as IfExpression;

        testInfixExpression(exp.condition, "x", "<", "y");
        expect(exp.consequence.statements).toHaveLength(1);
        const consequence = asExpressionStatement(exp.consequence.statements[0]);
        testIdentifier(consequence.expression, "x");
        expect(exp.alternative).toBeUndefined();
    });

    it("parses hvis med ellers", () => {
        const program = parse("hvis (x < y) { x } ellers { y }");
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        const exp = stmt.expression as IfExpression;

        testInfixExpression(exp.condition, "x", "<", "y");

        expect(exp.consequence.statements).toHaveLength(1);
        testIdentifier(asExpressionStatement(exp.consequence.statements[0]).expression, "x");

        expect(exp.alternative).toBeDefined();
        const alt = exp.alternative!;
        expect(alt.kind).toBe("BlockStatement");
        expect((alt as any).statements).toHaveLength(1);
        testIdentifier(asExpressionStatement((alt as any).statements[0]).expression, "y");
    });

    it("parses chained hvis/ellers hvis", () => {
        const program = parse("hvis (x < y) { x } ellers hvis (x > y) { y }");
        const stmt = asExpressionStatement(program.statements[0]);
        const exp = stmt.expression as IfExpression;
        expect(exp.alternative?.kind).toBe("IfExpression");
    });
});

describe("WhileExpression", () => {
    it("parses mens", () => {
        const program = parse("mens (x < 10) { x }");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("WhileExpression");
        const exp = stmt.expression as WhileExpression;
        testInfixExpression(exp.condition, "x", "<", 10);
        expect(exp.body.statements).toHaveLength(1);
    });
});

describe("ForEachExpression", () => {
    it("parses kør without index", () => {
        const program = parse("kør x af myList { x }");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("ForEachExpression");
        const exp = stmt.expression as ForEachExpression;
        expect(exp.value.value).toBe("x");
        expect(exp.index).toBeUndefined();
        testIdentifier(exp.iterable, "myList");
        expect(exp.body.statements).toHaveLength(1);
    });

    it("parses kør with index", () => {
        const program = parse("kør x, i af myList { x }");
        const stmt = asExpressionStatement(program.statements[0]);
        const exp = stmt.expression as ForEachExpression;
        expect(exp.value.value).toBe("x");
        expect(exp.index?.value).toBe("i");
        testIdentifier(exp.iterable, "myList");
    });
});

describe("FunctionLiteral", () => {
    it("parses gør(x, y) { x + y }", () => {
        const program = parse("gør(x, y) { x + y; }");
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("FunctionLiteral");
        const fn = stmt.expression as FunctionLiteral;

        expect(fn.params).toHaveLength(2);
        testIdentifier(fn.params[0], "x");
        testIdentifier(fn.params[1], "y");

        expect(fn.body.statements).toHaveLength(1);
        const bodyStmt = asExpressionStatement(fn.body.statements[0]);
        testInfixExpression(bodyStmt.expression, "x", "+", "y");
    });

    const paramTests: Array<{input: string; params: string[]}> = [
        {input: "gør() {};", params: []},
        {input: "gør(x) {};", params: ["x"]},
        {input: "gør(x, y, z) {};", params: ["x", "y", "z"]},
    ];

    for (const tt of paramTests) {
        it(`parses params: ${JSON.stringify(tt.params)}`, () => {
            const program = parse(tt.input);
            const stmt = asExpressionStatement(program.statements[0]);
            const fn = stmt.expression as FunctionLiteral;
            expect(fn.params).toHaveLength(tt.params.length);
            for (let i = 0; i < tt.params.length; i++) {
                testIdentifier(fn.params[i], tt.params[i]);
            }
        });
    }
});

describe("CallExpression", () => {
    it("parses add(1, 2 * 3, 4 + 5)", () => {
        const program = parse("add(1, 2 * 3, 4 + 5);");
        expect(program.statements).toHaveLength(1);
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("CallExpression");
        const exp = stmt.expression as CallExpression;

        testIdentifier(exp.function, "add");
        expect(exp.args).toHaveLength(3);
        testLiteralExpression(exp.args[0], 1);
        testInfixExpression(exp.args[1], 2, "*", 3);
        testInfixExpression(exp.args[2], 4, "+", 5);
    });

    it("parses a call with no args", () => {
        const program = parse("add();");
        const stmt = asExpressionStatement(program.statements[0]);
        const exp = stmt.expression as CallExpression;
        testIdentifier(exp.function, "add");
        expect(exp.args).toHaveLength(0);
    });
});

describe("IndexExpression", () => {
    it("parses myArray[1 + 1]", () => {
        const program = parse("myArray[1 + 1]");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("IndexExpression");
        const exp = stmt.expression as IndexExpression;
        testIdentifier(exp.left, "myArray");
        testInfixExpression(exp.index, 1, "+", 1);
    });
});

describe("DotExpression", () => {
    it("parses obj.field", () => {
        const program = parse("obj.field;");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("DotExpression");
        const exp = stmt.expression as DotExpression;
        testIdentifier(exp.left, "obj");
        expect(exp.field.value).toBe("field");
    });
});

describe("PipeExpression", () => {
    it("parses a |> b", () => {
        const program = parse("a |> b;");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("PipeExpression");
        const exp = stmt.expression as PipeExpression;
        testIdentifier(exp.left, "a");
        testIdentifier(exp.right, "b");
    });

    it("pipes are left-associative: a |> b |> c = ((a |> b) |> c)", () => {
        const program = parse("a |> b |> c;");
        const stmt = asExpressionStatement(program.statements[0]);
        const outer = stmt.expression as PipeExpression;
        expect(outer.kind).toBe("PipeExpression");
        expect(outer.left.kind).toBe("PipeExpression");
        testIdentifier(outer.right, "c");
    });
});

describe("MatchExpression", () => {
    it("parses prøv with arms", () => {
        const program = parse("prøv x { 1 => a, 2 => b }");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("MatchExpression");
        const exp = stmt.expression as MatchExpression;
        testIdentifier(exp.subject, "x");
        expect(exp.arms).toHaveLength(2);
        testIntegerLiteral(exp.arms[0].pattern, 1);
        testIdentifier(exp.arms[0].body, "a");
        testIntegerLiteral(exp.arms[1].pattern, 2);
        testIdentifier(exp.arms[1].body, "b");
    });
});

describe("OkExpression", () => {
    it("parses fint x", () => {
        const program = parse("fint x;");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("OkExpression");
        testIdentifier((stmt.expression as OkExpression).value, "x");
    });
});

describe("ErrExpression", () => {
    it("parses øv x", () => {
        const program = parse("øv x;");
        const stmt = asExpressionStatement(program.statements[0]);
        expect(stmt.expression.kind).toBe("ErrExpression");
        testIdentifier((stmt.expression as ErrExpression).value, "x");
    });
});
