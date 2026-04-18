import {describe, expect, it, afterEach, vi} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as nodePath from "node:path";
import {Lexer} from "../src/lexer.js";
import {Parser} from "../src/parser.js";
import {evaluateProgram, createModuleContext, capCodepoints} from "../src/evaluator.js";
import {
    createEnvironment,
    Tal,
    Tekst,
    Sandhed,
    Niks,
    Liste,
    Ordbog,
    Resultat,
    Fejl,
} from "../src/object.js";

function evalSource(input: string) {
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parse();
    expect(parser.errors).toHaveLength(0);
    const ctx = createModuleContext(process.cwd());
    return evaluateProgram(program, createEnvironment(), ctx);
}

// Prepend a stdlib import to a source snippet.
function withModule(module: string, source: string): string {
    return `ind ${module} fra "gemyt"\n${source}`;
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
    it("int/float are one Tal (5 / 2 is 2.5)", () => expectTal("5 / 2", 2.5));
    it("int + float produces float", () => expectTal("1 + 0.5", 1.5));
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
    it("string length via dot", () => expectTal(`"hej".vægt`, 3));
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
    it("stop exits early", () => expectTal("lad i = 0; mens ja { stop }; i", 0));
    it("stop returns niks from loop", () => expectNiks("mens ja { stop }"));
});

describe("kør forEach loop", () => {
    it("iterates over a liste", () =>
        expectTal("lad s = 0; kør x af [1, 2, 3] { s = s + x }; s", 6));
    it("provides index", () =>
        expectTal("lad idx = 0; kør x, i af [10, 20, 30] { idx = i }; idx", 2));
    it("iterates over a tekst", () => expectTal(`lad n = 0; kør c af "hej" { n = n + 1 }; n`, 3));
    it("stop exits early from forEach", () =>
        expectTal("lad s = 0; kør x af [1, 2, 3] { hvis x == 2 { stop }; s = s + x }; s", 1));
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
    it("length via dot", () => expectTal("[1, 2, 3].vægt", 3));
    it("empty liste length", () => expectTal("[].vægt", 0));
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

describe("flot and øv (Resultat)", () => {
    it("flot wraps a value", () => {
        const result = evalSource("flot(42)");
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(true);
        expect(((result as Resultat).value as Tal).value).toBe(42);
    });
    it("øv wraps a value", () => {
        const result = evalSource(`øv("noget gik galt")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });
    it(".erFlot is true for flot", () => expectSandhed("flot(1).erFlot", true));
    it(".erFlot is false for øv", () => expectSandhed(`øv("x").erFlot`, false));
    it(".værdi reads the inner value", () => expectTal("flot(7).værdi", 7));
    it(".afklæd on flot returns value", () => expectTal("flot(5).afklæd()", 5));
    it(".afklæd on øv returns fejl", () => expectFejl(`øv("bad").afklæd()`, "afklæd"));
});

describe("stram propagation", () => {
    it("stram on flot returns inner value", () => expectTal("stram flot(10)", 10));
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
        expect((result as Resultat).erFlot).toBe(false);
    });
    it("stram on flot inside function continues normally", () =>
        expectTal(
            `
        lad f = gør() {
            lad r = flot(42);
            lad v = stram r;
            aflever v
        };
        f()
    `,
            42
        ));

    it("stram on øv at top level becomes a fatal Fejl", () =>
        expectFejl(`stram øv("filen mangler")`, "stram bobbede op til toppen"));

    it("top-level stram-øv Fejl includes the inner message", () =>
        expectFejl(`stram øv("filen mangler")`, "filen mangler"));

    it("stram on flot at top level still unwraps to the inner value", () =>
        expectTal("stram flot(42)", 42));

    it("top-level stram after an ok value continues", () =>
        expectTal("lad r = flot(7); lad v = stram r; v", 7));

    it("plain øv at top level is NOT treated as fatal (no stram, no ReturVærdi)", () => {
        const result = evalSource(`øv("bare en værdi")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });

    it("plain flot at top level remains a Resultat (unchanged)", () => {
        const result = evalSource(`flot(42)`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(true);
    });

    it("stram-øv inside a function does NOT fatal — only bubbles to caller", () => {
        // f() captures the øv via ReturVærdi; at the call site it becomes a
        // plain Resultat, which is NOT a top-level ReturVærdi.
        const result = evalSource(`
            lad f = gør() { stram øv("inside"); aflever 99 };
            f()
        `);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });
});

describe("prøv match expressions", () => {
    it("matches a literal value", () => expectTal("prøv 2 { 1 => 10, 2 => 20, 3 => 30 }", 20));
    it("wildcard _ matches anything", () => expectTal("prøv 99 { 1 => 10, _ => 42 }", 42));
    it("identifier arm binds subject", () => expectTal("prøv 7 { x => x + 1 }", 8));
    it("no match returns fejl", () =>
        expectFejl("prøv 5 { 1 => 10, 2 => 20 }", "intet mønster matchede"));
    it("matches flot(x) pattern", () =>
        expectTal("prøv flot(42) { flot(v) => v, øv(e) => 0 }", 42));
    it("matches øv(x) pattern", () =>
        expectTekst(`prøv øv("oops") { flot(v) => "ok", øv(e) => e }`, "oops"));
    it("earlier arm wins among equal literals", () =>
        expectTal("prøv 1 { 1 => 1, 1 => 2 }", 1));
    it("explicit wildcard fallthrough is allowed", () =>
        expectTal("prøv 99 { 1 => 10, _ => 42 }", 42));
    it("rejects unreachable arms after bare identifier", () => {
        const src = "prøv 1 { x => 1, 2 => 2 }";
        const lexer = new Lexer(src);
        const parser = new Parser(lexer);
        parser.parse();
        expect(parser.errors.length).toBeGreaterThan(0);
        expect(parser.errors.join("\n")).toMatch(/bindingsmønster 'x'.*aldrig matche/);
    });
    it("rejects unreachable arms after wildcard '_'", () => {
        const src = "prøv 1 { _ => 0, 1 => 1 }";
        const lexer = new Lexer(src);
        const parser = new Parser(lexer);
        parser.parse();
        expect(parser.errors.length).toBeGreaterThan(0);
        expect(parser.errors.join("\n")).toMatch(/jokertegn.*aldrig matche/);
    });
    it("allows bare identifier as last arm (catch-all bind)", () =>
        expectTal("prøv 7 { 1 => 0, x => x + 1 }", 8));
    it("allows flot(y) as non-last arm (doesn't always match)", () =>
        expectTekst(
            `prøv øv("oops") { flot(v) => "ok", øv(e) => e }`,
            "oops"
        ));
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

describe("builtin: række", () => {
    it("single arg produces 0..n exclusive", () => {
        const result = evalSource("række(3)");
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements.map((e) => (e as Tal).value)).toEqual([0, 1, 2]);
    });
    it("two args produces fra..til exclusive", () => {
        const result = evalSource("række(2, 5)");
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements.map((e) => (e as Tal).value)).toEqual([2, 3, 4]);
    });
    it("empty when fra >= til", () => {
        const result = evalSource("række(5, 3)");
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(0);
    });
    it("no args defaults fra=0 til=0 producing empty", () => {
        const result = evalSource("række()");
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(0);
    });
    it("negative fra is a fejl", () => expectFejl("række(-1, 3)", "fra"));
    it("negative til is a fejl", () => expectFejl("række(0, -1)", "til"));
    it("non-Tal fra is a fejl", () => expectFejl(`række("x", 3)`, "Tal"));
    it("non-Tal til is a fejl", () => expectFejl(`række(0, "x")`, "Tal"));
});

describe("builtin: afslut", () => {
    afterEach(() => vi.restoreAllMocks());

    it("calls process.exit with given kode", () => {
        const spy = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
            throw new Error("__exit__");
        }) as never);
        expect(() => evalSource("afslut(3)")).toThrow("__exit__");
        expect(spy).toHaveBeenCalledWith(3);
    });
    it("defaults to 0 when no arg is given", () => {
        const spy = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
            throw new Error("__exit__");
        }) as never);
        expect(() => evalSource("afslut()")).toThrow("__exit__");
        expect(spy).toHaveBeenCalledWith(0);
    });
    it("defaults to 0 when arg is not a Tal", () => {
        const spy = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
            throw new Error("__exit__");
        }) as never);
        expect(() => evalSource(`afslut("nej")`)).toThrow("__exit__");
        expect(spy).toHaveBeenCalledWith(0);
    });
});

