import {TOKEN, lookupIdent, type Token, type TokenKind} from "./token.js";

export class Lexer {
    #input: string;
    #currentIdx: number;
    #nextIdx: number;
    #char: string;
    #line: number;
    #col: number;

    constructor(input: string) {
        this.#input = input;
        this.#currentIdx = 0;
        this.#nextIdx = 0;
        this.#char = "";
        this.#line = 1;
        this.#col = 0;

        // col starts at 0 so the first advance() (below) — which sees the
        // initial empty #char, falls through the non-\n branch, and increments
        // col to 1 — lands on the correct column for input[0].
        this.#advance();
    }

    next(): Token {
        this.#skipWhitespace();

        // Capture the start of the token BEFORE any advance() calls, so
        // line/col/offset point at the first character of the token no matter
        // how many characters the token consumes.
        const sLine = this.#line;
        const sCol = this.#col;
        const sOff = this.#currentIdx;

        if (this.#char === "") return this.#mkToken(TOKEN.EOF, "", sLine, sCol, sOff, 0);

        if (this.#char === "/" && this.#peek() === "/") {
            this.#skipComment();
            return this.next();
        }

        let token: Token;

        switch (this.#char) {
            case "=":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.EQ, 2, sLine, sCol, sOff);
                } else if (this.#peek() === ">") {
                    token = this.#range(TOKEN.ARROW, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.ASSIGN, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "!":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.NOT_EQ, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.ILLEGAL, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "<":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.LT_OR_EQ, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.LT, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case ">":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.GT_OR_EQ, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.GT, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "|":
                if (this.#peek() === ">") {
                    token = this.#range(TOKEN.PIPE, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.ILLEGAL, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "+":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.PLUS_ASSIGN, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.PLUS, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "-":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.MINUS_ASSIGN, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.MINUS, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "*":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.ASTERISK_ASSIGN, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.ASTERISK, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "/":
                if (this.#peek() === "=") {
                    token = this.#range(TOKEN.SLASH_ASSIGN, 2, sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.SLASH, this.#char, sLine, sCol, sOff, 1);
                }
                break;
            case "%":
                token = this.#mkToken(TOKEN.MODULO, this.#char, sLine, sCol, sOff, 1);
                break;
            case ";":
                token = this.#mkToken(TOKEN.SEMICOLON, this.#char, sLine, sCol, sOff, 1);
                break;
            case "(":
                token = this.#mkToken(TOKEN.LPAREN, this.#char, sLine, sCol, sOff, 1);
                break;
            case ")":
                token = this.#mkToken(TOKEN.RPAREN, this.#char, sLine, sCol, sOff, 1);
                break;
            case "{":
                token = this.#mkToken(TOKEN.LBRACE, this.#char, sLine, sCol, sOff, 1);
                break;
            case "}":
                token = this.#mkToken(TOKEN.RBRACE, this.#char, sLine, sCol, sOff, 1);
                break;
            case "[":
                token = this.#mkToken(TOKEN.LBRACKET, this.#char, sLine, sCol, sOff, 1);
                break;
            case "]":
                token = this.#mkToken(TOKEN.RBRACKET, this.#char, sLine, sCol, sOff, 1);
                break;
            case ",":
                token = this.#mkToken(TOKEN.COMMA, this.#char, sLine, sCol, sOff, 1);
                break;
            case ":":
                token = this.#mkToken(TOKEN.COLON, this.#char, sLine, sCol, sOff, 1);
                break;
            case ".":
                token = this.#mkToken(TOKEN.DOT, this.#char, sLine, sCol, sOff, 1);
                break;
            case '"': {
                const literal = this.#string();
                // #currentIdx is on the closing quote; next() advances past it.
                // Span covers opening quote through closing quote inclusive.
                const length = this.#currentIdx - sOff + 1;
                token = this.#mkToken(TOKEN.STRING, literal, sLine, sCol, sOff, length);
                break;
            }
            default:
                if (this.#isIdentifierStart(this.#char)) {
                    return this.#identifier(sLine, sCol, sOff);
                } else if (this.#isDigit(this.#char)) {
                    return this.#number(sLine, sCol, sOff);
                } else {
                    token = this.#mkToken(TOKEN.ILLEGAL, this.#char, sLine, sCol, sOff, 1);
                }
                break;
        }

        this.#advance();
        return token;
    }

    #advance() {
        if (this.#char === "\n") {
            this.#line++;
            this.#col = 1;
        } else {
            this.#col++;
        }
        if (this.#nextIdx >= this.#input.length) {
            this.#char = "";
        } else {
            this.#char = this.#input[this.#nextIdx]!;
        }
        this.#currentIdx = this.#nextIdx;
        this.#nextIdx++;
    }

