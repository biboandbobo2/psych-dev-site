Param(
  [string]$Project = "psych-dev-site-prod",
  [int]$KeepLastN = 2,
  [int]$TtlDays = 14,
  [switch]$Execute
)

if ($KeepLastN -lt 1) {
  throw "KeepLastN must be >= 1"
}
if ($TtlDays -lt 0) {
  throw "TtlDays must be >= 0"
}

$Now = [DateTime]::UtcNow

function Get-Json {
  param([string[]]$Args)
  $output = & $Args
  if (-not $output) { return @() }
  return $output | ConvertFrom-Json
}

$services = Get-Json @("gcloud","run","services","list","--project",$Project,"--platform=managed","--format=json")
if ($services.Count -eq 0) {
  Write-Host "No Cloud Run services found."
  exit 0
}

Write-Host "Project: $Project"
Write-Host "KEEP_LAST_N=$KeepLastN, TTL_DAYS=$TtlDays, EXECUTE=$($Execute.IsPresent)"

$allCandidates = @()

foreach ($svc in $services) {
  $name = $svc.metadata.name
  $region = $svc.metadata.labels."cloud.googleapis.com/location"
  if (-not $name -or -not $region) {
    Write-Host "Skip service with missing name/region: name=$name region=$region"
    continue
  }

  $desc = Get-Json @("gcloud","run","services","describe",$name,"--project",$Project,"--platform=managed","--region",$region,"--format=json")
  $revs = Get-Json @("gcloud","run","revisions","list","--service",$name,"--project",$Project,"--region",$region,"--format=json")

  $trafficMap = @{}
  $latestReady = $desc.status.latestReadyRevisionName
  foreach ($t in ($desc.status.traffic | ForEach-Object { $_ })) {
    $rev = $t.revisionName
    if (-not $rev -and $t.latestRevision -and $latestReady) {
      $rev = $latestReady
    }
    if ($rev) {
      $trafficMap[$rev] = [int]$t.percent
    }
  }

  $rows = @()
  foreach ($r in $revs) {
    $revName = $r.metadata.name
    $created = [DateTime]::Parse($r.metadata.creationTimestamp).ToUniversalTime()
    $traffic = 0
    if ($trafficMap.ContainsKey($revName)) {
      $traffic = $trafficMap[$revName]
    }
    $rows += [pscustomobject]@{
      Revision = $revName
      Created = $created
      Traffic = $traffic
    }
  }

  $keep = $rows | Sort-Object Created -Descending | Select-Object -First $KeepLastN | ForEach-Object { $_.Revision }
  $keepSet = @{}
  foreach ($k in $keep) { $keepSet[$k] = $true }

  $candidates = @()
  foreach ($r in $rows) {
    if ($keepSet.ContainsKey($r.Revision)) { continue }
    if ($r.Traffic -gt 0) { continue }
    $ageDays = ($Now - $r.Created).TotalDays
    if ($ageDays -lt $TtlDays) { continue }
    $candidates += $r
  }

  Write-Host "Service $name ($region) candidates: $($candidates.Count)"
  foreach ($c in ($candidates | Sort-Object Created)) {
    Write-Host "  - $($c.Revision) | created=$($c.Created.ToString('s'))Z | traffic=$($c.Traffic)"
  }

  foreach ($c in $candidates) {
    $allCandidates += [pscustomobject]@{ Service=$name; Region=$region; Revision=$c.Revision }
  }
}

if ($allCandidates.Count -eq 0) {
  Write-Host "No candidates to delete."
  exit 0
}

if (-not $Execute.IsPresent) {
  Write-Host "DRY_RUN: no deletions executed."
  exit 0
}

foreach ($c in $allCandidates) {
  Write-Host "Deleting revision $($c.Revision) (service $($c.Service), region $($c.Region))"
  & gcloud run revisions delete $c.Revision --region $c.Region --project $Project --platform=managed --quiet
}

Write-Host "Deletion run completed."