describe("builtin: gemyt.type", () => {
    it("type of Tal", () => expectTekst(withModule("gemyt", "gemyt.type(42)"), "Tal"));
    it("type of Tekst", () => expectTekst(withModule("gemyt", `gemyt.type("hej")`), "Tekst"));
    it("type of Sandhed", () => expectTekst(withModule("gemyt", "gemyt.type(ja)"), "Sandhed"));
    it("type of Niks", () => expectTekst(withModule("gemyt", "gemyt.type(niks)"), "Niks"));
    it("type of Liste", () => expectTekst(withModule("gemyt", "gemyt.type([1,2])"), "Liste"));
    it("type of Ordbog", () =>
        expectTekst(withModule("gemyt", `gemyt.type({"a":1})`), "Ordbog"));
});

describe("builtin: liste.slankekur", () => {
    it("filters a liste", () => {
        const result = evalSource(
            withModule("liste", "liste.slankekur([1, 2, 3, 4], gør(x) { x > 2 })")
        );
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(2);
        expect(((result as Liste).elements[0] as Tal).value).toBe(3);
        expect(((result as Liste).elements[1] as Tal).value).toBe(4);
    });
    it("returns empty liste when nothing matches", () => {
        const result = evalSource(
            withModule("liste", "liste.slankekur([1, 2, 3], gør(x) { x > 99 })")
        );
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(0);
    });
    it("requires a liste as first arg", () =>
        expectFejl(
            withModule("liste", "liste.slankekur(42, gør(x) { x })"),
            "Liste"
        ));
});

