import fs from "node:fs";
import path from "node:path";
import {execSync} from "node:child_process";
import {Lexer} from "./lexer.js";
import {Parser} from "./parser.js";
import {
    type Program,
    type Statement,
    type Expression,
    type ImportStatement,
    type ExportStatement,
} from "./ast.js";
import {
    type Obj,
    type Environment,
    type OrdbogPair,
    OBJ,
    NIKS,
    Sandhed,
    Tal,
    Tekst,
    Liste,
    Ordbog,
    Funktion,
    Resultat,
    Indbygget,
    ReturVærdi,
    BrydSignal,
    Fejl,
    nativeBoolTilObj,
    erFejl,
    erSignal,
    getHashKey,
    createEnclosedEnvironment,
    createEnvironment,
    Niks,
} from "./object.js";

type BuiltinEntry = readonly [string, Obj];

function b(name: string, fn: (...args: Obj[]) => Obj): BuiltinEntry {
    return [name, new Indbygget(fn, name)] as const;
}

function fint(value: Obj): Resultat {
    return new Resultat(value, true);
}

function øv(msg: string): Resultat {
    return new Resultat(new Tekst(msg), false);
}

export interface ModuleContext {
    dir: string;
    exports: Map<string, Obj>;
    cache: Map<string, Ordbog>;
    loading: Set<string>;
}

export function createModuleContext(dir: string): ModuleContext {
    return {dir, exports: new Map(), cache: new Map(), loading: new Set()};
}

function makeModuleOrdbog(entries: BuiltinEntry[]): Ordbog {
    const pairs = new Map<string, OrdbogPair>();
    for (const [name, val] of entries) {
        const key = new Tekst(name);
        pairs.set(key.hashKey(), {key, value: val});
    }
    return new Ordbog(pairs);
}

function expectTekst(arg: Obj | undefined, name: string, pos: number): Tekst | Fejl {
    if (!(arg instanceof Tekst)) {
        return new Fejl(
            `${name} forventer Tekst som argument ${pos + 1}, fik ${arg?.kind ?? "niks"}`
        );
    }
    return arg;
}

const commonBuiltins: BuiltinEntry[] = [
    b("råb", (...args) => {
        console.log(args.map((a) => a.tekst()).join(" "));
        return NIKS;
    }),

    b("tekst", (obj) => {
        if (obj === undefined) return new Tekst("niks");
        return new Tekst(obj.tekst());
    }),

    b("tal", (obj) => {
        if (obj instanceof Tal) return obj;
        if (obj instanceof Tekst) {
            const n = Number(obj.value);
            if (isNaN(n)) return øv(`kan ikke konvertere "${obj.value}" til tal`);
            return fint(new Tal(n));
        }
        if (obj instanceof Sandhed) return new Tal(obj.value ? 1 : 0);
        return øv(`kan ikke konvertere ${obj.kind} til tal`);
    }),
    b("række", (fra, til) => {
        if (fra === undefined) fra = new Tal(0);
        if (!(fra instanceof Tal)) {
            return new Fejl("fra skal være et Tal men fik " + fra.kind);
        }

        if (til === undefined) {
            til = fra;
            fra = new Tal(0);
        }

        if (!(til instanceof Tal)) {
            return new Fejl("til skal være et Tal men fik " + til.kind);
        }

        if ((fra as Tal).value < 0) {
            return new Fejl("fra kan ikke være negativ");
        }

        if ((til as Tal).value < 0) {
            return new Fejl("til kan ikke være negativ");
        }

        const tal: Tal[] = [];
        for (let i = (fra as Tal).value; i < (til as Tal).value; i++) {
            tal.push(new Tal(i));
        }

        return new Liste(tal);
    }),
    b("afslut", (kode) => {
        if (kode instanceof Tal) process.exit(kode.value);
        process.exit(0);
    }),
];

function readLineSync(prompt: string, chars: number): string {
    process.stdout.write(prompt);
    const buf = Buffer.alloc(chars * 4);
    const n = fs.readSync(0, buf, 0, buf.length, null);
    let end = n;
    while (end > 0 && (buf[end - 1] === 0x0a || buf[end - 1] === 0x0d)) end--;
    return buf.toString("utf8", 0, end);
}

