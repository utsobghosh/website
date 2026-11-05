# Scans the Notes folder (and sub-folders) and writes notes-list.js for the website.
$root = $PSScriptRoot
$notes = Join-Path $root "Notes"
$items = @(Get-ChildItem -LiteralPath $notes -Recurse -File | Where-Object { $_.Extension -match '^\.(pdf|docx?|pptx?|txt|jpe?g|png)$' } | ForEach-Object {
  [pscustomobject]@{
    p = "Notes/" + $_.FullName.Substring($notes.Length + 1).Replace("\", "/")
    t = [DateTimeOffset]::new($_.LastWriteTime).ToUnixTimeMilliseconds()
    s = $_.Length
  }
})
$json = ConvertTo-Json -InputObject $items -Compress
[IO.File]::WriteAllText((Join-Path $root "notes-list.js"), "window.NOTES_FILES=" + $json + ";", (New-Object Text.UTF8Encoding $false))
Write-Host ("Done: " + $items.Count + " files listed in notes-list.js")