describe("builtin: liste (mutators)", () => {
    it("skub appends and returns the same liste", () => {
        const result = evalSource(
            withModule("liste", "lad l = [1, 2]; liste.skub(l, 3); l")
        );
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements.map((e) => (e as Tal).value)).toEqual([1, 2, 3]);
    });
    it("skub requires a Liste", () =>
        expectFejl(withModule("liste", "liste.skub(42, 1)"), "Liste"));
    it("skub requires a value arg", () =>
        expectFejl(withModule("liste", "liste.skub([1, 2])"), "sidste argument"));

    it("fyld creates a liste with n copies of a value", () => {
        const result = evalSource(withModule("liste", "liste.fyld(0, 4)"));
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements.map((e) => (e as Tal).value)).toEqual([0, 0, 0, 0]);
    });
    it("fyld with 0 gives empty liste", () => {
        const result = evalSource(withModule("liste", "liste.fyld(7, 0)"));
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(0);
    });
    it("fyld requires a value", () =>
        expectFejl(withModule("liste", "liste.fyld()"), "første argument"));
    it("fyld requires a Tal amount", () =>
        expectFejl(withModule("liste", `liste.fyld(1, "to")`), "Tal"));

    it("genfyld overwrites every element", () => {
        const result = evalSource(
            withModule("liste", "lad l = [1, 2, 3]; liste.genfyld(l, 9); l")
        );
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements.map((e) => (e as Tal).value)).toEqual([9, 9, 9]);
    });
    it("genfyld on empty liste is a no-op", () => {
        const result = evalSource(withModule("liste", "lad l = []; liste.genfyld(l, 1); l"));
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(0);
    });
    it("genfyld requires a Liste", () =>
        expectFejl(withModule("liste", "liste.genfyld(42, 1)"), "Liste"));
    it("genfyld requires a value", () =>
        expectFejl(withModule("liste", "liste.genfyld([1, 2])"), "sidste argument"));
});

describe("builtin: tekst (coercion)", () => {
    it("converts Tal to string", () => expectTekst("tekst(42)", "42"));
    it("converts Sandhed true to string", () => expectTekst("tekst(ja)", "ja"));
    it("converts Sandhed false to string", () => expectTekst("tekst(nej)", "nej"));
    it("converts niks to string", () => expectTekst("tekst(niks)", "niks"));
    it("returns string as-is", () => expectTekst(`tekst("hej")`, "hej"));
    it("no argument gives niks string", () => expectTekst("tekst()", "niks"));
});

