export const prepareCommand = String.raw`$ErrorActionPreference = 'Stop'
$root = 'C:\LocalLLM\Qwen3.8'
foreach ($folder in @('bin', 'models', 'downloads')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $root $folder) | Out-Null
}
nvidia-smi`;

export const runtimeCommand = String.raw`# この関数は次のモデル取得でも使います。同じPowerShellで続けてください。
function Get-VerifiedFile {
    param([string]$Url, [string]$Path, [string]$Sha256)
    if ((Test-Path -LiteralPath $Path) -and
        ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -eq $Sha256)) {
        Write-Host "確認済み: $Path"
        return
    }
    curl.exe --fail --location --retry 3 --continue-at - --output $Path $Url
    if ($LASTEXITCODE -ne 0) { throw 'ダウンロード失敗。同じコマンドで再開できます。' }
    if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -ne $Sha256) {
        throw "SHA256不一致。対象ファイルを削除して取り直してください: $Path"
    }
}

$release = 'https://github.com/ggml-org/llama.cpp/releases/download/b11960'
$binary = Join-Path $root 'downloads\llama-b11960-bin-win-cuda-12.4-x64.zip'
$runtime = Join-Path $root 'downloads\cudart-llama-bin-win-cuda-12.4-x64.zip'

Get-VerifiedFile -Url "$release/llama-b11960-bin-win-cuda-12.4-x64.zip" -Path $binary -Sha256 '8d9d819261de10cc2f03921b8b79c779c5c458e21edb60c170ee30a7d462d684'
Get-VerifiedFile -Url "$release/cudart-llama-bin-win-cuda-12.4-x64.zip" -Path $runtime -Sha256 '8c79a9b226de4b3cacfd1f83d24f962d0773be79f1e7b75c6af4ded7e32ae1d6'

Expand-Archive -LiteralPath $binary -DestinationPath (Join-Path $root 'bin') -Force
Expand-Archive -LiteralPath $runtime -DestinationPath (Join-Path $root 'bin') -Force
& (Join-Path $root 'bin\llama-server.exe') --version`;

export const modelCommand = String.raw`$modelUrl = 'https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/resolve/4ca720788d1e01f1bff70c033e0d0028fd02e502/Qwen3.8-27B-UD-Q4_K_M.gguf?download=true'
$modelPath = Join-Path $root 'models\Qwen3.8-27B-UD-Q4_K_M.gguf'
Get-VerifiedFile -Url $modelUrl -Path $modelPath -Sha256 '322e194ff79741c7baa497c240f677f54b201b0efab44ca8e50f122b39123482'`;

export const startCommand = String.raw`@echo off
cd /d "%~dp0"
bin\llama-server.exe ^
  --model "models\Qwen3.8-27B-UD-Q4_K_M.gguf" ^
  --alias qwen3.8-local ^
  --host 127.0.0.1 --port 8080 --cors-origins localhost ^
  --ctx-size 8192 --parallel 1 ^
  --n-gpu-layers auto --fit on --fit-target 1024 ^
  --flash-attn auto --batch-size 512 --ubatch-size 128 ^
  --load-mode none --cache-ram 1024 ^
  --jinja --reasoning off ^
  --temp 0.7 --top-p 0.8 --top-k 20 --min-p 0
if errorlevel 1 pause`;

export const startMtpCommand = startCommand.replace(
  '  --jinja --reasoning off ^',
  '  --spec-type draft-mtp --spec-draft-n-max 2 --spec-draft-ngl 0 ^\n  --jinja --reasoning off ^'
);

export const saveLaunchersCommand = String.raw`$ErrorActionPreference = 'Stop'
$root = 'C:\LocalLLM\Qwen3.8'

# 手動でダウンロードした場合も、この手順から実行できます。
$requiredFiles = @(
    'bin\llama-server.exe',
    'bin\ggml-cuda.dll',
    'models\Qwen3.8-27B-UD-Q4_K_M.gguf'
)
foreach ($relativePath in $requiredFiles) {
    $filePath = Join-Path $root $relativePath
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        throw "ファイルが見つかりません: $filePath"
    }
}

# 起動ファイルを2つ作成します。実行するのはどちらか1つです。
Set-Content -LiteralPath (Join-Path $root 'Start-Qwen.cmd') -Encoding Ascii -Value @'
${startCommand}
'@

Set-Content -LiteralPath (Join-Path $root 'Start-Qwen-MTP.cmd') -Encoding Ascii -Value @'
${startMtpCommand}
'@

Write-Host "起動ファイルを作成しました: $root"
Start-Process explorer.exe -ArgumentList $root`;
