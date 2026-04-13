import {type Program, type Statement, type Expression} from "./ast.js";
import {BUILTINS} from "./builtins.js";
import {
    type Obj,
    type Environment,
    type OrdbogPair,
    type Sandhed,
    OBJ,
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
    NIKS,
    nativeBoolTilObj,
    erFejl,
    erSignal,
    getHashKey,
    createEnclosedEnvironment,
} from "./object.js";

export function evaluateProgram(program: Program, env: Environment): Obj {
    let result: Obj = NIKS;
    for (const stmt of program.statements) {
        result = evaluate(stmt, env);
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
                    return new Fejl(`afklæd kaldt på øv(${captured.value.tekst()})`);
                return captured.value;
            }, "afklæd");
        }
        if (field === "erFint") return nativeBoolTilObj(left.erFint);
        if (field === "værdi") return left.value;
    }
    if (left instanceof Liste) {
        if (field === "længde") return new Tal(left.elements.length);
    }
    if (left instanceof Tekst) {
        if (field === "længde") return new Tal(left.value.length);
    }
    if (left instanceof Ordbog) {
        const hashKey = `tekst:${field}`;
        const pair = left.pairs.get(hashKey);
        if (pair !== undefined) return pair.value;
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