const STDLIB: ReadonlyMap<string, Ordbog> = new Map([
    [
        "linjer",
        makeModuleOrdbog([
            b("spørgsmål", (promptArg, sizeArg): Obj => {
                const p = promptArg instanceof Tekst ? promptArg.value : "";
                if (
                    !(sizeArg instanceof Tal) ||
                    !Number.isInteger(sizeArg.value) ||
                    sizeArg.value <= 0
                ) {
                    return new Fejl(
                        "spørgsmål: andet argument skal være et positivt heltal (maks tegn)"
                    );
                }
                return new Tekst(readLineSync(p, sizeArg.value));
            }),
            b("tal", (promptArg): Obj => {
                const p = promptArg instanceof Tekst ? promptArg.value : "";
                while (true) {
                    const raw = readLineSync(p, 32);
                    const n = Number(raw.trim());
                    if (!isNaN(n)) return new Tal(n);
                    process.stdout.write(`'${raw}' er ikke et tal, prøv igen\n`);
                }
            }),
            b("bekræft", (promptArg): Obj => {
                const base = promptArg instanceof Tekst ? promptArg.value : "";
                const p = base.endsWith(" ") ? base + "(j/n) " : base + " (j/n) ";
                while (true) {
                    const raw = readLineSync(p, 4).trim().toLowerCase();
                    if (raw === "j" || raw === "ja") return new Sandhed(true);
                    if (raw === "n" || raw === "nej") return new Sandhed(false);
                    process.stdout.write(`svar med j/ja eller n/nej\n`);
                }
            }),
            b("vælg", (promptArg, mulighederArg): Obj => {
                const p = promptArg instanceof Tekst ? promptArg.value : "";
                if (!(mulighederArg instanceof Liste) || mulighederArg.elements.length === 0) {
                    return new Fejl("vælg: andet argument skal være en ikke-tom Liste");
                }
                const items = mulighederArg.elements;
                const menu = items.map((el, i) => `  ${i + 1}) ${el.tekst()}`).join("\n");
                while (true) {
                    process.stdout.write(`${p}\n${menu}\n> `);
                    const raw = readLineSync("", 8).trim();
                    const n = parseInt(raw, 10);
                    if (!isNaN(n) && n >= 1 && n <= items.length) return items[n - 1]!;
                    process.stdout.write(`vælg et tal mellem 1 og ${items.length}\n`);
                }
            }),
        ]),
    ],

    [
        "fil",
        makeModuleOrdbog([
            b("læs", (sti) => {
                const s = expectTekst(sti, "læs", 0);
                if (s instanceof Fejl) return s;
                try {
                    return fint(new Tekst(fs.readFileSync(s.value, "utf8")));
                } catch (e) {
                    return øv(`kunne ikke læse '${s.value}': ${(e as Error).message}`);
                }
            }),
            b("skriv", (sti, indhold) => {
                const s = expectTekst(sti, "skriv", 0);
                if (s instanceof Fejl) return s;
                const i = expectTekst(indhold, "skriv", 1);
                if (i instanceof Fejl) return i;
                try {
                    fs.writeFileSync(s.value, i.value, "utf8");
                    return fint(NIKS);
                } catch (e) {
                    return øv(`kunne ikke skrive '${s.value}': ${(e as Error).message}`);
                }
            }),
            b("tilføj", (sti, indhold) => {
                const s = expectTekst(sti, "tilføj", 0);
                if (s instanceof Fejl) return s;
                const i = expectTekst(indhold, "tilføj", 1);
                if (i instanceof Fejl) return i;
                try {
                    fs.appendFileSync(s.value, i.value, "utf8");
                    return fint(NIKS);
                } catch (e) {
                    return øv(`kunne ikke tilføje til '${s.value}': ${(e as Error).message}`);
                }
            }),
            b("udryd", (sti) => {
                const s = expectTekst(sti, "udryd", 0);
                if (s instanceof Fejl) return s;
                try {
                    fs.rmSync(s.value, {recursive: true, force: true});
                    return fint(NIKS);
                } catch (e) {
                    return øv(`kunne ikke slette '${s.value}': ${(e as Error).message}`);
                }
            }),
            b("læs_mappe", (sti) => {
                const s = expectTekst(sti, "læs_mappe", 0);
                if (s instanceof Fejl) return s;
                try {
                    const entries = fs.readdirSync(s.value);
                    return fint(new Liste(entries.map((e) => new Tekst(e))));
                } catch (e) {
                    return øv(`kunne ikke læse mappe '${s.value}': ${(e as Error).message}`);
                }
            }),
            b("opret_mappe", (sti) => {
                const s = expectTekst(sti, "opret_mappe", 0);
                if (s instanceof Fejl) return s;
                try {
                    fs.mkdirSync(s.value, {recursive: true});
                    return fint(NIKS);
                } catch (e) {
                    return øv(`kunne ikke oprette mappe '${s.value}': ${(e as Error).message}`);
                }
            }),
            b("omdøb", (fra, til) => {
                const f = expectTekst(fra, "omdøb", 0);
                if (f instanceof Fejl) return f;
                const t = expectTekst(til, "omdøb", 1);
                if (t instanceof Fejl) return t;
                try {
                    fs.renameSync(f.value, t.value);
                    return fint(NIKS);
                } catch (e) {
                    return øv(`kunne ikke omdøbe '${f.value}': ${(e as Error).message}`);
                }
            }),
            b("findes", (sti) => {
                const s = expectTekst(sti, "findes", 0);
                if (s instanceof Fejl) return s;
                return nativeBoolTilObj(fs.existsSync(s.value));
            }),
            b("er_mappe", (sti) => {
                const s = expectTekst(sti, "er_mappe", 0);
                if (s instanceof Fejl) return s;
                try {
                    return nativeBoolTilObj(fs.statSync(s.value).isDirectory());
                } catch {
                    return nativeBoolTilObj(false);
                }
            }),
            b("er_fil", (sti) => {
                const s = expectTekst(sti, "er_fil", 0);
                if (s instanceof Fejl) return s;
                try {
                    return nativeBoolTilObj(fs.statSync(s.value).isFile());
                } catch {
                    return nativeBoolTilObj(false);
                }
            }),
        ]),
    ],

    [
        "stig",
        makeModuleOrdbog([
            b("vej", (...args) => {
                const parts: string[] = [];
                for (const arg of args) {
                    if (!(arg instanceof Tekst))
                        return new Fejl(`sti.join forventer Tekst argumenter`);
                    parts.push(arg.value);
                }
                return new Tekst(path.join(...parts));
            }),
            b("mappe", (sti) => {
                const s = expectTekst(sti, "sti.mappe", 0);
                if (s instanceof Fejl) return s;
                return new Tekst(path.dirname(s.value));
            }),
            b("fil", (sti) => {
                const s = expectTekst(sti, "sti.fil", 0);
                if (s instanceof Fejl) return s;
                return new Tekst(path.basename(s.value));
            }),
            b("udvidelse", (sti) => {
                const s = expectTekst(sti, "sti.udvidelse", 0);
                if (s instanceof Fejl) return s;
                return new Tekst(path.extname(s.value));
            }),
        ]),
    ],

    [
        "kommando",
        makeModuleOrdbog([
            b("kør", (cmd) => {
                const c = expectTekst(cmd, "kommando.kør", 0);
                if (c instanceof Fejl) return c;
                try {
                    const stdout = execSync(c.value, {
                        encoding: "utf8",
                        stdio: ["pipe", "pipe", "pipe"],
                    });
                    return fint(new Tekst(stdout.trimEnd()));
                } catch (e: any) {
                    const stderr = e.stderr?.toString().trimEnd() ?? e.message;
                    return øv(stderr);
                }
            }),
        ]),
    ],

    [
        "json",
        makeModuleOrdbog(
            (() => {
                function jsToGemyt(val: unknown): Obj {
                    if (val === null || val === undefined) return NIKS;
                    if (typeof val === "number") return new Tal(val);
                    if (typeof val === "string") return new Tekst(val);
                    if (typeof val === "boolean") return nativeBoolTilObj(val);
                    if (Array.isArray(val)) return new Liste(val.map(jsToGemyt));
                    if (typeof val === "object") {
                        const pairs = new Map<string, OrdbogPair>();
                        for (const [k, v] of Object.entries(val)) {
                            const key = new Tekst(k);
                            pairs.set(key.hashKey(), {key, value: jsToGemyt(v)});
                        }
                        return new Ordbog(pairs);
                    }
                    return NIKS;
                }
                function gemytToJs(obj: Obj): unknown {
                    if (obj instanceof Tal) return obj.value;
                    if (obj instanceof Tekst) return obj.value;
                    if (obj instanceof Sandhed) return obj.value;
                    if (obj instanceof Niks) return null;
                    if (obj instanceof Liste) return obj.elements.map(gemytToJs);
                    if (obj instanceof Ordbog) {
                        const result: Record<string, unknown> = {};
                        for (const [, pair] of obj.pairs)
                            result[pair.key.tekst()] = gemytToJs(pair.value);
                        return result;
                    }
                    return null;
                }
                return [
                    b("fra", (tekst) => {
                        const s = expectTekst(tekst, "json.fra", 0);
                        if (s instanceof Fejl) return s;
                        try {
                            return fint(jsToGemyt(JSON.parse(s.value)));
                        } catch (e) {
                            return øv(`ugyldig JSON: ${(e as Error).message}`);
                        }
                    }),
                    b("til", (obj) => {
                        if (obj === undefined) return new Tekst("null");
                        return new Tekst(JSON.stringify(gemytToJs(obj)));
                    }),
                    b("flot", (obj) => {
                        if (obj === undefined) return new Tekst("null");
                        let val: unknown;
                        if (obj instanceof Tekst) {
                            try {
                                val = JSON.parse(obj.value);
                            } catch {
                                val = obj.value;
                            }
                        } else {
                            val = gemytToJs(obj);
                        }
                        return new Tekst(JSON.stringify(val, null, 2));
                    }),
                ];
            })()
        ),
    ],

    [
        "gemyt",
        makeModuleOrdbog([
            b("env", (name) => {
                const n = expectTekst(name, "gemyt.env", 0);
                if (n instanceof Fejl) return n;
                const val = process.env[n.value];
                if (val === undefined) return NIKS;
                return new Tekst(val);
            }),
            b("args", () => {
                return new Liste(process.argv.slice(2).map((a) => new Tekst(a)));
            }),
            b("cwd", () => new Tekst(process.cwd())),
            b("type", (obj) => new Tekst(obj?.kind ?? "Niks")),
        ]),
    ],

    [
        "tekst",
        makeModuleOrdbog([
            b("split", (tekst, sep) => {
                const t = expectTekst(tekst, "tekst.split", 0);
                if (t instanceof Fejl) return t;
                const s = expectTekst(sep, "tekst.split", 1);
                if (s instanceof Fejl) return s;
                return new Liste(t.value.split(s.value).map((p) => new Tekst(p)));
            }),
            b("trim", (tekst) => {
                const t = expectTekst(tekst, "tekst.trim", 0);
                if (t instanceof Fejl) return t;
                return new Tekst(t.value.trim());
            }),
            b("søg", (tekst, søg) => {
                const t = expectTekst(tekst, "tekst.søg", 0);
                if (t instanceof Fejl) return t;
                const s = expectTekst(søg, "tekst.søg", 1);
                if (s instanceof Fejl) return s;
                return nativeBoolTilObj(t.value.includes(s.value));
            }),
            b("starter_med", (tekst, præfiks) => {
                const t = expectTekst(tekst, "tekst.starter_med", 0);
                if (t instanceof Fejl) return t;
                const p = expectTekst(præfiks, "tekst.starter_med", 1);
                if (p instanceof Fejl) return p;
                return nativeBoolTilObj(t.value.startsWith(p.value));
            }),
            b("ender_med", (tekst, suffiks) => {
                const t = expectTekst(tekst, "tekst.ender_med", 0);
                if (t instanceof Fejl) return t;
                const s = expectTekst(suffiks, "tekst.ender_med", 1);
                if (s instanceof Fejl) return s;
                return nativeBoolTilObj(t.value.endsWith(s.value));
            }),
            b("erstat", (tekst, søg, erstatning) => {
                const t = expectTekst(tekst, "tekst.erstat", 0);
                if (t instanceof Fejl) return t;
                const s = expectTekst(søg, "tekst.erstat", 1);
                if (s instanceof Fejl) return s;
                const e = expectTekst(erstatning, "tekst.erstat", 2);
                if (e instanceof Fejl) return e;
                return new Tekst(t.value.replaceAll(s.value, e.value));
            }),
            b("grande", (tekst) => {
                const t = expectTekst(tekst, "tekst.grande", 0);
                if (t instanceof Fejl) return t;
                return new Tekst(t.value.toUpperCase());
            }),
            b("bitte", (tekst) => {
                const t = expectTekst(tekst, "tekst.bitte", 0);
                if (t instanceof Fejl) return t;
                return new Tekst(t.value.toLowerCase());
            }),
        ]),
    ],

    [
        "liste",
        makeModuleOrdbog([
            b("slankekur", (list, fn) => {
                if (!(list instanceof Liste)) {
                    return new Fejl(`liste.slankekur kræver en Liste, fik ${list.kind}`);
                }
                const result: Obj[] = [];
                for (const el of list.elements) {
                    const val = applyFunction(fn, [el]);
                    if (erSignal(val)) return val;
                    if (isTruthy(val)) result.push(el);
                }
                return new Liste(result);
            }),
        ]),
    ],
]);