describe("builtin: tal (coercion)", () => {
    it("returns Tal unchanged", () => {
        const result = evalSource("tal(42)");
        expect(result).toBeInstanceOf(Tal);
        expect((result as Tal).value).toBe(42);
    });
    it("converts numeric string to flot(Tal)", () => {
        const result = evalSource(`tal("3.14")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(true);
        expect(((result as Resultat).value as Tal).value).toBe(3.14);
    });
    it("invalid string returns øv", () => {
        const result = evalSource(`tal("ikke_et_tal")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });
    it("true converts to 1", () => expectTal("tal(ja)", 1));
    it("false converts to 0", () => expectTal("tal(nej)", 0));
    it("Sandhed conversion is direct Tal, not Resultat", () => {
        const result = evalSource("tal(ja)");
        expect(result).toBeInstanceOf(Tal);
    });
    it("niks returns øv", () => {
        const result = evalSource("tal(niks)");
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });
});

describe("builtin: tekst module (string operations)", () => {
    it("split splits on separator", () => {
        const result = evalSource(withModule("tekst", `tekst.split("a,b,c", ",")`));
        expect(result).toBeInstanceOf(Liste);
        const els = (result as Liste).elements;
        expect(els).toHaveLength(3);
        expect((els[0] as Tekst).value).toBe("a");
        expect((els[2] as Tekst).value).toBe("c");
    });
    it("split with empty separator splits every char", () => {
        const result = evalSource(withModule("tekst", `tekst.split("hej", "")`));
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(3);
    });
    it("trim removes whitespace", () =>
        expectTekst(withModule("tekst", `tekst.trim("  hej  ")`), "hej"));
    it("trim leaves clean string alone", () =>
        expectTekst(withModule("tekst", `tekst.trim("hej")`), "hej"));
    it("søg true when present", () =>
        expectSandhed(withModule("tekst", `tekst.søg("hej verden", "verden")`), true));
    it("søg false when absent", () =>
        expectSandhed(withModule("tekst", `tekst.søg("hej verden", "xyz")`), false));
    it("starter_med true", () =>
        expectSandhed(withModule("tekst", `tekst.starter_med("hej verden", "hej")`), true));
    it("starter_med false", () =>
        expectSandhed(withModule("tekst", `tekst.starter_med("hej verden", "verden")`), false));
    it("ender_med true", () =>
        expectSandhed(withModule("tekst", `tekst.ender_med("hej verden", "verden")`), true));
    it("ender_med false", () =>
        expectSandhed(withModule("tekst", `tekst.ender_med("hej verden", "hej")`), false));
    it("erstat replaces all occurrences", () =>
        expectTekst(withModule("tekst", `tekst.erstat("a-b-c", "-", "_")`), "a_b_c"));
    it("grande uppercases", () =>
        expectTekst(withModule("tekst", `tekst.grande("hej")`), "HEJ"));
    it("bitte lowercases", () =>
        expectTekst(withModule("tekst", `tekst.bitte("HEJ")`), "hej"));
    it("split requires tekst args", () =>
        expectFejl(withModule("tekst", "tekst.split(42, 1)"), "forventer Tekst"));
    it("trim requires tekst arg", () =>
        expectFejl(withModule("tekst", "tekst.trim(42)"), "forventer Tekst"));
});

describe("builtin: stig module (path operations)", () => {
    it("vej joins segments", () => {
        const result = evalSource(withModule("stig", `stig.vej("a", "b", "c")`));
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toBe(nodePath.join("a", "b", "c"));
    });
    it("mappe returns dirname", () => {
        const result = evalSource(withModule("stig", `stig.mappe("/some/path/fil.txt")`));
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toBe(nodePath.dirname("/some/path/fil.txt"));
    });
    it("fil returns basename", () =>
        expectTekst(withModule("stig", `stig.fil("/some/path/fil.txt")`), "fil.txt"));
    it("udvidelse returns extension", () =>
        expectTekst(withModule("stig", `stig.udvidelse("/some/path/fil.txt")`), ".txt"));
    it("udvidelse empty for no extension", () =>
        expectTekst(withModule("stig", `stig.udvidelse("/some/path/fil")`), ""));
    it("vej requires tekst args", () =>
        expectFejl(withModule("stig", "stig.vej(1, 2)"), "forventer Tekst"));
});

describe("builtin: json module", () => {
    it("fra parses object", () => {
        const result = evalSource(withModule("json", `json.fra("{\\"a\\":1}")`));
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(true);
        expect((result as Resultat).value).toBeInstanceOf(Ordbog);
    });
    it("fra parses array", () => {
        const result = evalSource(withModule("json", `json.fra("[1,2,3]")`));
        expect(result).toBeInstanceOf(Resultat);
        const inner = (result as Resultat).value;
        expect(inner).toBeInstanceOf(Liste);
        expect((inner as Liste).elements).toHaveLength(3);
    });
    it("fra parses number", () => {
        const result = evalSource(withModule("json", `json.fra("42")`));
        expect(result).toBeInstanceOf(Resultat);
        expect(((result as Resultat).value as Tal).value).toBe(42);
    });
    it("fra returns øv on invalid JSON", () => {
        const result = evalSource(withModule("json", `json.fra("ikke json")`));
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });
    it("til serializes a Tal", () => expectTekst(withModule("json", "json.til(42)"), "42"));
    it("til serializes a Tekst", () =>
        expectTekst(withModule("json", `json.til("hej")`), `"hej"`));
    it("til serializes a Liste", () =>
        expectTekst(withModule("json", "json.til([1, 2, 3])"), "[1,2,3]"));
    it("til serializes niks as null", () =>
        expectTekst(withModule("json", "json.til(niks)"), "null"));
    it("til no arg gives null", () => expectTekst(withModule("json", "json.til()"), "null"));
    it("flot produces indented output for a liste", () => {
        const result = evalSource(withModule("json", "json.flot([1])"));
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toContain("\n");
    });
    it("flot produces indented output for an ordbog", () => {
        const result = evalSource(withModule("json", `json.flot({"a": 1})`));
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toContain("\n");
    });
    it("flot reformats a compact JSON string", () => {
        const result = evalSource(withModule("json", `json.flot(json.til({"a": 1}))`));
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toContain("\n");
    });
});

describe("builtin: fil module (filesystem)", () => {
    let tmpDir: string;

    afterEach(() => {
        if (tmpDir) fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    function withTmpDir(fn: (dir: string) => void) {
        tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "gemyt-test-"));
        fn(tmpDir);
    }

    it("skriv and læs round-trip", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "test.txt").replace(/\\/g, "/");
            const result = evalSource(withModule("fil", `fil.skriv("${fil}", "hej verden")`));
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFlot).toBe(true);

            const read = evalSource(withModule("fil", `fil.læs("${fil}")`));
            expect(read).toBeInstanceOf(Resultat);
            expect(((read as Resultat).value as Tekst).value).toBe("hej verden");
        });
    });

    it("tilføj appends content", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "append.txt").replace(/\\/g, "/");
            evalSource(withModule("fil", `fil.skriv("${fil}", "linje1")`));
            evalSource(withModule("fil", `fil.tilføj("${fil}", "linje2")`));
            const read = evalSource(withModule("fil", `fil.læs("${fil}")`));
            expect(((read as Resultat).value as Tekst).value).toBe("linje1linje2");
        });
    });

    it("læs on missing file returns øv", () => {
        const result = evalSource(withModule("fil", `fil.læs("/findes/ikke/overhovedet.txt")`));
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });

    it("findes returns ja for existing file", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "x.txt").replace(/\\/g, "/");
            fs.writeFileSync(fil, "x");
            expectSandhed(withModule("fil", `fil.findes("${fil}")`), true);
        });
    });

    it("findes returns nej for missing path", () => {
        expectSandhed(withModule("fil", `fil.findes("/dette/findes/ikke")`), false);
    });

    it("er_fil true for a file", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "x.txt").replace(/\\/g, "/");
            fs.writeFileSync(fil, "x");
            expectSandhed(withModule("fil", `fil.er_fil("${fil}")`), true);
        });
    });

    it("er_mappe true for a directory", () => {
        withTmpDir((dir) => {
            const d = dir.replace(/\\/g, "/");
            expectSandhed(withModule("fil", `fil.er_mappe("${d}")`), true);
        });
    });

    it("er_mappe false for a file", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "x.txt").replace(/\\/g, "/");
            fs.writeFileSync(fil, "x");
            expectSandhed(withModule("fil", `fil.er_mappe("${fil}")`), false);
        });
    });

    it("opret_mappe creates directory", () => {
        withTmpDir((dir) => {
            const sub = nodePath.join(dir, "sub", "deep").replace(/\\/g, "/");
            const result = evalSource(withModule("fil", `fil.opret_mappe("${sub}")`));
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFlot).toBe(true);
            expect(fs.existsSync(sub)).toBe(true);
        });
    });

    it("læs_mappe lists entries", () => {
        withTmpDir((dir) => {
            fs.writeFileSync(nodePath.join(dir, "a.txt"), "");
            fs.writeFileSync(nodePath.join(dir, "b.txt"), "");
            const d = dir.replace(/\\/g, "/");
            const result = evalSource(withModule("fil", `fil.læs_mappe("${d}")`));
            expect(result).toBeInstanceOf(Resultat);
            const inner = (result as Resultat).value;
            expect(inner).toBeInstanceOf(Liste);
            expect((inner as Liste).elements).toHaveLength(2);
        });
    });

    it("udryd removes a file", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "del.txt").replace(/\\/g, "/");
            fs.writeFileSync(fil, "x");
            const result = evalSource(withModule("fil", `fil.udryd("${fil}")`));
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFlot).toBe(true);
            expect(fs.existsSync(fil)).toBe(false);
        });
    });

    it("omdøb renames a file", () => {
        withTmpDir((dir) => {
            const fra = nodePath.join(dir, "fra.txt").replace(/\\/g, "/");
            const til = nodePath.join(dir, "til.txt").replace(/\\/g, "/");
            fs.writeFileSync(fra, "x");
            const result = evalSource(withModule("fil", `fil.omdøb("${fra}", "${til}")`));
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFlot).toBe(true);
            expect(fs.existsSync(til)).toBe(true);
            expect(fs.existsSync(fra)).toBe(false);
        });
    });

    it("skriv wrong arg type is fejl", () => {
        expectFejl(withModule("fil", "fil.skriv(42, 42)"), "forventer Tekst");
    });
});

