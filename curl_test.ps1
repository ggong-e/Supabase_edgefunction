# 사용법: PowerShell에서 이 파일이 있는 폴더에서 실행
# .\curl_test.ps1

$endpoint = 'https://avlvrnxunawsuhekjojt.supabase.co/functions/v1/kis-test'
$body     = '{"symbol":"005930","from":"20250101"}'

curl.exe -s -X POST $endpoint `
  -H "Content-Type: application/json" `
  -d $body | Out-String | Write-Host