const BUILTINS: ReadonlyMap<string, Obj> = new Map(commonBuiltins);

function handleImport(stmt: ImportStatement, env: Environment, ctx: ModuleContext): Obj {
    if (stmt.source === "gemyt") {
        for (const name of stmt.names) {
            const mod = STDLIB.get(name);
            if (!mod) return new Fejl(`ukendt standardbibliotekets modul: '${name}'`);
            env.define(name, mod, false);
        }
        return NIKS;
    }

    if (stmt.source.startsWith("./") || stmt.source.startsWith("../")) {
        const rawPath = stmt.source.endsWith(".gemyt") ? stmt.source : stmt.source + ".gemyt";
        const resolved = path.resolve(ctx.dir, rawPath);

        if (ctx.loading.has(resolved)) {
            return new Fejl(`cirkulær import opdaget: '${resolved}'`);
        }

        let moduleOrdbog = ctx.cache.get(resolved);
        if (!moduleOrdbog) {
            if (!fs.existsSync(resolved)) {
                return new Fejl(`filen '${resolved}' findes ikke`);
            }

            ctx.loading.add(resolved);

            const source = fs.readFileSync(resolved, "utf8");
            const parser = new Parser(new Lexer(source));
            const prog = parser.parse();

            if (parser.errors.length > 0) {
                ctx.loading.delete(resolved);
                return new Fejl(`parserfejl i '${resolved}': ${parser.errors[0]}`);
            }

            const fileEnv = createEnvironment();
            const fileCtx: ModuleContext = {
                dir: path.dirname(resolved),
                exports: new Map(),
                cache: ctx.cache,
                loading: ctx.loading,
            };

            const result = evaluateProgram(prog, fileEnv, fileCtx);
            ctx.loading.delete(resolved);
            if (erFejl(result)) return result;

            const pairs = new Map<string, OrdbogPair>();
            for (const [k, v] of fileCtx.exports) {
                const key = new Tekst(k);
                pairs.set(key.hashKey(), {key, value: v});
            }
            moduleOrdbog = new Ordbog(pairs);
            ctx.cache.set(resolved, moduleOrdbog);
        }

        for (const name of stmt.names) {
            const pair = moduleOrdbog.pairs.get(`tekst:${name}`);
            if (!pair) return new Fejl(`'${name}' er ikke eksporteret fra '${stmt.source}'`);
            env.define(name, pair.value, false);
        }
        return NIKS;
    }

    return new Fejl(`ukendt importkilde: '${stmt.source}' — brug "gemyt" eller en relativ sti`);
}

