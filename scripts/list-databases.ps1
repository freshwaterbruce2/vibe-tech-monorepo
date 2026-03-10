# List all database files in D:\databases with metadata

Get-ChildItem -Path "D:\databases" -Filter "*.db" | Select-Object Name, LastWriteTime, @{Name='SizeMB';Expression={[math]::Round($_.Length/1MB,2)}} | Sort-Object LastWriteTime | Format-Table -AutoSize
