$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$previousApi = $env:POPWAM_API_BASE_URL
$previousPublic = $env:POPWAM_PUBLIC_BASE_URL
try {
    $env:POPWAM_API_BASE_URL = 'https://popwam-auth-test-test.up.railway.app/'
    $env:POPWAM_PUBLIC_BASE_URL = 'https://popwam-public-test-test.up.railway.app/'
    Push-Location (Join-Path $repositoryRoot 'apps/android')
    try {
        & .\gradlew.bat :app:assembleDebug --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'TEST debug APK build failed.' }
        $config = Get-Content 'app/build/generated/source/buildConfig/debug/com/popwam/pop/BuildConfig.java' -Raw
        if (!$config.Contains($env:POPWAM_API_BASE_URL) -or !$config.Contains($env:POPWAM_PUBLIC_BASE_URL)) { throw 'Generated TEST BuildConfig does not match.' }
        $target = Join-Path $repositoryRoot 'apps/android/app/build/outputs/apk/debug/pop-auth-test-debug.apk'
        Copy-Item -LiteralPath 'app/build/outputs/apk/debug/app-debug.apk' -Destination $target -Force
        Get-Item -LiteralPath $target | Select-Object FullName, Length
        Get-FileHash -LiteralPath $target -Algorithm SHA256
    } finally { Pop-Location }
} finally {
    $env:POPWAM_API_BASE_URL = $previousApi
    $env:POPWAM_PUBLIC_BASE_URL = $previousPublic
}