function handleExport(stmt: ExportStatement, env: Environment, ctx: ModuleContext): Obj {
    const val = evaluate(stmt.value, env);
    if (erSignal(val)) return val;
    env.define(stmt.name.value, val, false);
    ctx.exports.set(stmt.name.value, val);
    return NIKS;
}

export function evaluateProgram(program: Program, env: Environment, ctx: ModuleContext): Obj {
    let result: Obj = NIKS;
    for (const stmt of program.statements) {
        if (stmt.kind === "ImportStatement") {
            result = handleImport(stmt, env, ctx);
        } else if (stmt.kind === "ExportStatement") {
            result = handleExport(stmt, env, ctx);
        } else {
            result = evaluate(stmt, env);
        }
        if (result.kind === OBJ.RETURVÆRDI) return (result as ReturVærdi).value;
        if (erFejl(result)) return result;
    }
    return result;
}

export function evaluate(node: Statement | Expression, env: Environment): Obj {
    switch (node.kind) {
        case "ExpressionStatement":
            return evaluate(node.expression, env);

        case "BlockStatement": {
            let result: Obj = NIKS;
            for (const stmt of node.statements) {
                result = evaluate(stmt, env);
                if (erSignal(result)) return result;
            }
            return result;
        }

        case "LetStatement": {
            const val = evaluate(node.value, env);
            if (erSignal(val)) return val;
            return env.define(node.name.value, val, true);
        }

        case "ConstStatement": {
            const val = evaluate(node.value, env);
            if (erSignal(val)) return val;
            return env.define(node.name.value, val, false);
        }

        case "ReturnStatement": {
            const val = evaluate(node.value, env);
            if (erSignal(val)) return val;
            return new ReturVærdi(val);
        }

        case "BreakStatement":
            return new BrydSignal();

        case "IntegerLiteral":
        case "FloatLiteral":
            return new Tal(node.value);

        case "StringLiteral":
            return new Tekst(node.value);

        case "BooleanLiteral":
            return nativeBoolTilObj(node.value);

        case "NullLiteral":
            return NIKS;

        case "Identifier": {
            const val = env.get(node.value);
            if (val !== undefined) return val;
            const builtin = BUILTINS.get(node.value);
            if (builtin !== undefined) return builtin;
            return new Fejl(`'${node.value}' er ikke defineret`);
        }

        case "PrefixExpression": {
            const right = evaluate(node.right, env);
            if (erSignal(right)) return right;
            return evalPrefixExpression(node.operator, right);
        }

        case "InfixExpression": {
            const left = evaluate(node.left, env);
            if (erSignal(left)) return left;
            const right = evaluate(node.right, env);
            if (erSignal(right)) return right;
            return evalInfixExpression(node.operator, left, right);
        }

        case "AssignExpression": {
            const val = evaluate(node.value, env);
            if (erSignal(val)) return val;
            return evalAssign(node.target, val, env);
        }

        case "ArrayLiteral": {
            const elements = evalExpressions(node.elements, env);
            if (elements.length === 1 && erSignal(elements[0]!)) return elements[0]!;
            return new Liste(elements);
        }

        case "DictLiteral": {
            const pairs: Map<string, OrdbogPair> = new Map();
            for (const [keyExpr, valueExpr] of node.pairs) {
                const key = evaluate(keyExpr, env);
                if (erSignal(key)) return key;
                const hashKey = getHashKey(key);
                if (hashKey === null)
                    return new Fejl(`kan ikke bruge ${key.kind} som ordbog-nøgle`);
                const value = evaluate(valueExpr, env);
                if (erSignal(value)) return value;
                pairs.set(hashKey, {key, value});
            }
            return new Ordbog(pairs);
        }

        case "IndexExpression": {
            const left = evaluate(node.left, env);
            if (erSignal(left)) return left;
            const index = evaluate(node.index, env);
            if (erSignal(index)) return index;
            return evalIndexExpression(left, index);
        }

        case "DotExpression": {
            const left = evaluate(node.left, env);
            if (erSignal(left)) return left;
            return evalDotExpression(left, node.field.value);
        }

        case "PipeExpression": {
            const left = evaluate(node.left, env);
            if (erSignal(left)) return left;

            if (node.right.kind === "CallExpression") {
                const fn = evaluate(node.right.function, env);
                if (erSignal(fn)) return fn;
                const args = evalExpressions(node.right.args, env);
                if (args.length === 1 && erSignal(args[0]!)) return args[0]!;
                return applyFunction(fn, [left, ...args]);
            }

            const fn = evaluate(node.right, env);
            if (erSignal(fn)) return fn;
            return applyFunction(fn, [left]);
        }

        case "IfExpression": {
            const condition = evaluate(node.condition, env);
            if (erSignal(condition)) return condition;
            if (isTruthy(condition)) {
                return evaluate(node.consequence, env);
            } else if (node.alternative) {
                return evaluate(node.alternative, env);
            }
            return NIKS;
        }

        case "WhileExpression": {
            let result: Obj = NIKS;
            while (true) {
                const condition = evaluate(node.condition, env);
                if (erFejl(condition)) return condition;
                if (!isTruthy(condition)) break;
                result = evaluate(node.body, env);
                if (result.kind === OBJ.BRYDSIGNAL) return NIKS;
                if (result.kind === OBJ.RETURVÆRDI || erFejl(result)) return result;
            }
            return result;
        }

        case "ForEachExpression": {
            const iterable = evaluate(node.iterable, env);
            if (erSignal(iterable)) return iterable;
            let result: Obj = NIKS;

            if (iterable instanceof Liste) {
                for (let i = 0; i < iterable.elements.length; i++) {
                    const innerEnv = createEnclosedEnvironment(env);
                    innerEnv.define(node.value.value, iterable.elements[i]!, true);
                    if (node.index) innerEnv.define(node.index.value, new Tal(i), true);
                    result = evaluate(node.body, innerEnv);
                    if (result.kind === OBJ.BRYDSIGNAL) return NIKS;
                    if (result.kind === OBJ.RETURVÆRDI || erFejl(result)) return result;
                }
            } else if (iterable instanceof Tekst) {
                for (let i = 0; i < iterable.value.length; i++) {
                    const innerEnv = createEnclosedEnvironment(env);
                    innerEnv.define(node.value.value, new Tekst(iterable.value[i]!), true);
                    if (node.index) innerEnv.define(node.index.value, new Tal(i), true);
                    result = evaluate(node.body, innerEnv);
                    if (result.kind === OBJ.BRYDSIGNAL) return NIKS;
                    if (result.kind === OBJ.RETURVÆRDI || erFejl(result)) return result;
                }
            } else {
                return new Fejl(`${iterable.kind} er ikke itererbar`);
            }

            return result;
        }

        case "MatchExpression": {
            const subject = evaluate(node.subject, env);
            if (erSignal(subject)) return subject;

            for (const arm of node.arms) {
                const matchEnv = createEnclosedEnvironment(env);
                if (matchesPattern(subject, arm.pattern, matchEnv)) {
                    return evaluate(arm.body, matchEnv);
                }
            }
            return NIKS;
        }

        case "FunctionLiteral":
            return new Funktion(node.params, node.body, env);

        case "CallExpression": {
            const fn = evaluate(node.function, env);
            if (erSignal(fn)) return fn;
            const args = evalExpressions(node.args, env);
            if (args.length === 1 && erSignal(args[0]!)) return args[0]!;
            return applyFunction(fn, args);
        }

        case "OkExpression": {
            const val = evaluate(node.value, env);
            if (erSignal(val)) return val;
            return new Resultat(val, true);
        }

        case "ErrExpression": {
            const val = evaluate(node.value, env);
            if (erSignal(val)) return val;
            return new Resultat(val, false);
        }

        case "ImportStatement":
        case "ExportStatement":
            return new Fejl("hent/eksporter kan kun bruges på øverste niveau");
    }
}

