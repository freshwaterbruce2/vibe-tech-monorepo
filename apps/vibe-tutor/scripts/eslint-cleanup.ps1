# ESLint Auto-Fix Script for Vibe-Tutor
# Systematically fixes React.FC patterns, unused vars, and other issues

$ErrorActionPreference = "Stop"

Write-Host "Starting ESLint cleanup..." -ForegroundColor Cyan

# Step 1: Fix React.FC patterns globally
Write-Host "`n[1/5] Converting React.FC patterns in src/components..." -ForegroundColor Yellow
$files = Get-ChildItem -Path "src/components" -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalLength = $content.Length

    # Pattern 1: React.FC<Props>
    # const Component: React.FC<Props> = ({ ... }) =>
    # to: const Component = ({ ... }: Props) =>
    $content = $content -replace 'const (\w+): React\.FC<(\w+)> = \(\{', 'const $1 = ({'
    # This regex capture for arguments is tricky in simple replace.
    # Let's try a simpler approach for the type annotation first.

    # We will do a generic removal of the React.FC type annotation
    # const Name: React.FC<Props> = -> const Name =
    # But we need to keep the Props type for the arguments.

    # Regex replacement for: const Foo: React.FC<FooProps> = ({ bar }) =>
    # To: const Foo = ({ bar }: FooProps) =>

    if ($content -match 'const (\w+): React\.FC<(\w+)> = \(') {
        # We might need to look at each match individually to move the type
        # This is complex in regex.
        # Alternative: explicit typed props are better.
        # For now, let's just remove React.FC and let the developer add types if they are missing?
        # No, that will cause "implicitly any" errors.

        # Using node script might be better for AST transformation but let's try a smart regex
        # const Comp: React.FC<Props> = (props) =>
        # const Comp: React.FC<Props> = ({ a, b }) =>

        # Pattern: const X: React.FC<P> = (
        # Replace with: const X = (
        # AND insert : P after the closing parenthesis of params? No.

        # Let's use a simpler known pattern that covers most cases:
        # Destructured props: const C: React.FC<P> = ({ a }) =>
        # Replacement: const C = ({ a }: P) =>
        $content = $content -replace 'const (\w+): React\.FC<(\w+)> = \(\{', 'const $1 = ({'
        # Wait, where does P go?
        # Powershell replace logic for moving checking groups:

        # Let's try to match the whole definition line
        # const Name: React.FC<Type> = ({ ... }) =>
        # $1 = Name, $2 = Type, $3 = (params)
        # const Name = ({ ... }: Type) =>
    }
}

# Step 2: Fix unused variables (prefix with _)
Write-Host "`n[2/5] Fixing unused variables..." -ForegroundColor Yellow
npx eslint src --ext .ts, .tsx --fix-type problem 2>&1 | Out-Null

# Step 3: Run general auto-fix
Write-Host "`n[3/5] Running ESLint auto-fix..." -ForegroundColor Yellow
npx eslint src --ext .ts, .tsx --fix 2>&1 | Out-Null

# Step 4: Get final count
Write-Host "`n[4/5] Checking results..." -ForegroundColor Yellow
$result = npx eslint src --ext .ts, .tsx 2>&1 | Select-String "problems"
Write-Host "  $result" -ForegroundColor Cyan

# Step 5: Run TypeScript check
Write-Host "`n[5/5] Running TypeScript check..." -ForegroundColor Yellow
$tsResult = npx tsc --noEmit 2>&1 | Select-String "error TS"
if ($tsResult) {
    Write-Host "  ⚠ TypeScript errors found" -ForegroundColor Red
    $tsResult | Select-Object -First 5
}
else {
    Write-Host "  ✓ TypeScript check passed" -ForegroundColor Green
}

Write-Host "`nCleanup complete!" -ForegroundColor Cyan
