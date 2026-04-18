/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
    ASSIGN: 1,
    PIPE: 2,
    OR: 3,
    AND: 4,
    EQUALS: 5,
    COMPARE: 6,
    SUM: 7,
    PRODUCT: 8,
    PREFIX: 9,
    CALL: 10,
    DOT: 11,
    INDEX: 12,
};

module.exports = grammar({
    name: "gemyt",

    extras: ($) => [/\s/, $.comment],

    word: ($) => $.identifier,

    rules: {
        program: ($) => repeat($._statement),

        // --- Statements ---

        _statement: ($) =>
            choice(
                $.let_statement,
                $.const_statement,
                $.return_statement,
                $.break_statement,
                $.import_statement,
                $.export_statement,
                $.expression_statement
            ),

        let_statement: ($) =>
            seq("lad", field("name", $.identifier), "=", field("value", $._expression), optional(";")),

        const_statement: ($) =>
            seq("stabil", field("name", $.identifier), "=", field("value", $._expression), optional(";")),

        return_statement: ($) => seq("aflever", field("value", $._expression), optional(";")),

        break_statement: ($) => seq("stop", optional(";")),

        import_statement: ($) =>
            seq(
                "ind",
                field("name", $.identifier),
                repeat(seq(",", field("name", $.identifier))),
                "fra",
                field("source", $.string),
                optional(";")
            ),

        export_statement: ($) =>
            seq(
                "ud",
                "stabil",
                field("name", $.identifier),
                "=",
                field("value", $._expression),
                optional(";")
            ),

        expression_statement: ($) => seq($._expression, optional(";")),

        block: ($) => seq("{", repeat($._statement), "}"),

        // --- Expressions ---

        _expression: ($) =>
            choice(
                $.identifier,
                $.integer,
                $.float,
                $.string,
                $.boolean,
                $.null,
                $.array,
                $.dict,
                $.prefix_expression,
                $.infix_expression,
                $.assign_expression,
                $.if_expression,
                $.while_expression,
                $.foreach_expression,
                $.function_literal,
                $.call_expression,
                $.index_expression,
                $.dot_expression,
                $.pipe_expression,
                $.match_expression,
                $.ok_expression,
                $.err_expression,
                $.grouped_expression
            ),

        grouped_expression: ($) => seq("(", $._expression, ")"),

        prefix_expression: ($) =>
            prec(
                PREC.PREFIX,
                seq(
                    field("operator", choice("ikke", "-", "stram")),
                    field("right", $._expression)
                )
            ),

        infix_expression: ($) =>
            choice(
                ...[
                    ["+", PREC.SUM],
                    ["-", PREC.SUM],
                    ["*", PREC.PRODUCT],
                    ["/", PREC.PRODUCT],
                    ["%", PREC.PRODUCT],
                    ["==", PREC.EQUALS],
                    ["!=", PREC.EQUALS],
                    ["<", PREC.COMPARE],
                    [">", PREC.COMPARE],
                    ["<=", PREC.COMPARE],
                    [">=", PREC.COMPARE],
                ].map(([op, prec_val]) =>
                    prec.left(
                        /** @type {number} */ (prec_val),
                        seq(
                            field("left", $._expression),
                            field("operator", /** @type {string} */ (op)),
                            field("right", $._expression)
                        )
                    )
                ),
                prec.left(
                    PREC.AND,
                    seq(field("left", $._expression), field("operator", "og"), field("right", $._expression))
                ),
                prec.left(
                    PREC.OR,
                    seq(
                        field("left", $._expression),
                        field("operator", "eller"),
                        field("right", $._expression)
                    )
                )
            ),

        assign_expression: ($) =>
            prec.right(
                PREC.ASSIGN,
                seq(
                    field("target", $._expression),
                    field("operator", choice("=", "+=", "-=", "*=", "/=")),
                    field("value", $._expression)
                )
            ),

        if_expression: ($) =>
            seq(
                "hvis",
                field("condition", $._expression),
                field("consequence", $.block),
                optional(
                    seq(
                        "ellers",
                        field("alternative", choice($.block, $.if_expression))
                    )
                )
            ),

        while_expression: ($) =>
            seq("mens", field("condition", $._expression), field("body", $.block)),

        foreach_expression: ($) =>
            seq(
                "kør",
                field("value", $.identifier),
                optional(seq(",", field("index", $.identifier))),
                "af",
                field("iterable", $._expression),
                field("body", $.block)
            ),

        function_literal: ($) =>
            seq(
                "gør",
                "(",
                optional(
                    seq(
                        field("parameter", $.identifier),
                        repeat(seq(",", field("parameter", $.identifier)))
                    )
                ),
                ")",
                field("body", $.block)
            ),

        call_expression: ($) =>
            prec(
                PREC.CALL,
                seq(
                    field("function", $._expression),
                    "(",
                    optional(
                        seq(
                            field("argument", $._expression),
                            repeat(seq(",", field("argument", $._expression)))
                        )
                    ),
                    ")"
                )
            ),

        index_expression: ($) =>
            prec(
                PREC.INDEX,
                seq(field("left", $._expression), "[", field("index", $._expression), "]")
            ),

        dot_expression: ($) =>
            prec.left(
                PREC.DOT,
                seq(field("left", $._expression), ".", field("field", $.identifier))
            ),

        pipe_expression: ($) =>
            prec.left(
                PREC.PIPE,
                seq(field("left", $._expression), "|>", field("right", $._expression))
            ),

        match_expression: ($) =>
            seq(
                "prøv",
                field("subject", $._expression),
                "{",
                optional(
                    seq(
                        $.match_arm,
                        repeat(seq(",", $.match_arm)),
                        optional(",")
                    )
                ),
                "}"
            ),

        match_arm: ($) =>
            seq(field("pattern", $._expression), "=>", field("body", $._expression)),

        ok_expression: ($) => seq("flot", "(", field("value", $._expression), ")"),

        err_expression: ($) => seq("øv", "(", field("value", $._expression), ")"),

        // --- Literals ---

        array: ($) =>
            seq(
                "[",
                optional(
                    seq($._expression, repeat(seq(",", $._expression)), optional(","))
                ),
                "]"
            ),

        dict: ($) =>
            seq(
                "{",
                optional(
                    seq($.dict_pair, repeat(seq(",", $.dict_pair)), optional(","))
                ),
                "}"
            ),

        dict_pair: ($) =>
            seq(field("key", $._expression), ":", field("value", $._expression)),

        identifier: ($) => /[a-zA-Z_æøåÆØÅ][a-zA-Z0-9_æøåÆØÅ]*/,

        integer: ($) => /[0-9]+/,

        float: ($) => /[0-9]+\.[0-9]+/,

        string: ($) =>
            seq(
                '"',
                repeat(
                    choice(
                        $.escape_sequence,
                        /[^"\\]+/
                    )
                ),
                '"'
            ),

        escape_sequence: ($) => /\\[nrt\\"]/,

        boolean: ($) => choice("ja", "nej"),

        null: ($) => "niks",

        comment: ($) => /\/\/[^\n]*/,
    },
});
