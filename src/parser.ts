import {
    makeArrayLiteral,
    makeBooleanLiteral,
    makeBlockStatement,
    makeBreakStatement,
    makeCallExpression,
    makeConstStatement,
    makeDictLiteral,
    makeDotExpression,
    makeErrExpression,
    makeExpressionStatement,
    makeFloatLiteral,
    makeForEachExpression,
    makeFunctionLiteral,
    makeIdentifier,
    makeIfExpression,
    makeIndexExpression,
    makeInfixExpression,
    makeIntegerLiteral,
    makeLetStatement,
    makeMatchExpression,
    makeNullLiteral,
    makeOkExpression,
    makePipeExpression,
    makePrefixExpression,
    makeProgram,
    makeReturnStatement,
    makeStringLiteral,
    makeWhileExpression,
    type BlockStatement,
    type ConstStatement,
    type Expression,
    type ExpressionStatement,
    type Identifier,
    type IfExpression,
    type LetStatement,
    type Program,
    type ReturnStatement,
    type BreakStatement,
    type Statement,
    makeAssignExpression,
} from "./ast.js";
import type {Lexer} from "./lexer.js";
import {TOKEN, tokenName, type Token, type TokenKind} from "./token.js";

type Nullable<T> = T | null;

const PRECEDENT = {
    _: 0,
    LOWEST: 1,
    ASSIGN: 2,
    PIPE: 3,
    OR: 4,
    AND: 5,
    EQUALS: 6,
    LESSGREATER: 7,
    SUM: 8,
    PRODUCT: 9,
    PREFIX: 10,
    CALL: 11,
    DOT: 11,
    INDEX: 12,
} as const;

const PRECEDENCES: Record<number, number> = {
    [TOKEN.PIPE]: PRECEDENT.PIPE,
    [TOKEN.OR]: PRECEDENT.OR,
    [TOKEN.AND]: PRECEDENT.AND,
    [TOKEN.EQ]: PRECEDENT.EQUALS,
    [TOKEN.NOT_EQ]: PRECEDENT.EQUALS,
    [TOKEN.LT]: PRECEDENT.LESSGREATER,
    [TOKEN.GT]: PRECEDENT.LESSGREATER,
    [TOKEN.ASSIGN]: PRECEDENT.ASSIGN,
    [TOKEN.LT_OR_EQ]: PRECEDENT.LESSGREATER,
    [TOKEN.GT_OR_EQ]: PRECEDENT.LESSGREATER,
    [TOKEN.PLUS]: PRECEDENT.SUM,
    [TOKEN.MINUS]: PRECEDENT.SUM,
    [TOKEN.SLASH]: PRECEDENT.PRODUCT,
    [TOKEN.ASTERISK]: PRECEDENT.PRODUCT,
    [TOKEN.LPAREN]: PRECEDENT.CALL,
    [TOKEN.DOT]: PRECEDENT.DOT,
    [TOKEN.LBRACKET]: PRECEDENT.INDEX,
};

type prefixParseFunction = () => Nullable<Expression>;
type infixParseFunction = (exp: Expression) => Nullable<Expression>;

export class Parser {
    #lexer: Lexer;
    #errors: string[];

    #current: Token;
    #next: Token;

    #prefixParseFns: Map<TokenKind, prefixParseFunction>;
    #infixParseFns: Map<TokenKind, infixParseFunction>;

