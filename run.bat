@echo off
if "%1" == "" goto prompt
call node ./index %1
goto eof

:prompt
set /p fileURL="Provide a remote URL to download from: "
call node ./index %fileURL%

:eof
pause