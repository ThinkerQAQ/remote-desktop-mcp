' No console window, no credentials passed on command line.
Option Explicit
Dim shell, fso, root, node, entry, cmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
node = root & "\bin\node.exe"
entry = root & "\scripts\runtime.mjs"
If Not fso.FileExists(node) Or Not fso.FileExists(entry) Then
    WScript.Quit 1
End If
shell.CurrentDirectory = root
cmd = Chr(34) & node & Chr(34) & " " & Chr(34) & entry & Chr(34) & " run"
WScript.Quit shell.Run(cmd, 0, True)
