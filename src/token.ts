const TOKEN_NAMES = [
    // KEYWORD
    "LET",
    "CONST",
    "FUNCTION",
    "RETURN",
    "IF",
    "ELSE",
    "WHILE",
    "FOREACH",
    "STRAM",
    "OF",
    "MATCH",
    "TRUE",
    "FALSE",
    "NULL",
    "OK",
    "ERR",
    "BREAK",
    "AND",
    "OR",
    "NOT",
    "IMPORT",
    "FROM",
    "EXPORT",

    // OPERATOR
    "ASSIGN",
    "PLUS_ASSIGN",
    "MINUS_ASSIGN",
    "ASTERISK_ASSIGN",
    "SLASH_ASSIGN",
    "EQ",
    "NOT_EQ",
    "PLUS",
    "MINUS",
    "ASTERISK",
    "SLASH",
    "MODULO",
    "LT",
    "GT",
    "LT_OR_EQ",
    "GT_OR_EQ",
    "PIPE",
    "ARROW",
    "SEMICOLON",

    // DELIMITER
    "LPAREN",
    "RPAREN",
    "LBRACE",
    "RBRACE",
    "LBRACKET",
    "RBRACKET",
    "COMMA",
    "COLON",
    "DOT",

    // LITERAL
    "IDENT",
    "INT",
    "FLOAT",
    "STRING",
    "ILLEGAL",
    "EOF",
] as const;

type TokenName = (typeof TOKEN_NAMES)[number];

export const TOKEN = Object.fromEntries(TOKEN_NAMES.map((name, i) => [name, i])) as Readonly<
    Record<TokenName, number>
>;

export type TokenKind = number;

export type Token = {
    kind: TokenKind;
    literal: string;
    line: number;
    col: number;
    offset: number;
    length: number;
};

export function tokenName(kind: TokenKind): string {
    return TOKEN_NAMES[kind] ?? `UNKNOWN(${kind})`;
}

const keywords = new Map<string, TokenKind>([
    ["lad", TOKEN.LET],
    ["stabil", TOKEN.CONST],
    ["gør", TOKEN.FUNCTION],
    ["aflever", TOKEN.RETURN],
    ["hvis", TOKEN.IF],
    ["stram", TOKEN.STRAM],
    ["ellers", TOKEN.ELSE],
    ["mens", TOKEN.WHILE],
    ["kør", TOKEN.FOREACH],
    ["af", TOKEN.OF],
    ["prøv", TOKEN.MATCH],
    ["ja", TOKEN.TRUE],
    ["nej", TOKEN.FALSE],
    ["niks", TOKEN.NULL],
    ["flot", TOKEN.OK],
    ["øv", TOKEN.ERR],
    ["stop", TOKEN.BREAK],
    ["og", TOKEN.AND],
    ["eller", TOKEN.OR],
    ["ikke", TOKEN.NOT],
    ["ind", TOKEN.IMPORT],
    ["fra", TOKEN.FROM],
    ["ud", TOKEN.EXPORT],
]);

export function lookupIdent(ident: string): TokenKind {
    return keywords.get(ident) ?? TOKEN.IDENT;
}
