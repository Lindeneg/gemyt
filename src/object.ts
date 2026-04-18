import type {Identifier, BlockStatement, Node} from "./ast.js";
import type {Token} from "./token.js";

export interface Location {
    line: number;
    col: number;
    offset: number;
    length: number;
}

export function locationFromToken(token: Token): Location {
    return {line: token.line, col: token.col, offset: token.offset, length: token.length};
}

export function locationFromNode(node: Node): Location {
    return locationFromToken(node.token);
}

interface Binding {
    value: Value;
    mutable: boolean;
}

export class Environment {
    #store: Map<string, Binding>;
    #outer: Environment | null;

    constructor(outer: Environment | null = null) {
        this.#store = new Map();
        this.#outer = outer;
    }

    get(name: string): Value | undefined {
        const binding = this.#store.get(name);
        if (binding !== undefined) return binding.value;
        if (this.#outer) return this.#outer.get(name);
        return undefined;
    }

    define(name: string, value: Value, mutable: boolean): Value {
        this.#store.set(name, {value, mutable});
        return value;
    }

    update(name: string, value: Value): string | null {
        const binding = this.#store.get(name);
        if (binding !== undefined) {
            if (!binding.mutable) return `'${name}' er stabil og kan ikke ændres`;
            binding.value = value;
            return null;
        }
        if (this.#outer) return this.#outer.update(name, value);
        return `'${name}' er ikke defineret`;
    }
}

export function createEnvironment(): Environment {
    return new Environment();
}

export function createEnclosedEnvironment(outer: Environment): Environment {
    return new Environment(outer);
}

export const OBJ = {
    TAL: "Tal",
    TEKST: "Tekst",
    SANDHED: "Sandhed",
    NIKS: "Niks",
    LISTE: "Liste",
    ORDBOG: "Ordbog",
    FUNKTION: "Funktion",
    RESULTAT: "Resultat",
    INDBYGGET: "Indbygget",
    // signals
    RETURVÆRDI: "ReturVærdi",
    BRYDSIGNAL: "BrydSignal",
    FEJL: "Fejl",
} as const;

export type ObjectKind = (typeof OBJ)[keyof typeof OBJ];

export interface Obj {
    kind: ObjectKind;
    tekst(): string;
}

// Runtime values that can be stored in environments, returned from expressions,
// passed to functions, and compared. A Value never carries control flow.
export type Value =
    | Tal
    | Tekst
    | Sandhed
    | Niks
    | Liste
    | Ordbog
    | Funktion
    | Indbygget
    | Resultat;

// Control-flow effects that can escape an expression or statement. They flow
// upward through evaluation until a boundary consumes them:
//   - Fejl propagates to the program top-level (terminal)
//   - ReturVærdi is consumed by the nearest enclosing function call
//   - BrydSignal is consumed by the nearest enclosing loop
export type Signal = Fejl | ReturVærdi | BrydSignal;

// Every evaluation step returns an EvalResult: either a Value or a Signal.
// The type forces callers to consider both paths at every call site.
export type EvalResult = Value | Signal;

export type HashKey = string;

export interface Hashable {
    hashKey(): HashKey;
}

function isHashable(obj: Value): obj is Value & Hashable {
    return "hashKey" in obj;
}

export function getHashKey(obj: Value): HashKey | null {
    if (isHashable(obj)) return obj.hashKey();
    return null;
}

export class Tal implements Obj, Hashable {
    readonly kind = OBJ.TAL;
    constructor(public value: number) {}
    tekst(): string {
        return String(this.value);
    }
    hashKey(): HashKey {
        return `tal:${this.value}`;
    }
}

export class Tekst implements Obj, Hashable {
    readonly kind = OBJ.TEKST;
    constructor(public value: string) {}
    tekst(): string {
        return this.value;
    }
    hashKey(): HashKey {
        return `tekst:${this.value}`;
    }
}

export class Sandhed implements Obj, Hashable {
    readonly kind = OBJ.SANDHED;
    constructor(public value: boolean) {}
    tekst(): string {
        return this.value ? "ja" : "nej";
    }
    hashKey(): HashKey {
        return `sandhed:${this.value}`;
    }
}

export class Niks implements Obj {
    readonly kind = OBJ.NIKS;
    tekst(): string {
        return "niks";
    }
}

export const NIKS = new Niks();
export const JA = new Sandhed(true);
export const NEJ = new Sandhed(false);

export class Liste implements Obj {
    readonly kind = OBJ.LISTE;
    constructor(public elements: Value[]) {}
    tekst(): string {
        return `[${this.elements.map((e) => e.tekst()).join(", ")}]`;
    }
}

export interface OrdbogPair {
    key: Value;
    value: Value;
}

export class Ordbog implements Obj {
    readonly kind = OBJ.ORDBOG;
    constructor(public pairs: Map<HashKey, OrdbogPair>) {}
    tekst(): string {
        const entries = [...this.pairs.values()]
            .map((p) => `${p.key.tekst()}: ${p.value.tekst()}`)
            .join(", ");
        return `{${entries}}`;
    }
}

export class Funktion implements Obj {
    readonly kind = OBJ.FUNKTION;
    constructor(
        public params: Identifier[],
        public body: BlockStatement,
        public env: Environment
    ) {}
    tekst(): string {
        const params = this.params.map((p) => p.value).join(", ");
        return `gør(${params}) { ... }`;
    }
}

export class Resultat implements Obj {
    readonly kind = OBJ.RESULTAT;
    constructor(
        public value: Value,
        public erFlot: boolean
    ) {}
    tekst(): string {
        return this.erFlot ? `flot(${this.value.tekst()})` : `øv(${this.value.tekst()})`;
    }
}

// Builtins cannot emit control signals (Return/Brud). They can produce a Value
// or fail with a Fejl — nothing else. The type enforces this at the seam.
export type IndbyggetFn = (...args: Value[]) => Value | Fejl;

export class Indbygget implements Obj {
    readonly kind = OBJ.INDBYGGET;
    constructor(
        public fn: IndbyggetFn,
        public name: string = "<indbygget>"
    ) {}
    tekst(): string {
        return this.name;
    }
}

export class ReturVærdi implements Obj {
    readonly kind = OBJ.RETURVÆRDI;
    constructor(public value: Value) {}
    tekst(): string {
        return this.value.tekst();
    }
}

export class BrydSignal implements Obj {
    readonly kind = OBJ.BRYDSIGNAL;
    tekst(): string {
        return "stop";
    }
}

export class Fejl implements Obj {
    readonly kind = OBJ.FEJL;
    constructor(
        public message: string,
        public location: Location | null = null
    ) {}
    tekst(): string {
        if (this.location) {
            return `Fejl [${this.location.line}:${this.location.col}]: ${this.message}`;
        }
        return `Fejl: ${this.message}`;
    }
}

// Build a Fejl with location from an AST node or token.
export function fejlAt(source: Node | Token, message: string): Fejl {
    const loc = "token" in source ? locationFromNode(source) : locationFromToken(source);
    return new Fejl(message, loc);
}

// Stamp a location on a Fejl that doesn't already carry one. Used at the
// builtin/call-site boundary: the builtin knows *what* went wrong, the caller
// knows *where*.
export function stampLocation(fejl: Fejl, source: Node | Token): Fejl {
    if (fejl.location !== null) return fejl;
    const loc = "token" in source ? locationFromNode(source) : locationFromToken(source);
    fejl.location = loc;
    return fejl;
}

export function nativeBoolTilObj(value: boolean): Sandhed {
    return value ? JA : NEJ;
}

export function erFejl(obj: EvalResult): obj is Fejl {
    return obj.kind === OBJ.FEJL;
}

export function erReturVærdi(obj: EvalResult): obj is ReturVærdi {
    return obj.kind === OBJ.RETURVÆRDI;
}

export function erBrydSignal(obj: EvalResult): obj is BrydSignal {
    return obj.kind === OBJ.BRYDSIGNAL;
}

export function erSignal(obj: EvalResult): obj is Signal {
    return obj.kind === OBJ.RETURVÆRDI || obj.kind === OBJ.BRYDSIGNAL || obj.kind === OBJ.FEJL;
}

// Narrowing negation: asserts obj is a Value (not a Signal).
export function erVærdi(obj: EvalResult): obj is Value {
    return !erSignal(obj);
}
