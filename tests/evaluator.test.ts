import {describe, expect, it} from "vitest";
import {Lexer} from "../src/lexer.js";
import {Parser} from "../src/parser.js";
import {evaluateProgram} from "../src/evaluator.js";
import {
    createEnvironment,
    Tal,
    Tekst,
    Sandhed,
    Niks,
    Liste,
    Resultat,
    Fejl,
} from "../src/object.js";

function evalSource(input: string) {
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parse();
    expect(parser.errors).toHaveLength(0);
    return evaluateProgram(program, createEnvironment());
}

function expectTal(input: string, expected: number) {
    const result = evalSource(input);
    expect(result).toBeInstanceOf(Tal);
    expect((result as Tal).value).toBe(expected);
}

function expectTekst(input: string, expected: string) {
    const result = evalSource(input);
    expect(result).toBeInstanceOf(Tekst);
    expect((result as Tekst).value).toBe(expected);
}

function expectSandhed(input: string, expected: boolean) {
    const result = evalSource(input);
    expect(result).toBeInstanceOf(Sandhed);
    expect((result as Sandhed).value).toBe(expected);
}

function expectNiks(input: string) {
    expect(evalSource(input)).toBeInstanceOf(Niks);
}

function expectFejl(input: string, msgSubstring: string) {
    const result = evalSource(input);
    expect(result).toBeInstanceOf(Fejl);
    expect((result as Fejl).message).toContain(msgSubstring);
}

describe("integer and float literals", () => {
    it("evaluates an integer", () => expectTal("5", 5));
    it("evaluates a float", () => expectTal("3.14", 3.14));
    it("evaluates a negative integer via prefix", () => expectTal("-10", -10));
});

describe("boolean literals", () => {
    it("ja is true", () => expectSandhed("ja", true));
    it("nej is false", () => expectSandhed("nej", false));
    it("ikke ja is false", () => expectSandhed("ikke ja", false));
    it("ikke nej is true", () => expectSandhed("ikke nej", true));
    it("ikke niks is true", () => expectSandhed("ikke niks", true));
    it("ikke 0 is true", () => expectSandhed("ikke 0", true));
    it("ikke 1 is false", () => expectSandhed("ikke 1", false));
});

describe("niks literal", () => {
    it("evaluates niks", () => expectNiks("niks"));
});

describe("string literals", () => {
    it("evaluates a string", () => expectTekst(`"hej verden"`, "hej verden"));
});

describe("arithmetic", () => {
    it("addition", () => expectTal("2 + 3", 5));
    it("subtraction", () => expectTal("10 - 4", 6));
    it("multiplication", () => expectTal("3 * 4", 12));
    it("division", () => expectTal("10 / 2", 5));
    it("division by zero returns fejl", () => expectFejl("1 / 0", "det kan man"));
    it("float arithmetic", () => expectTal("1.5 + 1.5", 3));
    it("mixed precedence", () => expectTal("2 + 3 * 4", 14));
    it("grouped expression", () => expectTal("(2 + 3) * 4", 20));
    it("nested negation", () => expectTal("-(5 + 5)", -10));
});

describe("comparison operators", () => {
    it("less than true", () => expectSandhed("1 < 2", true));
    it("less than false", () => expectSandhed("2 < 1", false));
    it("greater than true", () => expectSandhed("3 > 1", true));
    it("greater than false", () => expectSandhed("1 > 3", false));
    it("less or equal", () => expectSandhed("2 <= 2", true));
    it("greater or equal", () => expectSandhed("3 >= 4", false));
    it("equal integers", () => expectSandhed("5 == 5", true));
    it("not equal integers", () => expectSandhed("5 != 4", true));
    it("equal booleans", () => expectSandhed("ja == ja", true));
    it("mixed types not equal", () => expectSandhed("1 == ja", false));
});

describe("string operations", () => {
    it("concatenation", () => expectTekst(`"hej" + " " + "verden"`, "hej verden"));
    it("string equality", () => expectSandhed(`"abc" == "abc"`, true));
    it("string inequality", () => expectSandhed(`"abc" != "xyz"`, true));
    it("string length via dot", () => expectTal(`"hej".længde`, 3));
    it("string index", () => expectTekst(`"hej"[0]`, "h"));
    it("string index out of bounds returns niks", () => expectNiks(`"hej"[99]`));
});

describe("logical operators", () => {
    it("og: true and true", () => expectSandhed("ja og ja", true));
    it("og: short-circuits on false", () => expectSandhed("nej og ja", false));
    it("eller: short-circuits on true", () => expectSandhed("ja eller nej", true));
    it("eller: false or false", () => expectSandhed("nej eller nej", false));
});

