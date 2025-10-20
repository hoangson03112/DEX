Get-ChildItem -Path src -Recurse -Include *.js,*.jsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '(?m)^\s*//.*$', ''
    $content = $content -replace '/\*(?!\*/)[\s\S]*?\*/', ''
    $content = $content -replace '(?m)^\s*$\n', ''
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "Cleaned: $($_.Name)"
}
