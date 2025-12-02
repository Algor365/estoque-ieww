@echo off
echo [*] Verificando status do backdoor...
echo.

echo === PROCESSOS ===
tasklist | findstr /i "powershell" | findstr /v findstr

echo.
echo === CONEXOES ===
netstat -ano | findstr ":4444"

echo.
echo === STARTUP ===
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v WindowsSystemStudy 2>nul
if errorlevel 1 echo [-] Nao encontrado no registro

echo.
echo === TAREFAS AGENDADAS ===
schtasks /query /tn WindowsSystemStudy 2>nul
if errorlevel 1 echo [-] Tarefa nao encontrada

echo.
pause