# Crop a screenshot: powershell -File tools/crop.ps1 -in a.png -out b.png -x 0 -y 0 -w 800 -h 600
param([string]$in,[string]$out,[int]$x,[int]$y,[int]$w,[int]$h)
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile((Resolve-Path $in))
if ($y + $h -gt $b.Height) { $h = $b.Height - $y }
$b.Clone((New-Object System.Drawing.Rectangle $x,$y,$w,$h),$b.PixelFormat).Save($out)
$b.Dispose()
