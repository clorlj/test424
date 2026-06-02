param(
    [int]$Port = 8000,
    [string]$Root = (Get-Location).Path
)

$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host $prefix

$types = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".svg" = "image/svg+xml"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
        if ([string]::IsNullOrWhiteSpace($requestPath)) {
            $requestPath = "index.html"
        }

        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $requestPath))
        $rootPath = [System.IO.Path]::GetFullPath($Root)

        if (-not $fullPath.StartsWith($rootPath) -or -not [System.IO.File]::Exists($fullPath)) {
            $context.Response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        } else {
            $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
            $context.Response.ContentType = $types[$extension]
            if (-not $context.Response.ContentType) {
                $context.Response.ContentType = "application/octet-stream"
            }
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        }

        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.Close()
    }
} finally {
    $listener.Stop()
}