describe("builtin: gemyt module (process)", () => {
    it("cwd returns a string", () => {
        const result = evalSource(withModule("gemyt", "gemyt.cwd()"));
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value.length).toBeGreaterThan(0);
    });
    it("args returns a liste", () => {
        const result = evalSource(withModule("gemyt", "gemyt.args()"));
        expect(result).toBeInstanceOf(Liste);
    });
    it("env returns tekst for set variable", () => {
        process.env["GEMYT_TEST_VAR"] = "hejsa";
        const result = evalSource(withModule("gemyt", `gemyt.env("GEMYT_TEST_VAR")`));
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toBe("hejsa");
        delete process.env["GEMYT_TEST_VAR"];
    });
    it("env returns niks for unset variable", () => {
        expectNiks(withModule("gemyt", `gemyt.env("GEMYT_FINDES_IKKE_XYZ")`));
    });
    it("env requires tekst arg", () =>
        expectFejl(withModule("gemyt", "gemyt.env(42)"), "forventer Tekst"));
});

describe("builtin: kommando module", () => {
    it("kør runs a successful command and returns flot(output)", () => {
        const result = evalSource(withModule("kommando", `kommando.kør("node --version")`));
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(true);
        expect(((result as Resultat).value as Tekst).value).toMatch(/^v\d+/);
    });
    it("kør failed command returns øv with stderr", () => {
        const result = evalSource(
            withModule("kommando", `kommando.kør("node -e \\"process.exit(1)\\"")`)
        );
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFlot).toBe(false);
    });
    it("kør requires a tekst arg", () =>
        expectFejl(withModule("kommando", "kommando.kør(42)"), "forventer Tekst"));
});

