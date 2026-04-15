import * as fs from "fs";
import * as path from "path";
import {Lexer} from "./lexer.js";
import {Parser} from "./parser.js";
import {evaluateProgram, createModuleContext} from "./evaluator.js";
import {createEnvironment, Fejl} from "./object.js";

const file = process.argv[2];

if (!file) {
    console.error("Brug: gemyt <fil.gemyt>");
    process.exit(1);
}

const resolved = path.resolve(file);

if (!fs.existsSync(resolved)) {
    console.error(`Filen '${resolved}' findes ikke`);
    process.exit(1);
}

const source = fs.readFileSync(resolved, "utf8");
const lexer = new Lexer(source);
const parser = new Parser(lexer);
const program = parser.parse();

if (parser.errors.length > 0) {
    console.error("Parserfejl:");
    for (const err of parser.errors) {
        console.error(`  ${err}`);
    }
    process.exit(1);
}

const env = createEnvironment();
const ctx = createModuleContext(path.dirname(resolved));
const result = evaluateProgram(program, env, ctx);

if (result instanceof Fejl) {
    console.error(result.tekst());
    process.exit(1);
}
