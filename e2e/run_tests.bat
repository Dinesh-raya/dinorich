@echo off
REM Run E2E tests using Python 3.13 (hermes-agent venv greenlet binary is incompatible)
set PYTHON=C:\Users\dines\AppData\Local\Programs\Python\Python313\python.exe

echo Using Python:
%PYTHON% --version
echo Running E2E tests...

%PYTHON% -m pytest e2e\ -v --timeout=120 %*
