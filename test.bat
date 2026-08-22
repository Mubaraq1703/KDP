@echo on  
setlocal EnableDelayedExpansion

echo  _   _  _____  __  __  ____   ____   ___  __  __ 
echo ^| ^| ^| ^|^|  ___^|^|  \/  ^|^|  _ \ ^|  _ \ ^|_ _^| \ \/ / 
echo ^| ^|_^| ^|^| ^|__  ^| ^|\/^| ^|^| ^| ^| ^|^| ^|_) ^| ^| ^|   \  /  
echo ^|  _  ^|^|  __^| ^| ^|  ^| ^|^| ^|_^| ^|^|  _ ^<  ^| ^|   /  \  
echo ^|_^| ^|_^|^|_____^|^|_^|  ^|_^|^|____/ ^|_^| \_\^|___^| /_/\_\ 
echo.
echo           S O L U T I O N S
echo =================================================
echo.
echo Welcome to the Hemdrix KDP Suite Release Publisher!
echo.

:: Check if GitHub CLI (gh) is installed
where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/ to use this script.
    pause
    exit /b 1
)

:: Get the latest release version
echo Checking for the latest GitHub release...
for /f "tokens=*" %%a in ('gh release view --json tagName --jq .tagName 2^>nul') do set LATEST_VERSION=%%a

if "!LATEST_VERSION!"=="" (
    echo No previous releases found in this repository.
    set /p NEW_VERSION="Enter the initial version number (e.g., v1.0.0): "
) else (
    echo The latest release is: !LATEST_VERSION!
    set /p NEW_VERSION="Enter the new version number to publish (e.g., v1.0.1): "
)

if "!NEW_VERSION!"=="" (
    echo [ERROR] Version cannot be empty.
    pause
    exit /b 1
)

echo.
echo Packaging the "amazon extension antigravity" folder...
powershell -Command "Compress-Archive -Path '.\amazon extension antigravity\*' -DestinationPath 'hemdrix-extension.zip' -Force"

echo Packaging the "kdp-book-writer" folder...
powershell -Command "Compress-Archive -Path '.\kdp-book-writer\*' -DestinationPath 'kdp-book-writer.zip' -Force"

echo.
echo Creating GitHub Release !NEW_VERSION!...
gh release create !NEW_VERSION! "hemdrix-extension.zip" "kdp-book-writer.zip" --title "Hemdrix KDP Suite !NEW_VERSION!" --notes "Automated release via publisher script."

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Release !NEW_VERSION! was published successfully!
) else (
    echo.
    echo [ERROR] Failed to create the release. Make sure you are authenticated with 'gh auth login'.
)

:: Cleanup zipped files
del hemdrix-extension.zip 2>nul
del kdp-book-writer.zip 2>nul

echo.
pause
