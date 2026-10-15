# Render demo-data/audio/scripts.json to 16 kHz mono WAV with the Windows Japanese voice.
# Run from Multi-worker after: py tools/build_demo_data.py --scripts
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$root = Split-Path -Parent $PSScriptRoot
$audio = Join-Path $root 'demo-data\audio'
$items = Get-Content -Raw -Encoding UTF8 (Join-Path $audio 'scripts.json') | ConvertFrom-Json
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($item in $items) {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $out = Join-Path $audio ($item.name + '.wav')
  $synth.SetOutputToWaveFile($out, $format)
  $synth.SpeakSsml($item.ssml)
  $synth.Dispose()
  Write-Output ('{0}: {1:N0} bytes' -f $item.name, (Get-Item $out).Length)
}
