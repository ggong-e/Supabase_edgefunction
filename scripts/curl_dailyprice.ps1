$url = "https://<PROJECT>.supabase.co/functions/v1/kis-0_dailyprice-updater"
$headers = @{
    "Content-Type" = "application/json"
}
$body = @{
    from = "20250703"
    to = "20250814"
    sleepMsBetweenCalls = 100
    maxRowsPerUpsert = 800
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body