function matchesPattern(subject: Obj, pattern: Expression, env: Environment): boolean {
    if (pattern.kind === "OkExpression" && pattern.value.kind === "Identifier") {
        if (subject instanceof Resultat && subject.erFint) {
            env.define(pattern.value.value, subject.value, true);
            return true;
        }
        return false;
    }
    if (pattern.kind === "ErrExpression" && pattern.value.kind === "Identifier") {
        if (subject instanceof Resultat && !subject.erFint) {
            env.define(pattern.value.value, subject.value, true);
            return true;
        }
        return false;
    }
    if (pattern.kind === "Identifier" && pattern.value === "_") {
        return true;
    }
    if (pattern.kind === "Identifier") {
        env.define(pattern.value, subject, true);
        return true;
    }
    const patternVal = evaluate(pattern, env);
    if (erSignal(patternVal)) return false;
    return objEqual(subject, patternVal);
}

function isTruthy(obj: Obj): boolean {
    switch (obj.kind) {
        case OBJ.NIKS:
            return false;
        case OBJ.SANDHED:
            return (obj as Sandhed).value;
        case OBJ.TAL:
            return (obj as Tal).value !== 0;
        default:
            return true;
    }
}

function objEqual(a: Obj, b: Obj): boolean {
    if (a.kind !== b.kind) return false;
    switch (a.kind) {
        case OBJ.TAL:
            return (a as Tal).value === (b as Tal).value;
        case OBJ.TEKST:
            return (a as Tekst).value === (b as Tekst).value;
        case OBJ.SANDHED:
            return (a as Sandhed).value === (b as Sandhed).value;
        case OBJ.NIKS:
            return true;
        default:
            return false;
    }
}