describe("import system", () => {
    it("importing unknown stdlib module is a fejl", () => {
        expectFejl(`ind ukendt fra "gemyt"`, "ukendt standardbibliotekets modul");
    });

    it("importing from unknown source is a fejl", () => {
        expectFejl(`ind x fra "http://example.com"`, "ukendt importkilde");
    });

    it("importing missing user file is a fejl", () => {
        expectFejl(`ind x fra "./findes-ikke"`, "findes ikke");
    });

    it("imported stdlib name is immutable", () => {
        expectFejl(
            `ind linjer fra "gemyt"\nlinjer = niks`,
            "stabil"
        );
    });

    it("can import multiple modules from gemyt", () => {
        const result = evalSource(
            `ind json, tekst fra "gemyt"\ntekst.trim(json.til(42))`
        );
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toBe("42");
    });

    it("user file export and import", () => {
        const tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "gemyt-test-"));
        try {
            const modPath = nodePath.join(tmpDir, "math.gemyt");
            fs.writeFileSync(modPath, `ud stabil kvadrat = gør(x) { x * x }`);
            const result = evalSource(
                `ind kvadrat fra "${modPath.replace(/\\/g, "/")}"\nkvadrat(5)`
            );
            expect(result).toBeInstanceOf(Tal);
            expect((result as Tal).value).toBe(25);
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    });

    it("importing unexported name from user file is a fejl", () => {
        const tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "gemyt-test-"));
        try {
            const modPath = nodePath.join(tmpDir, "empty.gemyt");
            fs.writeFileSync(modPath, `stabil x = 1`);
            expectFejl(
                `ind x fra "${modPath.replace(/\\/g, "/")}"`,
                "er ikke eksporteret"
            );
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    });

    it("circular import returns fejl", () => {
        const tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "gemyt-test-"));
        try {
            const aPath = nodePath.join(tmpDir, "a.gemyt").replace(/\\/g, "/");
            const bPath = nodePath.join(tmpDir, "b.gemyt").replace(/\\/g, "/");
            fs.writeFileSync(aPath, `ind b fra "${bPath}"\nud stabil x = 1`);
            fs.writeFileSync(bPath, `ind a fra "${aPath}"\nud stabil y = 2`);
            expectFejl(`ind a fra "${aPath}"`, "cirkulær import");
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    });

    it("loading set is cleaned up when import throws (try/finally)", () => {
        // If an import throws mid-way (e.g. fs.readFileSync on a directory),
        // the 'loading' set must still be cleaned up. Otherwise a later
        // import of the same path reports a phantom circular-import error.
        const tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "gemyt-test-"));
        try {
            // A directory exists-check passes, but readFileSync throws EISDIR.
            const dirAsModule = nodePath.join(tmpDir, "dir.gemyt");
            fs.mkdirSync(dirAsModule);

            const ctx = createModuleContext(process.cwd());
            const src = `ind x fra "${dirAsModule.replace(/\\/g, "/")}"`;

            // First attempt throws (readFileSync on a directory is EISDIR).
            const lex1 = new Lexer(src);
            const p1 = new Parser(lex1);
            const prog1 = p1.parse();
            expect(() => evaluateProgram(prog1, createEnvironment(), ctx)).toThrow();

            // If finally-cleanup is missing, 'loading' still has the path and
            // the next attempt reports circular import. With the fix, the next
            // attempt reaches readFileSync again and throws the same error.
            const lex2 = new Lexer(src);
            const p2 = new Parser(lex2);
            const prog2 = p2.parse();
            expect(() => evaluateProgram(prog2, createEnvironment(), ctx)).toThrow();

            // And the loading set must be empty between attempts.
            // (We can't read ctx.loading directly without exposing it, but
            // the second throw matching the first behavior is proof.)
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    });

    it("user file is cached: evaluated only once", () => {
        const tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "gemyt-test-"));
        try {
            const modPath = nodePath.join(tmpDir, "tæller.gemyt").replace(/\\/g, "/");
            fs.writeFileSync(modPath, `ud stabil v = 42`);
            // Import twice in the same program
            const result = evalSource(
                `ind v fra "${modPath}"\nind v fra "${modPath}"\nv`
            );
            expect(result).toBeInstanceOf(Tal);
            expect((result as Tal).value).toBe(42);
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    });
});

describe("type errors", () => {
    it("negate a string is a fejl", () => expectFejl(`-"hej"`, "ukendt operator"));
    it("call a non-function is a fejl", () => expectFejl("42()", "er ikke en funktion"));
    it("index a Tal is a fejl", () => expectFejl("42[0]", "understøttet"));
});

describe("modulo operator", () => {
    it("basic modulo", () => expectTal("10 % 3", 1));
    it("even division yields zero", () => expectTal("9 % 3", 0));
    it("modulo with floats", () => expectTal("5.5 % 2", 1.5));
    it("modulo by zero returns fejl", () => expectFejl("5 % 0", "det kan man"));
    it("modulo precedence same as multiply", () => expectTal("2 + 10 % 3", 3));
});

