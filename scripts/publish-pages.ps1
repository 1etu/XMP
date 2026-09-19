$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
& pnpm build:pages
if ($LASTEXITCODE -ne 0) { throw 'The Pages build failed.' }

$sourceRevision = (& git rev-parse HEAD).Trim()
$identityJson = & gh api repos/1etu/XMP/commits/main --jq '.commit.author'
if ($LASTEXITCODE -ne 0) { throw 'The GitHub commit identity is unavailable.' }
$identity = $identityJson | ConvertFrom-Json
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ('xmp-pages-' + [guid]::NewGuid().ToString('N'))
& git clone https://github.com/1etu/xmb-test-portfolio.git $staging
if ($LASTEXITCODE -ne 0) { throw 'The deployment checkout failed.' }
& git -C $staging checkout -B main
if ($LASTEXITCODE -ne 0) { throw 'The deployment branch is unavailable.' }

$stagingRoot = [System.IO.Path]::GetFullPath($staging).TrimEnd('\') + '\'
Get-ChildItem -LiteralPath $staging -Force | Where-Object { $_.Name -ne '.git' } | ForEach-Object {
    $target = [System.IO.Path]::GetFullPath($_.FullName)
    if (-not $target.StartsWith($stagingRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'The deployment path is outside its checkout.'
    }
    Remove-Item -LiteralPath $target -Recurse -Force
}
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'apps/vsh-web/dist') -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $staging -Recurse -Force
}
foreach ($item in @('marketing', 'LICENSE', 'RESEARCH.md', 'THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_LICENSES.txt')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $item) -Destination $staging -Recurse -Force
}
$readme = Get-Content -LiteralPath (Join-Path $projectRoot 'README.md') -Raw -Encoding UTF8
$deploymentText = "## This repository`n`nThis repository hosts the compiled website and campaign kit. Development takes place in a separate source checkout.`n`nGitHub Pages cannot run the live visitor server, so the static site shows a dash.`n`n"
$readme = [regex]::Replace($readme, '(?s)## Run\r?\n.*?(?=## Controls)', $deploymentText)
[System.IO.File]::WriteAllText((Join-Path $staging 'README.md'), $readme)
$manifest = @{ source = '1etu/XMP'; revision = $sourceRevision; base = '/xmb-test-portfolio/' } | ConvertTo-Json
[System.IO.File]::WriteAllText((Join-Path $staging 'deployment.json'), $manifest + "`n")
& git -C $staging add --all
& git -C $staging diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    & git -C $staging -c "user.name=$($identity.name)" -c "user.email=$($identity.email)" commit -m "pages: publish XMP $($sourceRevision.Substring(0, 7))"
    if ($LASTEXITCODE -ne 0) { throw 'The deployment commit failed.' }
    & git -C $staging push origin main
    if ($LASTEXITCODE -ne 0) { throw 'The deployment push failed.' }
}
Write-Output "Deployment checkout: $staging"
Write-Output 'Site: https://1etu.github.io/xmb-test-portfolio/'