    #string(): string {
        this.#advance(); // skip opening "
        let result = "";
        while (this.#char !== '"' && this.#char !== "") {
            if (this.#char === "\\") {
                this.#advance(); // consume backslash
                const c = this.#char as string; // stupid ts
                switch (c) {
                    case "n":
                        result += "\n";
                        break;
                    case "t":
                        result += "\t";
                        break;
                    case '"':
                        result += '"';
                        break;
                    case "\\":
                        result += "\\";
                        break;
                    default:
                        result += this.#char;
                        break;
                }
            } else {
                result += this.#char;
            }
            this.#advance();
        }
        // #char is now the closing ", advance() in next() moves past it
        return result;
    }

    #number(sLine: number, sCol: number, sOff: number): Token {
        const integer = this.#readUntil((ch) => this.#isDigit(ch));
        if (this.#char === ".") {
            const next = this.#peek();
            if (this.#isDigit(next)) {
                this.#advance(); // consume "."
                const decimal = this.#readUntil((ch) => this.#isDigit(ch));
                const lit = `${integer}.${decimal}`;
                return this.#mkToken(TOKEN.FLOAT, lit, sLine, sCol, sOff, lit.length);
            }
            if (!this.#isIdentifierStart(next)) {
                // "1." with nothing (or punctuation) after — malformed number,
                // not an int followed by a dot-access. Consume the dot so the
                // error points at the whole offending literal.
                this.#advance();
                const lit = `${integer}.`;
                return this.#mkToken(TOKEN.ILLEGAL, lit, sLine, sCol, sOff, lit.length);
            }
            // fall through: "1.foo" stays INT + DOT + IDENT (int dot-access).
        }
        return this.#mkToken(TOKEN.INT, integer, sLine, sCol, sOff, integer.length);
    }

    #identifier(sLine: number, sCol: number, sOff: number): Token {
        const literal = this.#readUntil((ch) => this.#isIdentifierChar(ch));
        return this.#mkToken(lookupIdent(literal), literal, sLine, sCol, sOff, literal.length);
    }

    #peek(): string {
        if (this.#nextIdx >= this.#input.length) {
            return "";
        }
        return this.#input[this.#nextIdx]!;
    }

    #skipComment() {
        while (this.#char !== "\n" && this.#char !== "") {
            this.#advance();
        }
    }

    #skipWhitespace() {
        while (
            this.#char === " " ||
            this.#char === "\t" ||
            this.#char === "\r" ||
            this.#char === "\n"
        ) {
            this.#advance();
        }
    }

    #range(
        kind: TokenKind,
        length: number,
        sLine: number,
        sCol: number,
        sOff: number
    ): Token {
        let literal = this.#char;
        for (let i = 0; i < length - 1; i++) {
            this.#advance();
            literal += this.#char;
        }
        return this.#mkToken(kind, literal, sLine, sCol, sOff, length);
    }

    #readUntil(pred: (ch: string) => boolean): string {
        let result = "";
        while (pred(this.#char) && this.#char !== "") {
            result += this.#char;
            this.#advance();
        }
        return result;
    }

    #isIdentifierStart(ch: string): boolean {
        return (
            (ch >= "a" && ch <= "z") ||
            (ch >= "A" && ch <= "Z") ||
            ch === "_" ||
            ch === "æ" ||
            ch === "ø" ||
            ch === "å" ||
            ch === "Æ" ||
            ch === "Ø" ||
            ch === "Å"
        );
    }

    #isIdentifierChar(ch: string): boolean {
        return this.#isIdentifierStart(ch) || this.#isDigit(ch);
    }

    #isDigit(ch: string): boolean {
        return ch >= "0" && ch <= "9";
    }

    #mkToken(
        kind: TokenKind,
        literal: string,
        line: number,
        col: number,
        offset: number,
        length: number
    ): Token {
        return {kind, literal, line, col, offset, length};
    }
}