function evalPrefixExpression(operator: string, right: Obj): Obj {
    switch (operator) {
        case "ikke":
            return nativeBoolTilObj(!isTruthy(right));
        case "-":
            if (right instanceof Tal) return new Tal(-right.value);
            return new Fejl(`ukendt operator: -${right.kind}`);
        case "stram":
            if (right instanceof Resultat) {
                if (right.erFint) return right.value;
                return new ReturVærdi(right);
            }
            return right;
        default:
            return new Fejl(`ukendt præfiks operator: ${operator}`);
    }
}

function evalInfixExpression(operator: string, left: Obj, right: Obj): Obj {
    if (left instanceof Tal && right instanceof Tal) {
        return evalTalInfixExpression(operator, left, right);
    }
    if (
        operator === "+" &&
        (left instanceof Tal || left instanceof Tekst) &&
        (right instanceof Tal || right instanceof Tekst)
    ) {
        return new Tekst(left.tekst() + right.tekst());
    }
    if (left instanceof Tekst && right instanceof Tekst) {
        switch (operator) {
            case "+":
                return new Tekst(left.value + right.value);
            case "==":
                return nativeBoolTilObj(left.value === right.value);
            case "!=":
                return nativeBoolTilObj(left.value !== right.value);
            default:
                return new Fejl(`ukendt operator: ${left.kind} ${operator} ${right.kind}`);
        }
    }
    switch (operator) {
        case "==":
            return nativeBoolTilObj(objEqual(left, right));
        case "!=":
            return nativeBoolTilObj(!objEqual(left, right));
        case "og":
            return isTruthy(left) ? right : left;
        case "eller":
            return isTruthy(left) ? left : right;
        default:
            if (left.kind !== right.kind) {
                return new Fejl(`type mismatch: ${left.kind} ${operator} ${right.kind}`);
            }
            return new Fejl(`ukendt operator: ${left.kind} ${operator} ${right.kind}`);
    }
}