describe("lad and stabil bindings", () => {
    it("lad binds a value", () => expectTal("lad x = 5; x", 5));
    it("stabil binds a value", () => expectTal("stabil x = 10; x", 10));
    it("lad can be reassigned", () => expectTal("lad x = 1; x = 2; x", 2));
    it("stabil cannot be reassigned", () => expectFejl("stabil x = 1; x = 2", "stabil"));
    it("undefined identifier is a fejl", () => expectFejl("ukendt", "er ikke defineret"));
});

describe("hvis expressions", () => {
    it("true branch is evaluated", () => expectTal("hvis ja { 1 } ellers { 2 }", 1));
    it("false branch is evaluated", () => expectTal("hvis nej { 1 } ellers { 2 }", 2));
    it("no else returns niks when false", () => expectNiks("hvis nej { 1 }"));
    it("else hvis chain", () => expectTal("hvis nej { 1 } ellers hvis ja { 2 } ellers { 3 }", 2));
    it("condition with parens still works", () => expectTal("hvis (1 < 2) { 10 }", 10));
});

describe("mens loop", () => {
    it("accumulates a sum", () =>
        expectTal("lad i = 0; lad s = 0; mens i < 5 { s = s + i; i = i + 1 }; s", 10));
    it("never runs when condition is false", () => expectNiks("mens nej { 42 }"));
    it("bryd exits early", () => expectTal("lad i = 0; mens ja { bryd }; i", 0));
    it("bryd returns niks from loop", () => expectNiks("mens ja { bryd }"));
});

describe("kør forEach loop", () => {
    it("iterates over a liste", () =>
        expectTal("lad s = 0; kør x af [1, 2, 3] { s = s + x }; s", 6));
    it("provides index", () =>
        expectTal("lad idx = 0; kør x, i af [10, 20, 30] { idx = i }; idx", 2));
    it("iterates over a tekst", () => expectTal(`lad n = 0; kør c af "hej" { n = n + 1 }; n`, 3));
    it("bryd exits early from forEach", () =>
        expectTal("lad s = 0; kør x af [1, 2, 3] { hvis x == 2 { bryd }; s = s + x }; s", 1));
    it("non-iterable is a fejl", () => expectFejl("kør x af 42 { x }", "itererbar"));
});

describe("functions", () => {
    it("basic call", () => expectTal("lad f = gør(x) { x + 1 }; f(5)", 6));
    it("explicit aflever", () => expectTal("lad f = gør(x) { aflever x * 2 }; f(3)", 6));
    it("aflever exits early", () => expectTal("lad f = gør(x) { aflever x; 99 }; f(7)", 7));
    it("closure captures environment", () =>
        expectTal("lad n = 10; lad f = gør() { n }; n = 20; f()", 20));
    it("recursive function", () =>
        expectTal(
            "lad fak = gør(n) { hvis n <= 1 { aflever 1 }; aflever n * fak(n - 1) }; fak(5)",
            120
        ));
    it("missing args default to niks", () => expectNiks("lad f = gør(x) { x }; f()"));
    it("higher order function", () =>
        expectTal("lad anvend = gør(f, x) { f(x) }; anvend(gør(n) { n + 1 }, 9)", 10));
});

describe("liste", () => {
    it("literal", () => {
        const result = evalSource("[1, 2, 3]");
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(3);
    });
    it("index access", () => expectTal("[10, 20, 30][1]", 20));
    it("index out of bounds returns niks", () => expectNiks("[1, 2, 3][99]"));
    it("negative index returns niks", () => expectNiks("[1, 2, 3][-1]"));
    it("length via dot", () => expectTal("[1, 2, 3].længde", 3));
    it("empty liste length", () => expectTal("[].længde", 0));
    it("assign to index", () => expectTal("lad l = [1, 2, 3]; l[0] = 99; l[0]", 99));
});

describe("ordbog", () => {
    it("string key lookup", () => expectTal(`{"a": 1, "b": 2}["a"]`, 1));
    it("integer key lookup", () => expectTal("{1: 10, 2: 20}[1]", 10));
    it("boolean key lookup", () => expectTal("{ja: 100, nej: 200}[ja]", 100));
    it("missing key returns niks", () => expectNiks(`{"a": 1}["z"]`));
    it("dot access on string key", () => expectTal(`lad o = {"navn": 42}; o.navn`, 42));
    it("dot assign on string key", () => expectTal(`lad o = {"x": 1}; o.x = 99; o.x`, 99));
    it("index assign", () => expectTal(`lad o = {"x": 1}; o["x"] = 55; o["x"]`, 55));
    it("unhashable key is a fejl", () => expectFejl("{[1]: 2}", "ordbog-nøgle"));
});

