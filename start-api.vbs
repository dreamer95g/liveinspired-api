Set WshShell = CreateObject("WScript.Shell")

' 1. Iniciar Laragon silenciosamente
' Reemplaza la ruta si tu Laragon está instalado en otro lado
WshShell.Run "C:\laragon\laragon.exe", 0, False

' 2. Darle a Laragon 3 segundos para que levante MySQL y Apache/Nginx
WScript.Sleep 3000

' 3. Iniciar el Backend (API) silenciosamente
' Entramos a la carpeta y ejecutamos npm start
WshShell.Run "cmd.exe /c cd C:\Dev\liveinspired-api && npm start", 0, False