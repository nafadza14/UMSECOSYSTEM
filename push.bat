@echo off
cd /d "%~dp0"
echo ================================================
echo   Push UMS Ecosystem ke GitHub (SSH)
echo ================================================
echo.
git remote -v
echo.
git push -u origin main
echo.
echo ------------------------------------------------
echo Selesai. Jika ada error "rejected", jalankan push-force.bat
echo Tekan tombol apa saja untuk menutup.
pause >nul
