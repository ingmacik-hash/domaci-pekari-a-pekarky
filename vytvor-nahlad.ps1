# Vytvorí jeden samostatný súbor domaci-pekari-nahlad.html (štýly, skripty aj fotky vnútri)
# a otvorí ho v Chrome. Spustenie: pravý klik na súbor -> "Run with PowerShell".
$root = $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false
$html = [IO.File]::ReadAllText("$root\index.html", $utf8)
$css = [IO.File]::ReadAllText("$root\css\styles.css", $utf8)
$recipes = [IO.File]::ReadAllText("$root\js\recipes.js", $utf8)
$app = [IO.File]::ReadAllText("$root\js\app.js", $utf8)
$recipes = [regex]::Replace($recipes, 'image: "(img/[^"]+)"', {
  param($m)
  'image: "data:image/jpeg;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes("$root\" + $m.Groups[1].Value)) + '"'
})
$html = $html.Replace('<link rel="stylesheet" href="css/styles.css">', "<style>`n$css`n</style>")
$html = $html.Replace('<script src="js/recipes.js"></script>', "<script>`n$recipes`n</script>")
$html = $html.Replace('<script src="js/app.js"></script>', "<script>`n$app`n</script>")
$out = "$root\domaci-pekari-nahlad.html"
[IO.File]::WriteAllText($out, $html, $utf8)
Start-Process "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" "`"$out`""