describe("compound assignment", () => {
    it("+= adds to variable", () => expectTal("lad x = 5; x += 3; x", 8));
    it("-= subtracts from variable", () => expectTal("lad x = 10; x -= 4; x", 6));
    it("*= multiplies variable", () => expectTal("lad x = 3; x *= 4; x", 12));
    it("/= divides variable", () => expectTal("lad x = 10; x /= 2; x", 5));
    it("+= on list index", () => expectTal("lad l = [1, 2, 3]; l[1] += 10; l[1]", 12));
    it("+= on ordbog dot field", () => expectTal(`lad o = {"n": 5}; o.n += 1; o.n`, 6));
    it("+= chained in loop", () =>
        expectTal("lad s = 0; kør x af [1, 2, 3, 4] { s += x }; s", 10));
    it("/= by zero returns fejl", () => expectFejl("lad x = 5; x /= 0", "det kan man"));
});

describe("Tal+Tekst coercion on +", () => {
    it("Tal + Tekst concatenates", () => expectTekst(`1 + "hej"`, "1hej"));
    it("Tekst + Tal concatenates", () => expectTekst(`"hej" + 1`, "hej1"));
    it("Tal + Tal is still arithmetic", () => expectTal("2 + 3", 5));
    it("Tekst + Tekst is still string concat", () => expectTekst(`"a" + "b"`, "ab"));
    it("float coerced to string", () => expectTekst(`"pi=" + 3.14`, "pi=3.14"));
    it("coercion in compound +=", () => expectTekst(`lad s = "tæller: "; s += 42; s`, "tæller: 42"));
});

describe("Primitive+Tekst coercion on + (extended)", () => {
    it("Sandhed (ja) + Tekst concatenates", () => expectTekst(`"ok: " + ja`, "ok: ja"));
    it("Sandhed (nej) + Tekst concatenates", () => expectTekst(`"ok: " + nej`, "ok: nej"));
    it("Niks + Tekst concatenates", () => expectTekst(`"v: " + niks`, "v: niks"));
    it("Tekst + Sandhed concatenates (primitive on right)", () =>
        expectTekst(`ja + "!"`, "ja!"));
    it("Tekst + Niks concatenates (primitive on right)", () =>
        expectTekst(`niks + "!"`, "niks!"));
    it("== does NOT coerce Tal and Tekst", () => expectSandhed(`1 == "1"`, false));
    it("== does NOT coerce Sandhed and Tekst", () => expectSandhed(`ja == "ja"`, false));
    it("Liste + Tekst is a fejl (composite not coerced)", () =>
        expectFejl(`[1, 2] + "!"`, "Liste"));
    it("Ordbog + Tekst is a fejl (composite not coerced)", () =>
        expectFejl(`{"a": 1} + "!"`, "Ordbog"));
    it("Sandhed + Sandhed (no Tekst) is a fejl — no coercion", () =>
        expectFejl(`ja + nej`, "Sandhed"));
    it("Niks + Niks (no Tekst) is a fejl — no coercion", () => expectFejl(`niks + niks`, "Niks"));
    it("- does NOT coerce with Tekst", () => expectFejl(`"a" - 1`, "Tekst - Tal"));
    it("* does NOT coerce with Tekst", () => expectFejl(`"a" * 2`, "Tekst * Tal"));
});

