@echo off
setlocal
echo ==========================================================
echo       Kill-My-Port Uninstaller for Windows                
echo ==========================================================
echo.

echo 1. Stopping any running Kill-My-Port processes...
taskkill /IM electron.exe /F 2>nul || echo    (none running)
echo.

echo 2. Removing Startup shortcut...
set "STARTUP_LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\KillMyPort.lnk"
if exist "%STARTUP_LINK%" (
    del /f /q "%STARTUP_LINK%"
    echo    Removed: %STARTUP_LINK%
)

echo 3. Removing Start Menu shortcut...
set "STARTMENU_LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Kill My Port.lnk"
if exist "%STARTMENU_LINK%" (
    del /f /q "%STARTMENU_LINK%"
    echo    Removed: %STARTMENU_LINK%
)

echo.
echo ==========================================================
echo  Uninstall complete!                                       
echo  Kill-My-Port will no longer auto-start on boot.          
echo  Run setup.bat anytime to reinstall.                      
echo ==========================================================
pause
endlocal
