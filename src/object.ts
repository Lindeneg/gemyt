import type {Identifier, BlockStatement} from "./ast.js";

interface Binding {
    value: Obj;
    mutable: boolean;
}

export class Environment {
    #store: Map<string, Binding>;
    #outer: Environment | null;

    constructor(outer: Environment | null = null) {
        this.#store = new Map();
        this.#outer = outer;
    }

    get(name: string): Obj | undefined {
        const binding = this.#store.get(name);
        if (binding !== undefined) return binding.value;
        if (this.#outer) return this.#outer.get(name);
        return undefined;
    }

    define(name: string, value: Obj, mutable: boolean): Obj {
        this.#store.set(name, {value, mutable});
        return value;
    }

    update(name: string, value: Obj): string | null {
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

export type HashKey = string;

export interface Hashable {
    hashKey(): HashKey;
}

function isHashable(obj: Obj): obj is Obj & Hashable {
    return "hashKey" in obj;
}

export function getHashKey(obj: Obj): HashKey | null {
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
    constructor(public elements: Obj[]) {}
    tekst(): string {
        return `[${this.elements.map((e) => e.tekst()).join(", ")}]`;
    }
}

export interface OrdbogPair {
    key: Obj;
    value: Obj;
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
        public value: Obj,
        public erFint: boolean
    ) {}
    tekst(): string {
        return this.erFint ? `fint(${this.value.tekst()})` : `øv(${this.value.tekst()})`;
    }
}

export type InbyggetFn = (...args: Obj[]) => Obj;

export class Indbygget implements Obj {
    readonly kind = OBJ.INDBYGGET;
    constructor(
        public fn: InbyggetFn,
        public name: string = "<indbygget>"
    ) {}
    tekst(): string {
        return this.name;
    }
}

export class ReturVærdi implements Obj {
    readonly kind = OBJ.RETURVÆRDI;
    constructor(public value: Obj) {}
    tekst(): string {
        return this.value.tekst();
    }
}

export class BrydSignal implements Obj {
    readonly kind = OBJ.BRYDSIGNAL;
    tekst(): string {
        return "bryd";
    }
}

export class Fejl implements Obj {
    readonly kind = OBJ.FEJL;
    constructor(public message: string) {}
    tekst(): string {
        return `Fejl: ${this.message}`;
    }
}

export function nativeBoolTilObj(value: boolean): Sandhed {
    return value ? JA : NEJ;
}

export function erFejl(obj: Obj): obj is Fejl {
    return obj.kind === OBJ.FEJL;
}

export function erSignal(obj: Obj): boolean {
    return obj.kind === OBJ.RETURVÆRDI || obj.kind === OBJ.BRYDSIGNAL || obj.kind === OBJ.FEJL;
}
