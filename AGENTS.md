# AGENTS.md instructions for C:\Users\Owner\git\xcomposer

## PowerShell で日本語を含むファイルを読む場合

- `Get-Content` を使うときは、文字化けを避けるため `-Encoding utf8` を必ず明示すること。
- 例: `Get-Content -LiteralPath src\pages\TweetPage.vue -Encoding utf8`
