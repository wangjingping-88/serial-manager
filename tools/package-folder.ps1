$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$packageJson = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$version = $packageJson.version
$distDir = Join-Path $root "dist"
$sourceDir = Join-Path $distDir "win-unpacked"
$folderName = "serial-notification-$version-folder"
$targetDir = Join-Path $distDir $folderName
$zipPath = Join-Path $distDir "$folderName.zip"

if (!(Test-Path -LiteralPath $sourceDir)) {
  throw "未找到构建输出目录：$sourceDir"
}

if (Test-Path -LiteralPath $targetDir) {
  Remove-Item -LiteralPath $targetDir -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Copy-Item -LiteralPath $sourceDir -Destination $targetDir -Recurse
Compress-Archive -LiteralPath $targetDir -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Folder build: $targetDir"
Write-Host "Zip package: $zipPath"