function evalTalInfixExpression(operator: string, left: Tal, right: Tal): Obj {
    switch (operator) {
        case "+":
            return new Tal(left.value + right.value);
        case "-":
            return new Tal(left.value - right.value);
        case "*":
            return new Tal(left.value * right.value);
        case "/":
            if (right.value === 0) return new Fejl("det kan man da ikke");
            return new Tal(left.value / right.value);
        case "%":
            if (right.value === 0) return new Fejl("det kan man da ikke");
            return new Tal(left.value % right.value);
        case "<":
            return nativeBoolTilObj(left.value < right.value);
        case ">":
            return nativeBoolTilObj(left.value > right.value);
        case "<=":
            return nativeBoolTilObj(left.value <= right.value);
        case ">=":
            return nativeBoolTilObj(left.value >= right.value);
        case "==":
            return nativeBoolTilObj(left.value === right.value);
        case "!=":
            return nativeBoolTilObj(left.value !== right.value);
        default:
            return new Fejl(`ukendt operator: ${left.kind} ${operator} ${right.kind}`);
    }
}

function evalIndexExpression(left: Obj, index: Obj): Obj {
    if (left instanceof Liste && index instanceof Tal) {
        const i = index.value;
        if (!Number.isInteger(i) || i < 0 || i >= left.elements.length) return NIKS;
        return left.elements[i]!;
    }
    if (left instanceof Ordbog) {
        const hashKey = getHashKey(index);
        if (hashKey === null) return new Fejl(`kan ikke bruge ${index.kind} som ordbog-nøgle`);
        const pair = left.pairs.get(hashKey);
        return pair !== undefined ? pair.value : NIKS;
    }
    if (left instanceof Tekst && index instanceof Tal) {
        const i = index.value;
        if (!Number.isInteger(i) || i < 0 || i >= left.value.length) return NIKS;
        return new Tekst(left.value[i]!);
    }
    return new Fejl(`indeksering ikke understøttet: ${left.kind}[${index.kind}]`);
}