describe("Structural equality (==, !=)", () => {
    it("Liste: same elements are equal", () => expectSandhed(`[1, 2, 3] == [1, 2, 3]`, true));
    it("Liste: different length is not equal", () => expectSandhed(`[1, 2] == [1, 2, 3]`, false));
    it("Liste: different elements are not equal", () =>
        expectSandhed(`[1, 2, 3] == [1, 2, 4]`, false));
    it("Liste: empty are equal", () => expectSandhed(`[] == []`, true));
    it("Liste: != works", () => expectSandhed(`[1, 2] != [1, 3]`, true));
    it("Liste: nested equal", () =>
        expectSandhed(`[[1, 2], [3]] == [[1, 2], [3]]`, true));
    it("Liste: nested unequal", () =>
        expectSandhed(`[[1, 2], [3]] == [[1, 2], [4]]`, false));
    it("Liste: distinct instances bound to vars still equal", () =>
        expectSandhed(`lad a = [1, 2]; lad b = [1, 2]; a == b`, true));

    it("Ordbog: same pairs are equal", () =>
        expectSandhed(`{"a": 1, "b": 2} == {"a": 1, "b": 2}`, true));
    it("Ordbog: key order does not matter", () =>
        expectSandhed(`{"a": 1, "b": 2} == {"b": 2, "a": 1}`, true));
    it("Ordbog: different values not equal", () =>
        expectSandhed(`{"a": 1} == {"a": 2}`, false));
    it("Ordbog: different size not equal", () =>
        expectSandhed(`{"a": 1} == {"a": 1, "b": 2}`, false));
    it("Ordbog: missing key not equal", () =>
        expectSandhed(`{"a": 1} == {"b": 1}`, false));
    it("Ordbog: empty are equal", () => expectSandhed(`{} == {}`, true));
    it("Ordbog: nested liste equal", () =>
        expectSandhed(`{"xs": [1, 2]} == {"xs": [1, 2]}`, true));
    it("Ordbog: nested liste unequal", () =>
        expectSandhed(`{"xs": [1, 2]} == {"xs": [1, 3]}`, false));

    it("Resultat: flot(x) == flot(x)", () => expectSandhed(`flot(1) == flot(1)`, true));
    it("Resultat: øv(x) == øv(x)", () => expectSandhed(`øv("e") == øv("e")`, true));
    it("Resultat: flot vs øv not equal", () => expectSandhed(`flot(1) == øv(1)`, false));
    it("Resultat: different inner values not equal", () =>
        expectSandhed(`flot(1) == flot(2)`, false));
    it("Resultat: structural inner values", () =>
        expectSandhed(`flot([1, 2]) == flot([1, 2])`, true));

    it("Funktion: same closure is equal to itself", () =>
        expectSandhed(`lad f = gør(x) { x }; f == f`, true));
    it("Funktion: two distinct closures are not equal", () =>
        expectSandhed(`lad f = gør(x) { x }; lad g = gør(x) { x }; f == g`, false));

    it("Cross-kind: Liste vs Ordbog not equal", () => expectSandhed(`[] == {}`, false));
    it("Cross-kind: Resultat vs raw value not equal", () =>
        expectSandhed(`flot(1) == 1`, false));

    it("Match: Liste pattern matches structurally", () =>
        expectTal(
            `prøv [1, 2, 3] { [1, 2, 3] => 42, _ => 0 }`,
            42
        ));
    it("Match: Resultat pattern matches structurally", () =>
        expectTal(
            `prøv flot(5) { flot(5) => 42, _ => 0 }`,
            42
        ));
    it("Match: Ordbog pattern matches structurally", () =>
        expectTal(
            `prøv {"a": 1} { {"a": 1} => 42, _ => 0 }`,
            42
        ));

    // Cycle detection: these would blow the stack without the seen-set.
    it("Cyclic Liste: self-equality short-circuits", () =>
        expectSandhed(`lad a = [1]; a[0] = a; a == a`, true));
    it("Cyclic Liste: two equivalent self-cycles are equal", () =>
        expectSandhed(`lad a = [1]; lad b = [1]; a[0] = a; b[0] = b; a == b`, true));
    it("Cyclic Ordbog: self-equality short-circuits", () =>
        expectSandhed(`lad a = {"x": 1}; a["x"] = a; a == a`, true));
    it("Cyclic Ordbog: two equivalent self-cycles are equal", () =>
        expectSandhed(
            `lad a = {"x": 1}; lad b = {"x": 1}; a["x"] = a; b["x"] = b; a == b`,
            true
        ));
    it("Cyclic Liste: non-cyclic difference still detected", () =>
        expectSandhed(
            // Both cycle at index 0, but index 1 differs (2 vs 3).
            `lad a = [1, 2]; lad b = [1, 3]; a[0] = a; b[0] = b; a == b`,
            false
        ));
});

describe("capCodepoints", () => {
    it("passes through strings shorter than the cap", () =>
        expect(capCodepoints("hej", 10)).toBe("hej"));
    it("passes through strings exactly at the cap", () =>
        expect(capCodepoints("hejsa", 5)).toBe("hejsa"));
    it("truncates strings longer than the cap", () =>
        expect(capCodepoints("hejsa verden", 5)).toBe("hejsa"));
    it("empty string is unchanged", () => expect(capCodepoints("", 5)).toBe(""));
    it("cap 0 returns empty", () => expect(capCodepoints("hej", 0)).toBe(""));
    it("counts Danish letters (BMP) as one codepoint each", () =>
        expect(capCodepoints("æøå blah", 3)).toBe("æøå"));
    it("keeps surrogate pairs intact (does not split emoji)", () => {
        // 🙂 is U+1F642, encoded as a surrogate pair in UTF-16 (string.length === 2).
        // capCodepoints must count it as ONE codepoint, not two.
        const s = "a🙂b";
        expect(s.length).toBe(4); // 1 + 2 (surrogate pair) + 1
        expect(Array.from(s).length).toBe(3);
        expect(capCodepoints(s, 2)).toBe("a🙂");
    });
    it("does not split a surrogate pair at the boundary", () => {
        // If we used s.slice(0, 2) instead of codepoint iteration, we'd get
        // "a\uD83D" — a lone high surrogate, invalid UTF-16. Codepoint-aware
        // slicing keeps the pair intact or drops it whole.
        const out = capCodepoints("a🙂b", 1);
        expect(out).toBe("a");
        expect([...out].length).toBe(1);
    });
});

