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

        this.#advance();
    }

    next(): Token {
        this.#skipWhitespace();

        if (this.#char === "") return this.#token(TOKEN.EOF, "");

        if (this.#char === "/" && this.#peek() === "/") {
            this.#skipComment();
            return this.next();
        }

        let token: Token;

        switch (this.#char) {
            case "=":
                if (this.#peek() === "=") {
                    token = this.#tokenFromRange(TOKEN.EQ, 1);
                } else if (this.#peek() === ">") {
                    token = this.#tokenFromRange(TOKEN.ARROW, 1);
                } else {
                    token = this.#token(TOKEN.ASSIGN, this.#char);
                }
                break;
            case "!":
                if (this.#peek() === "=") {
                    token = this.#tokenFromRange(TOKEN.NOT_EQ, 1);
                } else {
                    token = this.#token(TOKEN.ILLEGAL, this.#char);
                }
                break;
            case "<":
                if (this.#peek() === "=") {
                    token = this.#tokenFromRange(TOKEN.LT_OR_EQ, 1);
                } else {
                    token = this.#token(TOKEN.LT, this.#char);
                }
                break;
            case ">":
                if (this.#peek() === "=") {
                    token = this.#tokenFromRange(TOKEN.GT_OR_EQ, 1);
                } else {
                    token = this.#token(TOKEN.GT, this.#char);
                }
                break;
            case "|":
                if (this.#peek() === ">") {
                    token = this.#tokenFromRange(TOKEN.PIPE, 1);
                } else {
                    token = this.#token(TOKEN.ILLEGAL, this.#char);
                }
                break;
            case "+":
                token = this.#token(TOKEN.PLUS, this.#char);
                break;
            case "-":
                token = this.#token(TOKEN.MINUS, this.#char);
                break;
            case "*":
                token = this.#token(TOKEN.ASTERISK, this.#char);
                break;
            case "/":
                token = this.#token(TOKEN.SLASH, this.#char);
                break;
            case ";":
                token = this.#token(TOKEN.SEMICOLON, this.#char);
                break;
            case "(":
                token = this.#token(TOKEN.LPAREN, this.#char);
                break;
            case ")":
                token = this.#token(TOKEN.RPAREN, this.#char);
                break;
            case "{":
                token = this.#token(TOKEN.LBRACE, this.#char);
                break;
            case "}":
                token = this.#token(TOKEN.RBRACE, this.#char);
                break;
            case "[":
                token = this.#token(TOKEN.LBRACKET, this.#char);
                break;
            case "]":
                token = this.#token(TOKEN.RBRACKET, this.#char);
                break;
            case ",":
                token = this.#token(TOKEN.COMMA, this.#char);
                break;
            case ":":
                token = this.#token(TOKEN.COLON, this.#char);
                break;
            case ".":
                token = this.#token(TOKEN.DOT, this.#char);
                break;
            case '"':
                token = this.#token(TOKEN.STRING, this.#string());
                break;
            default:
                if (this.#isIdentifierStart(this.#char)) {
                    return this.#identifier();
                } else if (this.#isDigit(this.#char)) {
                    return this.#number();
                } else {
                    token = this.#token(TOKEN.ILLEGAL, this.#char);
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
                switch (this.#char) {
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

    #number(): Token {
        const line = this.#line;
        const col = this.#col;
        const integer = this.#readUntil((ch) => this.#isDigit(ch));
        if (this.#char === "." && this.#isDigit(this.#peek())) {
            this.#advance(); // consume "."
            const decimal = this.#readUntil((ch) => this.#isDigit(ch));
            return this.#token(TOKEN.FLOAT, `${integer}.${decimal}`, line, col);
        }
        return this.#token(TOKEN.INT, integer, line, col);
    }

    #identifier(): Token {
        const line = this.#line;
        const col = this.#col;
        const literal = this.#readUntil((ch) => this.#isIdentifierChar(ch));
        return this.#token(lookupIdent(literal), literal, line, col);
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

    #tokenFromRange(kind: TokenKind, r: number): Token {
        let literal = this.#char;
        for (let i = 0; i < r; i++) {
            this.#advance();
            literal += this.#char;
        }
        return this.#token(kind, literal);
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

    #token(kind: TokenKind, literal: string, line = this.#line, col = this.#col): Token {
        return {
            kind,
            literal,
            line,
            col,
        };
    }
}
