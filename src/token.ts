export const TOKEN = {
    // KEYWORD
    LET: 0,
    CONST: 1,
    FUNCTION: 2,
    RETURN: 3,
    PRINT: 4,
    IF: 5,
    ELSE: 6,
    WHILE: 7,
    FOREACH: 8,
    OF: 9,
    MATCH: 10,
    TRUE: 11,
    FALSE: 12,
    NULL: 13,
    OK: 14,
    ERR: 15,
    STRUCT: 16,
    UNWRAP: 17,
    BREAK: 18,
    AND: 19,
    OR: 20,
    NOT: 21,

    // OPERATOR
    ASSIGN: 22,
    EQ: 23,
    NOT_EQ: 24,
    PLUS: 25,
    MINUS: 26,
    ASTERISK: 27,
    SLASH: 28,
    LT: 29,
    GT: 30,
    LT_OR_EQ: 31,
    GT_OR_EQ: 32,
    PIPE: 33,
    ARROW: 34,
    SEMICOLON: 35,

    // DELIMITER
    LPAREN: 36,
    RPAREN: 37,
    LBRACE: 38,
    RBRACE: 39,
    LBRACKET: 40,
    RBRACKET: 41,
    COMMA: 42,
    COLON: 43,
    DOT: 44,

    // LITERAL
    IDENT: 45,
    INT: 46,
    FLOAT: 47,
    STRING: 48,
    ILLEGAL: 49,
    EOF: 50,
} as const;

export type TokenKind = (typeof TOKEN)[keyof typeof TOKEN];

export type Token = {
    kind: TokenKind;
    literal: string;
    line: number;
    col: number;
};

// Indexed by TokenKind for O(1) debug lookup — created once, not per token
const TOKEN_NAMES: string[] = [
    "LET", "CONST", "FUNCTION", "RETURN", "PRINT",
    "IF", "ELSE", "WHILE", "FOREACH", "OF",
    "MATCH", "TRUE", "FALSE", "NULL", "OK",
    "ERR", "STRUCT", "UNWRAP", "BREAK", "AND",
    "OR", "NOT",
    "ASSIGN", "EQ", "NOT_EQ", "PLUS", "MINUS",
    "ASTERISK", "SLASH", "LT", "GT", "LT_OR_EQ",
    "GT_OR_EQ", "PIPE", "ARROW", "SEMICOLON",
    "LPAREN", "RPAREN", "LBRACE", "RBRACE",
    "LBRACKET", "RBRACKET", "COMMA", "COLON", "DOT",
    "IDENT", "INT", "FLOAT", "STRING", "ILLEGAL", "EOF",
];

export function tokenName(kind: TokenKind): string {
    return TOKEN_NAMES[kind] ?? `UNKNOWN(${kind})`;
}

const keywords = new Map<string, TokenKind>([
    ["lad", TOKEN.LET],
    ["stabil", TOKEN.CONST],
    ["gør", TOKEN.FUNCTION],
    ["giv", TOKEN.RETURN],
    ["sig", TOKEN.PRINT],
    ["hvis", TOKEN.IF],
    ["ellers", TOKEN.ELSE],
    ["mens", TOKEN.WHILE],
    ["kør", TOKEN.FOREACH],
    ["af", TOKEN.OF],
    ["prøv", TOKEN.MATCH],
    ["ja", TOKEN.TRUE],
    ["nej", TOKEN.FALSE],
    ["intet", TOKEN.NULL],
    ["fint", TOKEN.OK],
    ["øv", TOKEN.ERR],
    ["gemyt", TOKEN.STRUCT],
    ["bare", TOKEN.UNWRAP],
    ["bryd", TOKEN.BREAK],
    ["og", TOKEN.AND],
    ["eller", TOKEN.OR],
    ["ikke", TOKEN.NOT],
]);

export function lookupIdent(ident: string): TokenKind {
    return keywords.get(ident) ?? TOKEN.IDENT;
}
