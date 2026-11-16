# Vytvori jeden samostatny subor domaci-pekari-nahlad.html (styly, skripty, pisma aj fotky vnutri)
# a otvori ho v Chrome. Spustenie: pravy klik na subor -> "Run with PowerShell".
# Nahlad je bez prihlasovania (prihlasenie cez Google funguje len na webe, nie zo suboru).
$root = $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false
function Read-Text($rel) { [IO.File]::ReadAllText((Join-Path $root $rel), $utf8) }

$html = Read-Text "index.html"

# fotky receptov -> data URI
$recipes = Read-Text "js\recipes.js"
$recipes = [regex]::Replace($recipes, 'image: "(img/[^"]+)"', {
  param($m)
  'image: "data:image/jpeg;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root $m.Groups[1].Value))) + '"'
})

# pisma -> data URI v CSS
$fonts = Read-Text "css\fonts.css"
$fonts = [regex]::Replace($fonts, 'url\("\.\./(fonts/[^"]+)"\)', {
  param($m)
  'url("data:font/woff2;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root $m.Groups[1].Value))) + '")'
})

# styly
$html = $html.Replace('<link rel="stylesheet" href="css/fonts.css">', "<style>`n$fonts`n</style>")
$html = $html.Replace('<link rel="stylesheet" href="css/styles.css">', "<style>`n" + (Read-Text "css\styles.css") + "`n</style>")
$html = [regex]::Replace($html, '\s*<link rel="preload"[^>]*>', '')

# skripty (vsetky <script src="js/...">)
$html = [regex]::Replace($html, '<script src="(js/[^"]+)"></script>', {
  param($m)
  $rel = $m.Groups[1].Value
  if ($rel -eq "js/vendor/supabase.min.js") { return "" }  # v nahlade netreba (je bez prihlasovania)
  if ($rel -eq "js/recipes.js") { $code = $recipes } else { $code = Read-Text $rel }
  if ($rel -eq "js/supabase-config.js") { $code = "window.PEKARI_CONFIG = {};" }  # nahlad je vzdy bez prihlasovania
  "<script>`n" + $code.Replace("</script", "<\/script") + "`n</script>"
})

$out = Join-Path $root "domaci-pekari-nahlad.html"
[IO.File]::WriteAllText($out, $html, $utf8)
Start-Process "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" "`"$out`""
