# 사용법: PowerShell에서 이 파일이 있는 폴더에서 실행
# .\curl_test.ps1

 = '<엔드포인트>'
     = '{"symbol":"005930","from":"20250101"}'

curl.exe -s -X POST  
  -H "Content-Type: application/json" 
  -d  | Out-String | Write-Host
