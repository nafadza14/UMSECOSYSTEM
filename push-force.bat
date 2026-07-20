@echo off
cd /d "%~dp0"
echo PUSH --force ke origin/main
git push -u origin main --force
echo.
pause >nul
