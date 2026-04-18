; Keywords
"lad" @keyword
"stabil" @keyword
"gør" @keyword
"aflever" @keyword.return
"hvis" @keyword.conditional
"ellers" @keyword.conditional
"mens" @keyword.repeat
"kør" @keyword.repeat
"af" @keyword
"prøv" @keyword.conditional
"stop" @keyword
"ind" @keyword.import
"fra" @keyword.import
"ud" @keyword.import
"stram" @keyword

; Operators
"og" @keyword.operator
"eller" @keyword.operator
"ikke" @keyword.operator

"+" @operator
"-" @operator
"*" @operator
"/" @operator
"%" @operator
"=" @operator
"==" @operator
"!=" @operator
"<" @operator
">" @operator
"<=" @operator
">=" @operator
"|>" @operator
"=>" @operator
"+=" @operator
"-=" @operator
"*=" @operator
"/=" @operator

; Literals
(integer) @number
(float) @number.float
(string) @string
(escape_sequence) @string.escape
(boolean) @boolean
(null) @constant.builtin

; Result constructors
"flot" @function.builtin
"øv" @function.builtin

; Identifiers
(identifier) @variable

; Function-related
(function_literal "gør" @keyword.function)
(call_expression function: (identifier) @function.call)
(call_expression function: (dot_expression field: (identifier) @function.method.call))

; Parameters
(function_literal parameter: (identifier) @variable.parameter)

; Declarations
(let_statement name: (identifier) @variable.definition)
(const_statement name: (identifier) @variable.definition)
(export_statement name: (identifier) @variable.definition)

; ForEach bindings
(foreach_expression value: (identifier) @variable.definition)
(foreach_expression index: (identifier) @variable.definition)

; Dot access
(dot_expression field: (identifier) @property)

; Match
(match_arm "=>" @operator)

; Import
(import_statement name: (identifier) @module)
(import_statement source: (string) @string.special)

; Dict
(dict_pair key: (string) @property)
(dict_pair key: (identifier) @property)

; Delimiters
"(" @punctuation.bracket
")" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket

"," @punctuation.delimiter
":" @punctuation.delimiter
";" @punctuation.delimiter
"." @punctuation.delimiter

; Comments
(comment) @comment