function evalDotExpression(left: Obj, field: string): Obj {
    if (left instanceof Resultat) {
        if (field === "afklæd") {
            const captured = left;
            return new Indbygget((): Obj => {
                if (!captured.erFint)
                    // TODO line/col could be nice here
                    return new Fejl(`afklæd kaldt på øv(${captured.value.tekst()})`);
                return captured.value;
            }, "afklæd");
        }
        if (field === "erFint") return nativeBoolTilObj(left.erFint);
        if (field === "værdi") return left.value;
    }
    if (left instanceof Liste) {
        if (field === "vægt") return new Tal(left.elements.length);
    }
    if (left instanceof Tekst) {
        if (field === "vægt") return new Tal(left.value.length);
    }
    if (left instanceof Ordbog) {
        const hashKey = `tekst:${field}`;
        const pair = left.pairs.get(hashKey);
        if (pair !== undefined) return pair.value;
        return NIKS;
    }
    return new Fejl(`${left.kind} har ikke egenskaben '${field}'`);
}

function evalAssign(target: Expression, value: Obj, env: Environment): Obj {
    if (target.kind === "Identifier") {
        const err = env.update(target.value, value);
        if (err !== null) return new Fejl(err);
        return value;
    }
    if (target.kind === "IndexExpression") {
        const left = evaluate(target.left, env);
        if (erSignal(left)) return left;
        const index = evaluate(target.index, env);
        if (erSignal(index)) return index;
        if (left instanceof Liste && index instanceof Tal) {
            const i = index.value;
            if (!Number.isInteger(i) || i < 0 || i >= left.elements.length) {
                return new Fejl(`indeks ud af grænser: ${i}`);
            }
            left.elements[i] = value;
            return value;
        }
        if (left instanceof Ordbog) {
            const hashKey = getHashKey(index);
            if (hashKey === null) return new Fejl(`kan ikke bruge ${index.kind} som ordbog-nøgle`);
            left.pairs.set(hashKey, {key: index, value});
            return value;
        }
        return new Fejl(`kan ikke indeksere ${left.kind}`);
    }
    if (target.kind === "DotExpression") {
        const left = evaluate(target.left, env);
        if (erSignal(left)) return left;
        if (left instanceof Ordbog) {
            const hashKey = `tekst:${target.field.value}`;
            left.pairs.set(hashKey, {key: new Tekst(target.field.value), value});
            return value;
        }
        return new Fejl(`kan ikke tildele felt på ${left.kind}`);
    }
    return new Fejl(`kan ikke tildele til ${target.kind}`);
}

function evalExpressions(exprs: Expression[], env: Environment): Obj[] {
    const result: Obj[] = [];
    for (const expr of exprs) {
        const val = evaluate(expr, env);
        if (erSignal(val)) return [val];
        result.push(val);
    }
    return result;
}

function applyFunction(fn: Obj, args: Obj[]): Obj {
    if (fn instanceof Funktion) {
        const enclosedEnv = createEnclosedEnvironment(fn.env);
        for (let i = 0; i < fn.params.length; i++) {
            enclosedEnv.define(fn.params[i]!.value, args[i] ?? NIKS, true);
        }
        const result = evaluate(fn.body, enclosedEnv);
        if (result.kind === OBJ.RETURVÆRDI) return (result as ReturVærdi).value;
        return result;
    }
    if (fn instanceof Indbygget) {
        return fn.fn(...args);
    }
    return new Fejl(`${fn.kind} er ikke en funktion`);
}
