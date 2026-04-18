tree-sitter grammar for gemyt

```bash
npm install
npm run generate

# windows (i know..)
clang -shared -o gemyt.dll src/parser.c -I src -O2
```
