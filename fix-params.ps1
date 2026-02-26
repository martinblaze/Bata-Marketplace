$files = Get-ChildItem -Path "app" -Recurse -Filter "page.tsx"

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    $changed = $false

    # ── Pattern 1: { params }: { params: { id: string } }
    if ($content -match 'params \}: \{ params: \{ id: string \}') {
        $content = $content -replace 'params \}: \{ params: \{ id: string \} \}', 'params }: { params: Promise<{ id: string }> }'
        $changed = $true
    }

    # ── Pattern 2: { params }: { params: { sellerId: string } }
    if ($content -match 'params \}: \{ params: \{ sellerId: string \}') {
        $content = $content -replace 'params \}: \{ params: \{ sellerId: string \} \}', 'params }: { params: Promise<{ sellerId: string }> }'
        $changed = $true
    }

    # ── Pattern 3: { params }: { params: { productId: string } }
    if ($content -match 'params \}: \{ params: \{ productId: string \}') {
        $content = $content -replace 'params \}: \{ params: \{ productId: string \} \}', 'params }: { params: Promise<{ productId: string }> }'
        $changed = $true
    }

    # ── For each file that had a params type change, also add the await line
    # inside the function body — inject after the opening brace of the function

    # Handle id
    if ($content -match 'Promise<\{ id: string \}>' -and $content -notmatch 'const \{ id \} = await params') {
        $content = $content -replace '(export default async function \w+\([^)]+\)\s*\{)', "`$1`n  const { id } = await params"
        $changed = $true
    }

    # Handle sellerId
    if ($content -match 'Promise<\{ sellerId: string \}>' -and $content -notmatch 'const \{ sellerId \} = await params') {
        $content = $content -replace '(export default async function \w+\([^)]+\)\s*\{)', "`$1`n  const { sellerId } = await params"
        $changed = $true
    }

    # Handle productId
    if ($content -match 'Promise<\{ productId: string \}>' -and $content -notmatch 'const \{ productId \} = await params') {
        $content = $content -replace '(export default async function \w+\([^)]+\)\s*\{)', "`$1`n  const { productId } = await params"
        $changed = $true
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "FIXED: $($file.FullName)" -ForegroundColor Green
    } else {
        Write-Host "SKIPPED (no match): $($file.FullName)" -ForegroundColor Gray
    }
}

Write-Host "`nDone! Now manually verify each FIXED file above." -ForegroundColor Cyan