describe("pipe operator", () => {
    it("pipes value into function", () => expectTal("lad f = gør(x) { x + 1 }; 5 |> f", 6));
    it("pipes into call with extra args", () =>
        expectTal("lad add = gør(x, y) { x + y }; 3 |> add(10)", 13));
    it("chained pipes", () =>
        expectTal("lad f = gør(x) { x * 2 }; lad g = gør(x) { x + 1 }; 5 |> f |> g", 11));
});

describe("fint and øv (Resultat)", () => {
    it("fint wraps a value", () => {
        const result = evalSource("fint(42)");
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(true);
        expect(((result as Resultat).value as Tal).value).toBe(42);
    });
    it("øv wraps a value", () => {
        const result = evalSource(`øv("noget gik galt")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(false);
    });
    it(".erFint is true for fint", () => expectSandhed("fint(1).erFint", true));
    it(".erFint is false for øv", () => expectSandhed(`øv("x").erFint`, false));
    it(".værdi reads the inner value", () => expectTal("fint(7).værdi", 7));
    it(".afklæd on fint returns value", () => expectTal("fint(5).afklæd()", 5));
    it(".afklæd on øv returns fejl", () => expectFejl(`øv("bad").afklæd()`, "afklæd"));
});

describe("stram propagation", () => {
    it("stram on fint returns inner value", () => expectTal("stram fint(10)", 10));
    it("stram on øv propagates as ReturVærdi exiting function", () => {
        const result = evalSource(`
            lad f = gør() {
                lad r = øv("fejl");
                stram r;
                aflever 99
            };
            f()
        `);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(false);
    });
    it("stram on fint inside function continues normally", () =>
        expectTal(
            `
        lad f = gør() {
            lad r = fint(42);
            lad v = stram r;
            aflever v
        };
        f()
    `,
            42
        ));
});

describe("prøv match expressions", () => {
    it("matches a literal value", () => expectTal("prøv 2 { 1 => 10, 2 => 20, 3 => 30 }", 20));
    it("wildcard _ matches anything", () => expectTal("prøv 99 { 1 => 10, _ => 42 }", 42));
    it("identifier arm binds subject", () => expectTal("prøv 7 { x => x + 1 }", 8));
    it("no match returns niks", () => expectNiks("prøv 5 { 1 => 10, 2 => 20 }"));
    it("matches fint(x) pattern", () =>
        expectTal("prøv fint(42) { fint(v) => v, øv(e) => 0 }", 42));
    it("matches øv(x) pattern", () =>
        expectTekst(`prøv øv("oops") { fint(v) => "ok", øv(e) => e }`, "oops"));
    it("earlier arm wins", () => expectTal("prøv 1 { x => 1, x => 2 }", 1));
});

describe("aflever from program top-level", () => {
    it("aflever value is unwrapped at top level", () => expectTal("aflever 42", 42));
});

describe("nested closures and scoping", () => {
    it("inner function does not leak to outer scope", () =>
        expectFejl("lad f = gør() { lad x = 1 }; f(); x", "er ikke defineret"));
    it("closure over mutable variable", () =>
        expectTal("lad x = 1; lad f = gør() { x }; x = 99; f()", 99));
});

describe("builtin: råb", () => {
    it("råb returns niks", () => expectNiks(`råb("hej")`));
});

describe("builtin: type", () => {
    it("type of Tal", () => expectTekst("type(42)", "Tal"));
    it("type of Tekst", () => expectTekst(`type("hej")`, "Tekst"));
    it("type of Sandhed", () => expectTekst("type(ja)", "Sandhed"));
    it("type of Niks", () => expectTekst("type(niks)", "Niks"));
    it("type of Liste", () => expectTekst("type([1,2])", "Liste"));
    it("type of Ordbog", () => expectTekst(`type({"a":1})`, "Ordbog"));
});

describe("builtin: slankekur", () => {
    it("filters a liste", () => {
        const result = evalSource("slankekur([1, 2, 3, 4], gør(x) { x > 2 })");
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(2);
        expect(((result as Liste).elements[0] as Tal).value).toBe(3);
        expect(((result as Liste).elements[1] as Tal).value).toBe(4);
    });
    it("returns empty liste when nothing matches", () => {
        const result = evalSource("slankekur([1, 2, 3], gør(x) { x > 99 })");
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(0);
    });
    it("requires a liste as first arg", () => expectFejl("slankekur(42, gør(x) { x })", "Liste"));
});

describe("type errors", () => {
    it("negate a string is a fejl", () => expectFejl(`-"hej"`, "ukendt operator"));
    it("add Tal and Tekst is a fejl", () => expectFejl(`1 + "hej"`, "type mismatch"));
    it("call a non-function is a fejl", () => expectFejl("42()", "er ikke en funktion"));
    it("index a Tal is a fejl", () => expectFejl("42[0]", "understøttet"));
});
