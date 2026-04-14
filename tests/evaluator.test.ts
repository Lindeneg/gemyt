import {describe, expect, it, afterEach} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as nodePath from "node:path";
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
    Ordbog,
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
        expect((result as Resultat).erFint).toBe(true);
        expect(((result as Resultat).value as Tal).value).toBe(42);
    });
    it("øv wraps a value", () => {
        const result = evalSource(`øv("noget gik galt")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(false);
    });
    it(".erFint is true for flot", () => expectSandhed("flot(1).erFint", true));
    it(".erFint is false for øv", () => expectSandhed(`øv("x").erFint`, false));
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
        expect((result as Resultat).erFint).toBe(false);
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
});

describe("prøv match expressions", () => {
    it("matches a literal value", () => expectTal("prøv 2 { 1 => 10, 2 => 20, 3 => 30 }", 20));
    it("wildcard _ matches anything", () => expectTal("prøv 99 { 1 => 10, _ => 42 }", 42));
    it("identifier arm binds subject", () => expectTal("prøv 7 { x => x + 1 }", 8));
    it("no match returns niks", () => expectNiks("prøv 5 { 1 => 10, 2 => 20 }"));
    it("matches flot(x) pattern", () =>
        expectTal("prøv flot(42) { flot(v) => v, øv(e) => 0 }", 42));
    it("matches øv(x) pattern", () =>
        expectTekst(`prøv øv("oops") { flot(v) => "ok", øv(e) => e }`, "oops"));
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

describe("builtin: gemyt_type", () => {
    it("type of Tal", () => expectTekst("gemyt_type(42)", "Tal"));
    it("type of Tekst", () => expectTekst(`gemyt_type("hej")`, "Tekst"));
    it("type of Sandhed", () => expectTekst("gemyt_type(ja)", "Sandhed"));
    it("type of Niks", () => expectTekst("gemyt_type(niks)", "Niks"));
    it("type of Liste", () => expectTekst("gemyt_type([1,2])", "Liste"));
    it("type of Ordbog", () => expectTekst(`gemyt_type({"a":1})`, "Ordbog"));
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
        expect((result as Resultat).erFint).toBe(true);
        expect(((result as Resultat).value as Tal).value).toBe(3.14);
    });
    it("invalid string returns øv", () => {
        const result = evalSource(`tal("ikke_et_tal")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(false);
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
        expect((result as Resultat).erFint).toBe(false);
    });
});

describe("builtin: string operations", () => {
    it("tekst_split splits on separator", () => {
        const result = evalSource(`tekst_split("a,b,c", ",")`);
        expect(result).toBeInstanceOf(Liste);
        const els = (result as Liste).elements;
        expect(els).toHaveLength(3);
        expect((els[0] as Tekst).value).toBe("a");
        expect((els[2] as Tekst).value).toBe("c");
    });
    it("tekst_split with empty separator splits every char", () => {
        const result = evalSource(`tekst_split("hej", "")`);
        expect(result).toBeInstanceOf(Liste);
        expect((result as Liste).elements).toHaveLength(3);
    });
    it("tekst_trim removes whitespace", () => expectTekst(`tekst_trim("  hej  ")`, "hej"));
    it("tekst_trim leaves clean string alone", () => expectTekst(`tekst_trim("hej")`, "hej"));
    it("tekst_søg true when present", () => expectSandhed(`tekst_søg("hej verden", "verden")`, true));
    it("tekst_søg false when absent", () => expectSandhed(`tekst_søg("hej verden", "xyz")`, false));
    it("tekst_starter_med true", () => expectSandhed(`tekst_starter_med("hej verden", "hej")`, true));
    it("tekst_starter_med false", () => expectSandhed(`tekst_starter_med("hej verden", "verden")`, false));
    it("tekst_ender_med true", () => expectSandhed(`tekst_ender_med("hej verden", "verden")`, true));
    it("tekst_ender_med false", () => expectSandhed(`tekst_ender_med("hej verden", "hej")`, false));
    it("tekst_erstat replaces all occurrences", () => expectTekst(`tekst_erstat("a-b-c", "-", "_")`, "a_b_c"));
    it("tekst_grande uppercases", () => expectTekst(`tekst_grande("hej")`, "HEJ"));
    it("tekst_bitte lowercases", () => expectTekst(`tekst_bitte("HEJ")`, "hej"));
    it("tekst_split requires tekst args", () => expectFejl("tekst_split(42, 1)", "forventer Tekst"));
    it("tekst_trim requires tekst arg", () => expectFejl("tekst_trim(42)", "forventer Tekst"));
});

