$file = "C:\Users\Esteb\Desktop\Pagina web\workspace-2646844b-cd7a-4b7d-8dc5-7e1e9808403c (1)\src\app\(dashboard)\dashboard\admin\page.tsx"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Fix trigger
$c = $c -replace [regex]::Escape('          <TabsTrigger value="tasks" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">'), ('              <TabsTrigger value="meetings" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">' + "`n" + '                <Video className="h-4 w-4" />Reuniones' + "`n" + '              </TabsTrigger>' + "`n" + '          <TabsTrigger value="tasks" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">')

# Fix TabsContent
$lines = $c -split "`n"
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "Tasks tab .sustituye") {
        $orig = $lines[$i].TrimEnd("`r")
        $block = "        {/* Reuniones tab */}`n        {isAdmin && (`n          <TabsContent value=`"meetings`" className=`"mt-4`">`n            <MeetingsTab />`n          </TabsContent>`n        )}`n`n" + $orig
        $c = $c.Replace($orig, $block)
        break
    }
}

# Fix Video import
if (-not ($c -match '\bVideo\b')) {
    $c = $c.Replace('  Shield,', "  Shield,`n  Video,")
}

[System.IO.File]::WriteAllText($file, $c, [System.Text.UTF8Encoding]::new($false))
Write-Host "meetings trigger: $(([bool]($c -match ''value="meetings"'')))"
Write-Host "meetings content: $(([bool]($c -match ''TabsContent value="meetings"'')))"
Write-Host "Video import: $(([bool]($c -match ''\bVideo\b'')))"
Write-Host "DONE"