# Make a web-sized copy of an image (keeps proportions, never enlarges).
# Usage: powershell -File tools/resize-image.ps1 -In <src> -Out <dest> -Max 320
param([string]$In, [string]$Out, [int]$Max = 320)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
# a phone photo that is stored sideways: turn it the right way up (EXIF orientation)
if ($src.PropertyIdList -contains 274) { switch ($src.GetPropertyItem(274).Value[0]) { 3 { $src.RotateFlip('Rotate180FlipNone') } 6 { $src.RotateFlip('Rotate90FlipNone') } 8 { $src.RotateFlip('Rotate270FlipNone') } } }
$scale = [Math]::Min(1.0, [Math]::Min($Max / $src.Width, $Max / $src.Height))
$w = [int][Math]::Round($src.Width * $scale); $h = [int][Math]::Round($src.Height * $scale)
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$ext = [System.IO.Path]::GetExtension($Out).ToLower()
if ($ext -ne '.png') { $g.Clear([System.Drawing.Color]::White) }
$g.DrawImage($src, 0, 0, $w, $h)
$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
if ($ext -eq '.png') { $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png) }
else {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $p = New-Object System.Drawing.Imaging.EncoderParameters 1
  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 85L
  $bmp.Save($Out, $codec, $p)
}
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
Write-Output "$Out ${w}x${h}"
