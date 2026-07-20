@echo off
cd /d "%~dp0"
echo ==================================================
echo   Membuat TimbangLiveSync.exe (butuh Python + internet)
echo ==================================================
echo.

REM 1. Pasang tools yang diperlukan
python -m pip install --upgrade pip
python -m pip install pyinstaller pyodbc requests

REM 2. Compile agent.py + reader.py jadi satu .exe
pyinstaller --onefile --name TimbangLiveSync --hidden-import pyodbc agent.py

echo.
echo ==================================================
echo  SELESAI.
echo  File .exe ada di:  dist\TimbangLiveSync.exe
echo.
echo  Cara pakai:
echo   1. Salin "config.ini" ke folder "dist" (sebelah .exe)
echo   2. Set variabel:  setx SUPABASE_SERVICE_KEY "isi_service_role_key"
echo   3. Jalankan:  dist\TimbangLiveSync.exe
echo ==================================================
pause
