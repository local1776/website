# Resize many images in one PowerShell process. Input: a text file with lines "<src>|<dest>|<max>".
# Skips a destination that already exists and is newer than its source.
param([string]$List)
Add-Type -AssemblyName System.Drawing
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
foreach ($line in Get-Content -Encoding UTF8 $List) {
  if (-not $line.Trim()) { continue }
  $In, $Out, $Max = $line.Split('|'); $Max = [int]$Max
  if ((Test-Path -LiteralPath $Out) -and ((Get-Item -LiteralPath $Out).LastWriteTime -gt (Get-Item -LiteralPath $In).LastWriteTime)) { continue }
  try {
    $src = [System.Drawing.Image]::FromFile($In)
    $scale = [Math]::Min(1.0, [Math]::Min($Max / $src.Width, $Max / $src.Height))
    $w = [Math]::Max(1, [int][Math]::Round($src.Width * $scale)); $h = [Math]::Max(1, [int][Math]::Round($src.Height * $scale))
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($src, 0, 0, $w, $h)
    $dir = Split-Path -Parent $Out
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
    $p = New-Object System.Drawing.Imaging.EncoderParameters 1
    $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L
    $bmp.Save($Out, $jpeg, $p)
    $g.Dispose(); $bmp.Dispose(); $src.Dispose()
    Write-Output "ok   $Out ${w}x${h}"
  } catch { Write-Output "FAIL $In : $($_.Exception.Message)" }
}
