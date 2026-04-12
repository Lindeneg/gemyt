import {describe, it, expect} from "vitest";
import {TOKEN, type TokenKind} from "../src/token.js";
import {Lexer} from "../src/lexer.js";

type Expected = {kind: TokenKind; literal: string};

function expectTokens(input: string, expected: Expected[]) {
    const lexer = new Lexer(input);
    for (let i = 0; i < expected.length; i++) {
        const tok = lexer.next();
        expect(tok.kind, `tokens[${i}] kind`).toBe(expected[i].kind);
        expect(tok.literal, `tokens[${i}] literal`).toBe(expected[i].literal);
    }
}

describe("Lexer", () => {
    it("should lex a full kartoffel program", () => {
        const input = `lad fem = 5;
lad ti = 10;
lad sum = gør(x, y) {
  x + y;
};
lad resultat = sum(fem, ti);
stabil fætter = 5;
ikke -/*5;
5 < 10 > 5;
hvis (5 < 10) {
  giv ja;
} ellers {
  giv nej;
}
10 == 10;
10 != 9;
10 >= 9;
10 <= 9;
"fansen"
"hej med dig"
"hej 0 dig"
[1, 2];
// dette er en kommentar
{"navn": "kartoffel"}
`;

        expectTokens(input, [
            // lad fem = 5;
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "fem"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.INT, literal: "5"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // lad ti = 10;
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "ti"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // lad sum = gør(x, y) {
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "sum"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.FUNCTION, literal: "gør"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "x"},
            {kind: TOKEN.COMMA, literal: ","},
            {kind: TOKEN.IDENT, literal: "y"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.LBRACE, literal: "{"},
            // x + y;
            {kind: TOKEN.IDENT, literal: "x"},
            {kind: TOKEN.PLUS, literal: "+"},
            {kind: TOKEN.IDENT, literal: "y"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // };
            {kind: TOKEN.RBRACE, literal: "}"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // lad resultat = sum(fem, ti);
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "resultat"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.IDENT, literal: "sum"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "fem"},
            {kind: TOKEN.COMMA, literal: ","},
            {kind: TOKEN.IDENT, literal: "ti"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // stabil fætter = 5;
            {kind: TOKEN.CONST, literal: "stabil"},
            {kind: TOKEN.IDENT, literal: "fætter"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.INT, literal: "5"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // ikke -/*5;
            {kind: TOKEN.NOT, literal: "ikke"},
            {kind: TOKEN.MINUS, literal: "-"},
            {kind: TOKEN.SLASH, literal: "/"},
            {kind: TOKEN.ASTERISK, literal: "*"},
            {kind: TOKEN.INT, literal: "5"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // 5 < 10 > 5;
            {kind: TOKEN.INT, literal: "5"},
            {kind: TOKEN.LT, literal: "<"},
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.GT, literal: ">"},
            {kind: TOKEN.INT, literal: "5"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // hvis (5 < 10) {
            {kind: TOKEN.IF, literal: "hvis"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.INT, literal: "5"},
            {kind: TOKEN.LT, literal: "<"},
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.LBRACE, literal: "{"},
            // giv ja;
            {kind: TOKEN.RETURN, literal: "giv"},
            {kind: TOKEN.TRUE, literal: "ja"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // } ellers {
            {kind: TOKEN.RBRACE, literal: "}"},
            {kind: TOKEN.ELSE, literal: "ellers"},
            {kind: TOKEN.LBRACE, literal: "{"},
            // giv nej;
            {kind: TOKEN.RETURN, literal: "giv"},
            {kind: TOKEN.FALSE, literal: "nej"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // }
            {kind: TOKEN.RBRACE, literal: "}"},
            // 10 == 10;
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.EQ, literal: "=="},
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // 10 != 9;
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.NOT_EQ, literal: "!="},
            {kind: TOKEN.INT, literal: "9"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // 10 >= 9;
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.GT_OR_EQ, literal: ">="},
            {kind: TOKEN.INT, literal: "9"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // 10 <= 9;
            {kind: TOKEN.INT, literal: "10"},
            {kind: TOKEN.LT_OR_EQ, literal: "<="},
            {kind: TOKEN.INT, literal: "9"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // strings
            {kind: TOKEN.STRING, literal: "fansen"},
            {kind: TOKEN.STRING, literal: "hej med dig"},
            {kind: TOKEN.STRING, literal: "hej 0 dig"},
            // [1, 2];
            {kind: TOKEN.LBRACKET, literal: "["},
            {kind: TOKEN.INT, literal: "1"},
            {kind: TOKEN.COMMA, literal: ","},
            {kind: TOKEN.INT, literal: "2"},
            {kind: TOKEN.RBRACKET, literal: "]"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            // comment is skipped
            // {"navn": "kartoffel"}
            {kind: TOKEN.LBRACE, literal: "{"},
            {kind: TOKEN.STRING, literal: "navn"},
            {kind: TOKEN.COLON, literal: ":"},
            {kind: TOKEN.STRING, literal: "kartoffel"},
            {kind: TOKEN.RBRACE, literal: "}"},
            // EOF
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex pipe and arrow operators", () => {
        const input = `[1, 2, 3] |> plastik(x => x * 2);`;

        expectTokens(input, [
            {kind: TOKEN.LBRACKET, literal: "["},
            {kind: TOKEN.INT, literal: "1"},
            {kind: TOKEN.COMMA, literal: ","},
            {kind: TOKEN.INT, literal: "2"},
            {kind: TOKEN.COMMA, literal: ","},
            {kind: TOKEN.INT, literal: "3"},
            {kind: TOKEN.RBRACKET, literal: "]"},
            {kind: TOKEN.PIPE, literal: "|>"},
            {kind: TOKEN.IDENT, literal: "plastik"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "x"},
            {kind: TOKEN.ARROW, literal: "=>"},
            {kind: TOKEN.IDENT, literal: "x"},
            {kind: TOKEN.ASTERISK, literal: "*"},
            {kind: TOKEN.INT, literal: "2"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex result pattern with prøv", () => {
        const input = `prøv r {
  fint(v) => sig(v);
  øv(e) => sig(e);
}`;

        expectTokens(input, [
            {kind: TOKEN.MATCH, literal: "prøv"},
            {kind: TOKEN.IDENT, literal: "r"},
            {kind: TOKEN.LBRACE, literal: "{"},
            {kind: TOKEN.OK, literal: "fint"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "v"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.ARROW, literal: "=>"},
            {kind: TOKEN.PRINT, literal: "sig"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "v"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.ERR, literal: "øv"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "e"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.ARROW, literal: "=>"},
            {kind: TOKEN.PRINT, literal: "sig"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "e"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.RBRACE, literal: "}"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex foreach with kør and af", () => {
        const input = `kør x af tal { sig(x); }`;

        expectTokens(input, [
            {kind: TOKEN.FOREACH, literal: "kør"},
            {kind: TOKEN.IDENT, literal: "x"},
            {kind: TOKEN.OF, literal: "af"},
            {kind: TOKEN.IDENT, literal: "tal"},
            {kind: TOKEN.LBRACE, literal: "{"},
            {kind: TOKEN.PRINT, literal: "sig"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "x"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.RBRACE, literal: "}"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex foreach with value and index", () => {
        const input = `kør v, idx af liste { sig(v); }`;

        expectTokens(input, [
            {kind: TOKEN.FOREACH, literal: "kør"},
            {kind: TOKEN.IDENT, literal: "v"},
            {kind: TOKEN.COMMA, literal: ","},
            {kind: TOKEN.IDENT, literal: "idx"},
            {kind: TOKEN.OF, literal: "af"},
            {kind: TOKEN.IDENT, literal: "liste"},
            {kind: TOKEN.LBRACE, literal: "{"},
            {kind: TOKEN.PRINT, literal: "sig"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.IDENT, literal: "v"},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.RBRACE, literal: "}"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex dot access and bare unwrap", () => {
        const input = `bruger.navn; r.bare();`;

        expectTokens(input, [
            {kind: TOKEN.IDENT, literal: "bruger"},
            {kind: TOKEN.DOT, literal: "."},
            {kind: TOKEN.IDENT, literal: "navn"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.IDENT, literal: "r"},
            {kind: TOKEN.DOT, literal: "."},
            {kind: TOKEN.UNWRAP, literal: "bare"},
            {kind: TOKEN.LPAREN, literal: "("},
            {kind: TOKEN.RPAREN, literal: ")"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex float literals", () => {
        const input = `lad pi = 3.14;`;

        expectTokens(input, [
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "pi"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.FLOAT, literal: "3.14"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex struct definition", () => {
        const input = `gemyt Bruger { navn: tekst; alder: tal; }`;

        expectTokens(input, [
            {kind: TOKEN.STRUCT, literal: "gemyt"},
            {kind: TOKEN.IDENT, literal: "Bruger"},
            {kind: TOKEN.LBRACE, literal: "{"},
            {kind: TOKEN.IDENT, literal: "navn"},
            {kind: TOKEN.COLON, literal: ":"},
            {kind: TOKEN.IDENT, literal: "tekst"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.IDENT, literal: "alder"},
            {kind: TOKEN.COLON, literal: ":"},
            {kind: TOKEN.IDENT, literal: "tal"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.RBRACE, literal: "}"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex danish identifiers with special characters", () => {
        const input = `lad ælansen = "hej"; lad ølansen = "øl"; lad åansen = "å";`;

        expectTokens(input, [
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "ælansen"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.STRING, literal: "hej"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "ølansen"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.STRING, literal: "øl"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.LET, literal: "lad"},
            {kind: TOKEN.IDENT, literal: "åansen"},
            {kind: TOKEN.ASSIGN, literal: "="},
            {kind: TOKEN.STRING, literal: "å"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex logical operators", () => {
        const input = `ja og nej eller ikke ja;`;

        expectTokens(input, [
            {kind: TOKEN.TRUE, literal: "ja"},
            {kind: TOKEN.AND, literal: "og"},
            {kind: TOKEN.FALSE, literal: "nej"},
            {kind: TOKEN.OR, literal: "eller"},
            {kind: TOKEN.NOT, literal: "ikke"},
            {kind: TOKEN.TRUE, literal: "ja"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should lex while loop", () => {
        const input = `mens ja { bryd; }`;

        expectTokens(input, [
            {kind: TOKEN.WHILE, literal: "mens"},
            {kind: TOKEN.TRUE, literal: "ja"},
            {kind: TOKEN.LBRACE, literal: "{"},
            {kind: TOKEN.BREAK, literal: "bryd"},
            {kind: TOKEN.SEMICOLON, literal: ";"},
            {kind: TOKEN.RBRACE, literal: "}"},
            {kind: TOKEN.EOF, literal: ""},
        ]);
    });

    it("should skip comments and return EOF", () => {
        const input = `// bare en kommentar`;
        const lexer = new Lexer(input);
        const tok = lexer.next();
        expect(tok.kind).toBe(TOKEN.EOF);
        expect(tok.literal).toBe("");
    });

    it("should lex empty input", () => {
        const input = ``;
        const lexer = new Lexer(input);
        const tok = lexer.next();
        expect(tok.kind).toBe(TOKEN.EOF);
        expect(tok.literal).toBe("");
    });

    it("should produce ILLEGAL for unknown characters", () => {
        const input = `§`;
        const lexer = new Lexer(input);
        const tok = lexer.next();
        expect(tok.kind).toBe(TOKEN.ILLEGAL);
    });

    it("should track line and column numbers", () => {
        const input = `lad x = 5;
sig(x);`;
        const lexer = new Lexer(input);

        const lad = lexer.next();
        expect(lad.line).toBe(1);
        expect(lad.col).toBe(1);

        const x = lexer.next();
        expect(x.line).toBe(1);
        expect(x.col).toBe(5);

        // skip = 5 ;
        lexer.next();
        lexer.next();
        lexer.next();

        const sig = lexer.next();
        expect(sig.line).toBe(2);
        expect(sig.col).toBe(1);
    });
});
