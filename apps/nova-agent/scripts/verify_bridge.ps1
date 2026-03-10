$ErrorActionPreference = "Stop"

function Test-Endpoint {
  param($Uri, $Method = "Get", $Body = $null)
  try {
    Write-Host "Testing $Method $Uri..." -NoNewline
    $params = @{
      Uri    = $Uri
      Method = $Method
    }
    if ($Body) {
      $params.Body = $Body
      $params.ContentType = "application/json"
    }

    $response = Invoke-RestMethod @params
    Write-Host " OK" -ForegroundColor Green
    return $response
  }
  catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      Write-Host "Response Body: $($reader.ReadToEnd())"
    }
    return $null
  }
}

Write-Host "`n--- Verifying Nova Mobile Bridge (Axum) ---`n"

# 1. Test Status
$status = Test-Endpoint -Uri "http://localhost:3000/status"
if ($status) {
  Write-Host "Status: $($status.status)"
  Write-Host "Version: $($status.version)"
  Write-Host "Ready: $($status.ready)"
}

# 2. Test Chat
$chatBody = @{
  message    = "Hello from Axum Bridge Verification"
  project_id = "verification-test"
} | ConvertTo-Json

$chat = Test-Endpoint -Uri "http://localhost:3000/chat" -Method Post -Body $chatBody
if ($chat) {
  Write-Host "Chat Response: $($chat.content)"
}

Write-Host "`n--- Verification Complete ---"
