@echo off
echo ============================================
echo   DINO-RICHUP Firewall Setup
echo ============================================
echo.
echo This will add Windows Firewall rules to allow
echo friends to connect to your game on port 8000.
echo.
echo IMPORTANT: Run this as Administrator!
echo.

netsh advfirewall firewall add rule name="DINO-RICHUP Game (TCP 8000)" dir=in action=allow protocol=TCP localport=8000
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Firewall rule added for port 8000.
) else (
    echo.
    echo ERROR: Failed to add firewall rule.
    echo Make sure you right-clicked and selected "Run as administrator".
)

echo.
echo ============================================
echo   Friends on same WiFi can now connect at:
echo   http://YOUR_IP:8000
echo ============================================
echo.
pause