    constructor(lexer: Lexer) {
        this.#lexer = lexer;
        this.#errors = [];

        this.#prefixParseFns = new Map([
            [TOKEN.IDENT, this.#parseIdentifier],
            [TOKEN.INT, this.#parseIntegerLiteral],
            [TOKEN.FLOAT, this.#parseFloatLiteral],
            [TOKEN.STRING, this.#parseStringLiteral],
            [TOKEN.TRUE, this.#parseBoolean],
            [TOKEN.FALSE, this.#parseBoolean],
            [TOKEN.NULL, this.#parseNullLiteral],
            [TOKEN.NOT, this.#parsePrefixExpression],
            [TOKEN.MINUS, this.#parsePrefixExpression],
            [TOKEN.LPAREN, this.#parseGroupedExpression],
            [TOKEN.LBRACKET, this.#parseArrayLiteral],
            [TOKEN.LBRACE, this.#parseDictLiteral],
            [TOKEN.STRAM, this.#parsePrefixExpression],
            [TOKEN.IF, this.#parseIfExpression],
            [TOKEN.FUNCTION, this.#parseFunctionLiteral],
            [TOKEN.WHILE, this.#parseWhileExpression],
            [TOKEN.FOREACH, this.#parseForEachExpression],
            [TOKEN.MATCH, this.#parseMatchExpression],
            [TOKEN.OK, this.#parseOkExpression],
            [TOKEN.ERR, this.#parseErrExpression],
        ]);

        this.#infixParseFns = new Map([
            [TOKEN.PLUS, this.#parseInfixExpression],
            [TOKEN.MINUS, this.#parseInfixExpression],
            [TOKEN.SLASH, this.#parseInfixExpression],
            [TOKEN.ASTERISK, this.#parseInfixExpression],
            [TOKEN.EQ, this.#parseInfixExpression],
            [TOKEN.NOT_EQ, this.#parseInfixExpression],
            [TOKEN.LT, this.#parseInfixExpression],
            [TOKEN.GT, this.#parseInfixExpression],
            [TOKEN.LT_OR_EQ, this.#parseInfixExpression],
            [TOKEN.GT_OR_EQ, this.#parseInfixExpression],
            [TOKEN.AND, this.#parseInfixExpression],
            [TOKEN.OR, this.#parseInfixExpression],
            [TOKEN.LPAREN, this.#parseCallExpression],
            [TOKEN.LBRACKET, this.#parseIndexExpression],
            [TOKEN.ASSIGN, this.#parseAssignExpression],
            [TOKEN.DOT, this.#parseDotExpression],
            [TOKEN.PIPE, this.#parsePipeExpression],
        ]);

        // set both current and next
        this.#current = this.#lexer.next();
        this.#next = this.#lexer.next();
    }

    get errors(): ReadonlyArray<string> {
        return this.#errors;
    }

    parse(): Program {
        const program = makeProgram();
        while (this.#current.kind !== TOKEN.EOF) {
            const stmt = this.#parseStatement();
            if (stmt) {
                program.statements.push(stmt);
            } else {
                // TODO maybe print here or something, the statement parsed returned null
            }
            this.#nextToken();
        }
        return program;
    }

    #expectPeek(kind: TokenKind): boolean {
        if (this.#next.kind === kind) {
            this.#nextToken();
            return true;
        }
        this.#peekError(kind);
        return false;
    }

    #peekPrecedence(): number {
        const prec = PRECEDENCES[this.#next.kind];
        if (prec === undefined) return PRECEDENT.LOWEST;
        return prec;
    }

    #peekError(kind: TokenKind) {
        const msg = `expected next token to be ${tokenName(kind)}, got ${tokenName(this.#next.kind)} instead`;
        this.#errors.push(msg);
    }

    #noPrefixParseError(token: Token) {
        const msg = `l:${token.line}|c:${token.col} -> no prefix parse function for ${token.literal}|${tokenName(token.kind)} found`;
        this.#errors.push(msg);
    }

    #nextToken() {
        this.#current = this.#next;
        this.#next = this.#lexer.next();
    }

    #parseStatement(): Nullable<Statement> {
        switch (this.#current.kind) {
            case TOKEN.LET:
                return this.#parseLetStatement();
            case TOKEN.CONST:
                return this.#parseConstStatement();
            case TOKEN.RETURN:
                return this.#parseReturnStatement();
            case TOKEN.BREAK:
                return this.#parseBreakStatement();
            default:
                return this.#parseExpressionStatement();
        }
    }

    #parseLetStatement(): Nullable<LetStatement> {
        const stmt = makeLetStatement(this.#current);

        if (!this.#expectPeek(TOKEN.IDENT)) return null;

        stmt.name = makeIdentifier(this.#current, this.#current.literal);

        if (!this.#expectPeek(TOKEN.ASSIGN)) return null;

        this.#nextToken();

        const expr = this.#parseExpression(PRECEDENT.LOWEST);

        if (!expr) return null;

        stmt.value = expr;

        if (this.#next.kind === TOKEN.SEMICOLON) this.#nextToken();

        return stmt;
    }

    #parseExpression(precedence: number): Nullable<Expression> {
        const prefix = this.#prefixParseFns.get(this.#current.kind);
        if (!prefix) {
            this.#noPrefixParseError(this.#current);
            return null;
        }

        let leftExp = prefix();
        if (!leftExp) return null;

        while (this.#next.kind !== TOKEN.SEMICOLON && precedence < this.#peekPrecedence()) {
            const infix = this.#infixParseFns.get(this.#next.kind);
            if (!infix) return leftExp;

            this.#nextToken();

            const result = infix(leftExp);
            if (!result) return null;
            leftExp = result;
        }

        return leftExp;
    }

    #parseExpressionStatement(): Nullable<ExpressionStatement> {
        const stmt = makeExpressionStatement(this.#current);
        const expr = this.#parseExpression(PRECEDENT.LOWEST);

        if (!expr) return null;

        stmt.expression = expr;
        if (this.#next.kind === TOKEN.SEMICOLON) {
            this.#nextToken();
        }
        return stmt;
    }

    #parseConstStatement(): Nullable<ConstStatement> {
        const stmt = makeConstStatement(this.#current);

        if (!this.#expectPeek(TOKEN.IDENT)) return null;

        stmt.name = makeIdentifier(this.#current, this.#current.literal);

        if (!this.#expectPeek(TOKEN.ASSIGN)) return null;

        this.#nextToken();

        const expr = this.#parseExpression(PRECEDENT.LOWEST);

        if (!expr) return null;

        stmt.value = expr;

        if (this.#next.kind === TOKEN.SEMICOLON) this.#nextToken();

        return stmt;
    }

    #parseReturnStatement(): Nullable<ReturnStatement> {
        const stmt = makeReturnStatement(this.#current);

        this.#nextToken();

        const expr = this.#parseExpression(PRECEDENT.LOWEST);

        if (!expr) return null;

        stmt.value = expr;

        if (this.#next.kind === TOKEN.SEMICOLON) this.#nextToken();

        return stmt;
    }

    #parseBreakStatement(): BreakStatement {
        const stmt = makeBreakStatement(this.#current);
        if (this.#next.kind === TOKEN.SEMICOLON) this.#nextToken();
        return stmt;
    }

    #parseBlockStatement(): BlockStatement {
        const block = makeBlockStatement(this.#current);
        this.#nextToken();

        while (this.#current.kind !== TOKEN.RBRACE && this.#current.kind !== TOKEN.EOF) {
            const stmt = this.#parseStatement();
            if (stmt) block.statements.push(stmt);
            this.#nextToken();
        }

        return block;
    }

    #parseFunctionParams(): Nullable<Identifier[]> {
        const params: Identifier[] = [];

        if (this.#next.kind === TOKEN.RPAREN) {
            this.#nextToken();
            return params;
        }

        this.#nextToken();
        params.push(makeIdentifier(this.#current));

        while (this.#next.kind === TOKEN.COMMA) {
            this.#nextToken();
            this.#nextToken();
            params.push(makeIdentifier(this.#current));
        }

        if (!this.#expectPeek(TOKEN.RPAREN)) return null;

        return params;
    }

    #parseArrayLiteral = (): Nullable<Expression> => {
        const array = makeArrayLiteral(this.#current);
        const elements = this.#parseExpressionList(TOKEN.RBRACKET);

        if (!elements) return null;

        array.elements = elements;
        return array;
    };

    #parseExpressionList(endToken: TokenKind): Nullable<Expression[]> {
        const list: Expression[] = [];
        if (this.#next.kind === endToken) {
            this.#nextToken();
            return list;
        }
        this.#nextToken();
        const expr = this.#parseExpression(PRECEDENT.LOWEST);
        if (!expr) return null;
        list.push(expr);

        while (this.#next.kind === TOKEN.COMMA) {
            this.#nextToken();
            this.#nextToken();
            const expr = this.#parseExpression(PRECEDENT.LOWEST);
            if (!expr) return null;
            list.push(expr);
        }

        if (!this.#expectPeek(endToken)) return null;

        return list;
    }

    // arrow functions are required so that `this` is bound correctly when
    // these are extracted from the prefixParseFns map and called as plain functions.

    #parseIdentifier = (): Expression => {
        return makeIdentifier(this.#current, this.#current.literal);
    };

    #parseIntegerLiteral = (): Nullable<Expression> => {
        const value = parseInt(this.#current.literal, 10);
        if (isNaN(value)) {
            this.#errors.push(
                `l:${this.#current.line}|c:${this.#current.col} -> could not parse '${this.#current.literal}' as integer`
            );
            return null;
        }
        return makeIntegerLiteral(this.#current, value);
    };

    #parseFloatLiteral = (): Nullable<Expression> => {
        const value = parseFloat(this.#current.literal);
        if (isNaN(value)) {
            this.#errors.push(
                `l:${this.#current.line}|c:${this.#current.col} -> could not parse '${this.#current.literal}' as float`
            );
            return null;
        }
        return makeFloatLiteral(this.#current, value);
    };

    #parseStringLiteral = (): Expression => {
        return makeStringLiteral(this.#current, this.#current.literal);
    };

    #parseBoolean = (): Expression => {
        return makeBooleanLiteral(this.#current, this.#current.kind === TOKEN.TRUE);
    };

    #parseNullLiteral = (): Expression => {
        return makeNullLiteral(this.#current);
    };

    #parsePrefixExpression = (): Nullable<Expression> => {
        const expr = makePrefixExpression(this.#current, this.#current.literal);
        this.#nextToken();
        const right = this.#parseExpression(PRECEDENT.PREFIX);
        if (!right) return null;
        expr.right = right;
        return expr;
    };

    #parseGroupedExpression = (): Nullable<Expression> => {
        this.#nextToken();
        const expr = this.#parseExpression(PRECEDENT.LOWEST);
        if (!this.#expectPeek(TOKEN.RPAREN)) return null;
        return expr;
    };

    #parseDictLiteral = (): Nullable<Expression> => {
        const dict = makeDictLiteral(this.#current);

        while (this.#next.kind !== TOKEN.RBRACE && this.#next.kind !== TOKEN.EOF) {
            this.#nextToken();
            const key = this.#parseExpression(PRECEDENT.LOWEST);
            if (!key) return null;

            if (!this.#expectPeek(TOKEN.COLON)) return null;

            this.#nextToken();
            const value = this.#parseExpression(PRECEDENT.LOWEST);
            if (!value) return null;

            dict.pairs.set(key, value);

            if (this.#next.kind !== TOKEN.RBRACE && !this.#expectPeek(TOKEN.COMMA)) return null;
        }

        if (!this.#expectPeek(TOKEN.RBRACE)) return null;

        return dict;
    };

    #parseIfExpression = (): Nullable<Expression> => {
        const expr = makeIfExpression(this.#current);

        this.#nextToken();
        const condition = this.#parseExpression(PRECEDENT.LOWEST);
        if (!condition) return null;
        expr.condition = condition;

        if (!this.#expectPeek(TOKEN.LBRACE)) return null;

        expr.consequence = this.#parseBlockStatement();

        if (this.#next.kind === TOKEN.ELSE) {
            this.#nextToken();
            if (this.#next.kind === TOKEN.IF) {
                this.#nextToken();
                const alt = this.#parseIfExpression();
                if (alt) expr.alternative = alt as IfExpression;
            } else {
                if (!this.#expectPeek(TOKEN.LBRACE)) return null;
                expr.alternative = this.#parseBlockStatement();
            }
        }

        return expr;
    };

    #parseWhileExpression = (): Nullable<Expression> => {
        const expr = makeWhileExpression(this.#current);

        this.#nextToken();
        const condition = this.#parseExpression(PRECEDENT.LOWEST);
        if (!condition) return null;
        expr.condition = condition;

        if (!this.#expectPeek(TOKEN.LBRACE)) return null;

        expr.body = this.#parseBlockStatement();

        return expr;
    };

    #parseForEachExpression = (): Nullable<Expression> => {
        const expr = makeForEachExpression(this.#current);

        if (!this.#expectPeek(TOKEN.IDENT)) return null;
        expr.value = makeIdentifier(this.#current);

        if (this.#next.kind === TOKEN.COMMA) {
            this.#nextToken();
            if (!this.#expectPeek(TOKEN.IDENT)) return null;
            expr.index = makeIdentifier(this.#current);
        }

        if (!this.#expectPeek(TOKEN.OF)) return null;

        this.#nextToken();
        const iterable = this.#parseExpression(PRECEDENT.LOWEST);
        if (!iterable) return null;
        expr.iterable = iterable;

        if (!this.#expectPeek(TOKEN.LBRACE)) return null;

        expr.body = this.#parseBlockStatement();

        return expr;
    };

    #parseFunctionLiteral = (): Nullable<Expression> => {
        const fn = makeFunctionLiteral(this.#current);

        if (!this.#expectPeek(TOKEN.LPAREN)) return null;

        const params = this.#parseFunctionParams();
        if (!params) return null;
        fn.params = params;

        if (!this.#expectPeek(TOKEN.LBRACE)) return null;

        fn.body = this.#parseBlockStatement();

        return fn;
    };

    #parseMatchExpression = (): Nullable<Expression> => {
        const expr = makeMatchExpression(this.#current);

        this.#nextToken();
        const subject = this.#parseExpression(PRECEDENT.LOWEST);
        if (!subject) return null;
        expr.subject = subject;

        if (!this.#expectPeek(TOKEN.LBRACE)) return null;

        while (this.#next.kind !== TOKEN.RBRACE && this.#next.kind !== TOKEN.EOF) {
            this.#nextToken();
            const pattern = this.#parseExpression(PRECEDENT.LOWEST);
            if (!pattern) return null;

            if (!this.#expectPeek(TOKEN.ARROW)) return null;

            this.#nextToken();
            const body = this.#parseExpression(PRECEDENT.LOWEST);
            if (!body) return null;

            expr.arms.push({pattern, body});

            if (this.#next.kind === TOKEN.COMMA) this.#nextToken();
        }

        if (!this.#expectPeek(TOKEN.RBRACE)) return null;

        return expr;
    };

    #parseOkExpression = (): Nullable<Expression> => {
        const expr = makeOkExpression(this.#current);
        if (!this.#expectPeek(TOKEN.LPAREN)) return null;
        this.#nextToken();
        const value = this.#parseExpression(PRECEDENT.LOWEST);
        if (!value) return null;
        expr.value = value;
        if (!this.#expectPeek(TOKEN.RPAREN)) return null;
        return expr;
    };

    #parseErrExpression = (): Nullable<Expression> => {
        const expr = makeErrExpression(this.#current);
        if (!this.#expectPeek(TOKEN.LPAREN)) return null;
        this.#nextToken();
        const value = this.#parseExpression(PRECEDENT.LOWEST);
        if (!value) return null;
        expr.value = value;
        if (!this.#expectPeek(TOKEN.RPAREN)) return null;
        return expr;
    };

    #parseInfixExpression = (left: Expression): Nullable<Expression> => {
        const expr = makeInfixExpression(this.#current, left, this.#current.literal);
        const precedence = PRECEDENCES[this.#current.kind] ?? PRECEDENT.LOWEST;
        this.#nextToken();
        const right = this.#parseExpression(precedence);
        if (!right) return null;
        expr.right = right;
        return expr;
    };

    #parseAssignExpression = (left: Expression): Nullable<Expression> => {
        if (
            left.kind !== "Identifier" &&
            left.kind !== "DotExpression" &&
            left.kind !== "IndexExpression"
        ) {
            this.#errors.push(
                `l:${left.token.line}|c:${left.token.col} -> kan ikke tildele til ${left.kind}`
            );
            return null;
        }
        this.#nextToken();
        const value = this.#parseExpression(PRECEDENT.ASSIGN - 1);
        if (!value) return null;
        return makeAssignExpression(left.token, left, value);
    };

    #parseCallExpression = (fn: Expression): Nullable<Expression> => {
        const expr = makeCallExpression(this.#current, fn);
        const args = this.#parseExpressionList(TOKEN.RPAREN);
        if (!args) return null;
        expr.args = args;
        return expr;
    };

    #parseIndexExpression = (left: Expression): Nullable<Expression> => {
        const expr = makeIndexExpression(this.#current, left);
        this.#nextToken();
        const index = this.#parseExpression(PRECEDENT.LOWEST);
        if (!index) return null;
        expr.index = index;
        if (!this.#expectPeek(TOKEN.RBRACKET)) return null;
        return expr;
    };

    #parseDotExpression = (left: Expression): Nullable<Expression> => {
        const expr = makeDotExpression(this.#current, left);
        this.#nextToken();
        expr.field = makeIdentifier(this.#current, this.#current.literal);
        return expr;
    };

    #parsePipeExpression = (left: Expression): Nullable<Expression> => {
        const expr = makePipeExpression(this.#current, left);
        this.#nextToken();
        const right = this.#parseExpression(PRECEDENT.PIPE);
        if (!right) return null;
        expr.right = right;
        return expr;
    };
}
