; Scopes
(program) @local.scope
(function_literal) @local.scope
(block) @local.scope
(foreach_expression) @local.scope

; Definitions
(let_statement name: (identifier) @local.definition)
(const_statement name: (identifier) @local.definition)
(export_statement name: (identifier) @local.definition)
(function_literal parameter: (identifier) @local.definition)
(foreach_expression value: (identifier) @local.definition)
(foreach_expression index: (identifier) @local.definition)

; References
(identifier) @local.reference