describe("builtin: path operations", () => {
    it("stig joins segments", () => {
        const result = evalSource(`stig("a", "b", "c")`);
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toBe(nodePath.join("a", "b", "c"));
    });
    it("stig_mappe returns dirname", () => {
        const result = evalSource(`stig_mappe("/some/path/fil.txt")`);
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toBe(nodePath.dirname("/some/path/fil.txt"));
    });
    it("stig_fil returns basename", () => {
        expectTekst(`stig_fil("/some/path/fil.txt")`, "fil.txt");
    });
    it("stig_udvidelse returns extension", () => {
        expectTekst(`stig_udvidelse("/some/path/fil.txt")`, ".txt");
    });
    it("stig_udvidelse empty for no extension", () => {
        expectTekst(`stig_udvidelse("/some/path/fil")`, "");
    });
    it("stig requires tekst args", () => expectFejl("stig(1, 2)", "forventer Tekst"));
});

describe("builtin: json", () => {
    it("json_fra parses object", () => {
        const result = evalSource(`json_fra("{\\"a\\":1}")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(true);
        expect((result as Resultat).value).toBeInstanceOf(Ordbog);
    });
    it("json_fra parses array", () => {
        const result = evalSource(`json_fra("[1,2,3]")`);
        expect(result).toBeInstanceOf(Resultat);
        const inner = (result as Resultat).value;
        expect(inner).toBeInstanceOf(Liste);
        expect((inner as Liste).elements).toHaveLength(3);
    });
    it("json_fra parses number", () => {
        const result = evalSource(`json_fra("42")`);
        expect(result).toBeInstanceOf(Resultat);
        expect(((result as Resultat).value as Tal).value).toBe(42);
    });
    it("json_fra returns øv on invalid JSON", () => {
        const result = evalSource(`json_fra("ikke json")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(false);
    });
    it("json_til serializes a Tal", () => expectTekst("json_til(42)", "42"));
    it("json_til serializes a Tekst", () => expectTekst(`json_til("hej")`, `"hej"`));
    it("json_til serializes a Liste", () => expectTekst("json_til([1, 2, 3])", "[1,2,3]"));
    it("json_til serializes niks as null", () => expectTekst("json_til(niks)", "null"));
    it("json_til no arg gives null", () => expectTekst("json_til()", "null"));
    it("json_flot produces indented output", () => {
        const result = evalSource("json_flot([1])");
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toContain("\n");
    });
});

describe("builtin: filesystem", () => {
    let tmpDir: string;

    afterEach(() => {
        if (tmpDir) fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    function withTmpDir(fn: (dir: string) => void) {
        tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "gemyt-test-"));
        fn(tmpDir);
    }

    it("skriv_fil and læs_fil round-trip", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "test.txt").replace(/\\/g, "/");
            const result = evalSource(`skriv_fil("${fil}", "hej verden")`);
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFint).toBe(true);

            const read = evalSource(`læs_fil("${fil}")`);
            expect(read).toBeInstanceOf(Resultat);
            expect(((read as Resultat).value as Tekst).value).toBe("hej verden");
        });
    });

    it("tilføj_fil appends content", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "append.txt").replace(/\\/g, "/");
            evalSource(`skriv_fil("${fil}", "linje1")`);
            evalSource(`tilføj_fil("${fil}", "linje2")`);
            const read = evalSource(`læs_fil("${fil}")`);
            expect(((read as Resultat).value as Tekst).value).toBe("linje1linje2");
        });
    });

    it("læs_fil on missing file returns øv", () => {
        const result = evalSource(`læs_fil("/findes/ikke/overhovedet.txt")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(false);
    });

    it("findes returns ja for existing file", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "x.txt").replace(/\\/g, "/");
            fs.writeFileSync(fil, "x");
            expectSandhed(`findes("${fil}")`, true);
        });
    });

    it("findes returns nej for missing path", () => {
        expectSandhed(`findes("/dette/findes/ikke")`, false);
    });

    it("er_fil true for a file", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "x.txt").replace(/\\/g, "/");
            fs.writeFileSync(fil, "x");
            expectSandhed(`er_fil("${fil}")`, true);
        });
    });

    it("er_mappe true for a directory", () => {
        withTmpDir((dir) => {
            const d = dir.replace(/\\/g, "/");
            expectSandhed(`er_mappe("${d}")`, true);
        });
    });

    it("er_mappe false for a file", () => {
        withTmpDir((dir) => {
            const fil = nodePath.join(dir, "x.txt").replace(/\\/g, "/");
            fs.writeFileSync(fil, "x");
            expectSandhed(`er_mappe("${fil}")`, false);
        });
    });

    it("opret_mappe creates directory", () => {
        withTmpDir((dir) => {
            const sub = nodePath.join(dir, "sub", "deep").replace(/\\/g, "/");
            const result = evalSource(`opret_mappe("${sub}")`);
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFint).toBe(true);
            expect(fs.existsSync(sub)).toBe(true);
        });
    });

    it("læs_mappe lists entries", () => {
        withTmpDir((dir) => {
            fs.writeFileSync(nodePath.join(dir, "a.txt"), "");
            fs.writeFileSync(nodePath.join(dir, "b.txt"), "");
            const d = dir.replace(/\\/g, "/");
            const result = evalSource(`læs_mappe("${d}")`);
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
            const result = evalSource(`udryd("${fil}")`);
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFint).toBe(true);
            expect(fs.existsSync(fil)).toBe(false);
        });
    });

    it("omdøb renames a file", () => {
        withTmpDir((dir) => {
            const fra = nodePath.join(dir, "fra.txt").replace(/\\/g, "/");
            const til = nodePath.join(dir, "til.txt").replace(/\\/g, "/");
            fs.writeFileSync(fra, "x");
            const result = evalSource(`omdøb("${fra}", "${til}")`);
            expect(result).toBeInstanceOf(Resultat);
            expect((result as Resultat).erFint).toBe(true);
            expect(fs.existsSync(til)).toBe(true);
            expect(fs.existsSync(fra)).toBe(false);
        });
    });

    it("skriv_fil wrong arg type is fejl", () => {
        expectFejl("skriv_fil(42, 42)", "forventer Tekst");
    });
});

describe("builtin: process", () => {
    it("gemyt_cwd returns a string", () => {
        const result = evalSource("gemyt_cwd()");
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value.length).toBeGreaterThan(0);
    });
    it("gemyt_args returns a liste", () => {
        const result = evalSource("gemyt_args()");
        expect(result).toBeInstanceOf(Liste);
    });
    it("gemyt_env returns tekst for set variable", () => {
        process.env["GEMYT_TEST_VAR"] = "hejsa";
        const result = evalSource(`gemyt_env("GEMYT_TEST_VAR")`);
        expect(result).toBeInstanceOf(Tekst);
        expect((result as Tekst).value).toBe("hejsa");
        delete process.env["GEMYT_TEST_VAR"];
    });
    it("gemyt_env returns niks for unset variable", () => {
        expectNiks(`gemyt_env("GEMYT_FINDES_IKKE_XYZ")`);
    });
    it("gemyt_env requires tekst arg", () => expectFejl("gemyt_env(42)", "forventer Tekst"));
});

describe("builtin: kommando", () => {
    it("runs a successful command and returns flot(output)", () => {
        const result = evalSource(`kommando("node --version")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(true);
        expect(((result as Resultat).value as Tekst).value).toMatch(/^v\d+/);
    });
    it("failed command returns øv with stderr", () => {
        const result = evalSource(`kommando("node -e \\"process.exit(1)\\"")`);
        expect(result).toBeInstanceOf(Resultat);
        expect((result as Resultat).erFint).toBe(false);
    });
    it("requires a tekst arg", () => expectFejl("kommando(42)", "forventer Tekst"));
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
