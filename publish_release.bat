@echo off
setlocal EnableDelayedExpansion

echo  HH   HH   _   _  _____  __  __  ____   ____   ___  __  __ 
echo  HH   HH  ^| ^| ^| ^|^|  ___^|^|  \/  ^|^|  _ \ ^|  _ \ ^|_ _^| \ \/ / 
echo  HHHHHHH  ^| ^|_^| ^|^| ^|__  ^| ^|\/^| ^|^| ^| ^| ^|^| ^|_) ^| ^| ^|   \  /  
echo  HH   HH  ^|  _  ^|^|  __^| ^| ^|  ^| ^|^| ^|_^| ^|^|  _ ^<  ^| ^|   /  \  
echo  HH   HH  ^|_^| ^|_^|^|_____^|^|_^|  ^|_^|^|____/ ^|_^| \_\^|___^| /_/\_\ 
echo.
echo                       S O L U T I O N S
echo ==========================================================
echo.
echo Auto-Publishing a new release...
echo Please wait.
echo.

where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] GitHub CLI ^(gh^) is missing. Please install it from https://cli.github.com/
    pause
    exit /b 1
)

:: Fetch latest version and auto-increment
for /f "tokens=*" %%a in ('gh release view --json tagName --jq .tagName 2^>nul') do set LATEST_VERSION=%%a

if "!LATEST_VERSION!"=="" (
    set NEW_VERSION=v1.0.0
    echo No previous releases found. Starting at !NEW_VERSION!
) else (
    echo Latest release is !LATEST_VERSION!
    :: Strip the 'v'
    set "V_NUM=!LATEST_VERSION:~1!"
    for /f "tokens=1,2,3 delims=." %%a in ("!V_NUM!") do (
        set MAJOR=%%a
        set MINOR=%%b
        set PATCH=%%c
    )
    set /a PATCH+=1
    set NEW_VERSION=v!MAJOR!.!MINOR!.!PATCH!
    echo Auto-incremented to !NEW_VERSION!
)

echo.
echo Packaging folders...
powershell -Command "Compress-Archive -Path '.\amazon extension antigravity\*' -DestinationPath 'hemdrix-extension.zip' -Force"
powershell -Command "Compress-Archive -Path '.\kdp-book-writer\*' -DestinationPath 'kdp-book-writer.zip' -Force"

echo Uploading to GitHub...
gh release create !NEW_VERSION! "hemdrix-extension.zip" "kdp-book-writer.zip" --title "Hemdrix KDP Suite !NEW_VERSION!" --notes "Automated release via zero-touch publisher script."

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Release !NEW_VERSION! was published automatically!
) else (
    echo.
    echo [ERROR] Failed to publish. Check your gh authentication.
)

del hemdrix-extension.zip 2>nul
del kdp-book-writer.zip 2>nul

echo.
pause
