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
echo Welcome to the Hemdrix KDP Suite Installer!
echo.

:: 1. Check for opencode desktop app
echo [1/3] Checking for Opencode desktop app...
set SKIPPED_OPENCODE=0
where opencode >nul 2>nul
if %errorlevel% neq 0 (
    echo       Opencode desktop app is not in your system PATH.
    set /p INSTALL_OPENCODE="      Do you want to install it now? (Y/N): "
    if /i "!INSTALL_OPENCODE!"=="Y" (
        echo       Installing Opencode...
        winget install --id "opencode" --exact --accept-package-agreements --accept-source-agreements
        if !errorlevel! equ 0 (
            echo       Opencode installed successfully.
        ) else (
            echo       [Warning] Installation for Opencode failed or requires manual intervention. Proceeding anyway...
            set SKIPPED_OPENCODE=1
        )
    ) else (
        echo       Skipping Opencode installation...
        set SKIPPED_OPENCODE=1
    )
) else (
    echo       Opencode is already installed.
)
echo.

:: 2. Download and extract the latest release
echo [2/3] Downloading tools from Hemdrix via direct link...
set "REPO=Mubaraq1703/KDP"
set "URL_EXT=https://github.com/!REPO!/releases/latest/download/hemdrix-extension.zip"
set "URL_KDP=https://github.com/!REPO!/releases/latest/download/kdp-book-writer.zip"

:: Force TLS 1.2 for older Windows systems to prevent download failures
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!URL_EXT!' -OutFile 'hemdrix-extension.zip'"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!URL_KDP!' -OutFile 'kdp-book-writer.zip'"

if not exist "kdp-book-writer.zip" (
    echo       [ERROR] Failed to download release from direct links.
    echo       Ensure your GitHub repository is PUBLIC and a release exists!
    pause
    exit /b 1
)

echo.
echo [3/3] Extracting downloaded files...
if exist "kdp-book-writer-temp" rmdir /S /Q "kdp-book-writer-temp"
if exist "hemdrix-extension-temp" rmdir /S /Q "hemdrix-extension-temp"

powershell -Command "Expand-Archive -Path 'kdp-book-writer.zip' -DestinationPath 'kdp-book-writer-temp' -Force"
powershell -Command "Expand-Archive -Path 'hemdrix-extension.zip' -DestinationPath 'hemdrix-extension-temp' -Force"

echo       Moving kdp-book-writer to %USERPROFILE%\.agents\skills\ directory...
if exist "%USERPROFILE%\.agents\skills\kdp-book-writer" (
    echo       [Info] Existing 'kdp-book-writer' skill found. Replacing it...
    rmdir /S /Q "%USERPROFILE%\.agents\skills\kdp-book-writer"
)
if not exist "%USERPROFILE%\.agents\skills\kdp-book-writer" mkdir "%USERPROFILE%\.agents\skills\kdp-book-writer"
xcopy /E /I /Y "kdp-book-writer-temp\*" "%USERPROFILE%\.agents\skills\kdp-book-writer\" >nul

:: Cleanup
echo       Cleaning up downloaded zip files...
rmdir /S /Q kdp-book-writer-temp
del /f /q kdp-book-writer.zip 2>nul
del /f /q hemdrix-extension.zip 2>nul

echo       Extension files extracted to 'hemdrix-extension-temp'.
echo.

echo ==========================================================
echo Installation complete!
echo ==========================================================
echo.

if "!SKIPPED_OPENCODE!"=="1" (
    echo [ACTION REQUIRED] Opencode Installation
    echo You skipped the automatic installation of Opencode, or it failed.
    echo Please download and install it manually from:
    echo https://opencode.ai/download/stable/windows-x64-nsis
    echo.
)

echo [HOW TO USE KDP BOOK WRITER]
echo 1. Open the Opencode app and create a new project.
echo 2. Type the following command in the chat:
echo    /kdp-book-writer [prompt]
echo    ^(e.g., /kdp-book-writer write a book on japan travel guide^)
echo.
echo [HOW TO LOAD THE BROWSER EXTENSION]
echo 1. Open your browser's extension page:
echo    - Chrome: chrome://extensions/
echo    - Edge:   edge://extensions/
echo 2. Turn on 'Developer mode' ^(usually in the top right corner^).
echo 3. Click the 'Load unpacked' button.
echo 4. Select the following folder location:
echo    %CD%\hemdrix-extension-temp
echo.
echo ==========================================================
pause
