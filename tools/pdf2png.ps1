# Render every page of a PDF to PNG with Windows' own PDF engine, to look at a PDF without opening it.
#   powershell -File tools/pdf2png.ps1 -in file.pdf -outPrefix previews/x/page -width 1000
param([string]$in,[string]$outPrefix,[int]$width=900)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskA = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Await($op, [Type]$t) { $m = $asTask.MakeGenericMethod($t); $task = $m.Invoke($null, @($op)); $task.Wait(); $task.Result }
function AwaitA($op) { $task = $asTaskA.Invoke($null, @($op)); $task.Wait() }
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $in).Path)) ([Windows.Storage.StorageFile])
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
for ($i = 0; $i -lt $doc.PageCount; $i++) {
  $page = $doc.GetPage($i)
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = $width
  $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AwaitA ($page.RenderToStreamAsync($stream, $opts))
  $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream.GetInputStreamAt(0))
  $fs = [System.IO.File]::Create("$outPrefix-$($i+1).png"); $net.CopyTo($fs); $fs.Close()
  Write-Output "$outPrefix-$($i+1).png"
}
Write-Output "pages: $($doc.PageCount)"
