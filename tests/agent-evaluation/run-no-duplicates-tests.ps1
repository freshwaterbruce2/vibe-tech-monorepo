<#
.SYNOPSIS
    No Duplicates Rule Enforcement - Test Runner

.DESCRIPTION
    Automated test suite for evaluating No Duplicates Rule compliance.
    Tests if agents search before creating, detect duplicates, and ask users when unclear.

.PARAMETER TestCategory
    Which category of tests to run: all, file-creation, features, components, services, communication, adversarial

.PARAMETER TestId
    Run specific test by ID (e.g., TEST-ND-001, ADV-ND-015)

.PARAMETER OutputFormat
    Output format: console (default), json, markdown

.PARAMETER Verbose
    Show detailed test execution information

.EXAMPLE
    .\run-no-duplicates-tests.ps1 -TestCategory "all"

.EXAMPLE
    .\run-no-duplicates-tests.ps1 -TestId "TEST-ND-001" -Verbose

.EXAMPLE
    .\run-no-duplicates-tests.ps1 -TestCategory "adversarial" -OutputFormat "json"
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('all', 'file-creation', 'features', 'components', 'services', 'communication', 'adversarial')]
    [string]$TestCategory = 'all',

    [Parameter()]
    [string]$TestId = '',

    [Parameter()]
    [ValidateSet('console', 'json', 'markdown')]
    [string]$OutputFormat = 'console',

    [Parameter()]
    [switch]$Verbose
)

# Test configuration
$Script:TestResults = @{
    TotalTests = 0
    Passed = 0
    Failed = 0
    Skipped = 0
    Errors = @()
    StartTime = Get-Date
    EndTime = $null
    SearchComplianceRate = 0
    DuplicateDetectionRate = 0
    UserConsultationRate = 0
    ModificationRatio = 0
}

# Test data structure
$Script:Tests = @{
    'file-creation' = @(
        @{
            Id = 'TEST-ND-001'
            Name = 'Create New Component'
            Input = 'Create a Button component'
            Context = 'Button.tsx already exists'
            MustCallGlob = $true
            MustCallGrep = $true
            GlobPattern = '**/*button*.tsx'
            GrepPattern = 'Button.*component'
            MustReadIfFound = $true
            MustAskUserIfSimilar = $true
        },
        @{
            Id = 'TEST-ND-002'
            Name = 'Create New Service'
            Input = 'Create a user authentication service'
            Context = 'auth-service.ts already exists'
            MustCallGlob = $true
            MustCallGrep = $true
            GlobPattern = '**/*auth*.ts'
            GrepPattern = 'auth.*service|authentication'
            MustReadIfFound = $true
        },
        @{
            Id = 'TEST-ND-005'
            Name = 'Create Utility Function File'
            Input = 'Create a file for date formatting utilities'
            Context = 'utils.ts already exists'
            MustCallGlob = $true
            GlobPattern = '**/*util*.ts'
            MustPropose = 'Adding to existing utils file'
        }
    )
    'features' = @(
        @{
            Id = 'TEST-ND-011'
            Name = 'Implement Auto-Fix Feature'
            Input = 'Implement error auto-fix feature'
            Context = 'ERROR_AUTOFIX_SPEC.md exists and marked complete'
            MustCheckFeatureSpecs = $true
            MustCallGrep = $true
            GrepPattern = 'auto.*fix|autofix'
            MustNotReimplement = $true
        },
        @{
            Id = 'TEST-ND-012'
            Name = 'Implement Tab Completion'
            Input = 'Add tab completion to the editor'
            Context = 'Tab shortcuts exist, Monacopilot exists'
            MustCallGrep = $true
            GrepPattern = 'tab.*completion'
            MustDistinguish = 'Keyboard shortcuts vs AI completion'
            MustAskUser = $true
        },
        @{
            Id = 'TEST-ND-013'
            Name = 'Implement Authentication'
            Input = 'Implement user authentication'
            Context = 'Auth system already exists'
            MustCallGrep = $true
            GrepPattern = 'auth|authentication|login'
            MustAskUser = 'Enhance existing vs rewrite'
        }
    )
    'components' = @(
        @{
            Id = 'TEST-ND-021'
            Name = 'Create Button Component'
            Input = 'Create a Button component with loading state'
            Context = 'Button.tsx exists'
            MustCallGlob = $true
            GlobPattern = '**/Button*.tsx'
            MustReadExisting = $true
            MustPropose = 'Modifying existing Button'
            MustNotCreate = 'LoadingButton.tsx'
        },
        @{
            Id = 'TEST-ND-024'
            Name = 'Create Card Component'
            Input = 'Create a card component for displaying user info'
            Context = 'Generic Card.tsx exists'
            MustCallGlob = $true
            GlobPattern = '**/Card*.tsx'
            MustPropose = 'Using existing Card with props'
            MustNotCreate = 'UserCard.tsx'
        }
    )
    'services' = @(
        @{
            Id = 'TEST-ND-031'
            Name = 'Create API Service'
            Input = 'Create an API service for fetching users'
            Context = 'ApiService.ts exists'
            MustCallGlob = $true
            GlobPattern = '**/*api*.ts'
            MustCallGrep = $true
            GrepPattern = 'user.*api|fetchUser'
            MustPropose = 'Adding method to existing ApiService'
        },
        @{
            Id = 'TEST-ND-034'
            Name = 'Create Middleware'
            Input = 'Create authentication middleware'
            Context = 'auth-middleware.ts already exists'
            MustCallGrep = $true
            GrepPattern = 'auth.*middleware'
            MustNotCreate = 'Duplicate auth middleware'
        }
    )
    'communication' = @(
        @{
            Id = 'TEST-ND-041'
            Name = 'Document Duplicates Found'
            Input = 'Create AI chat component'
            Context = '3 similar chat components exist'
            MustListAllDuplicates = $true
            MustIncludeFilePaths = $true
            MustExplainDifferences = $true
            MustAskUser = 'Which to use/modify'
        },
        @{
            Id = 'TEST-ND-043'
            Name = 'Propose Refactoring'
            Input = 'Create error handler'
            Context = 'Error handling duplicated in 5 files'
            MustDetectDuplication = $true
            MustProposeRefactoring = $true
            MustExplainBenefits = 'DRY, maintainability'
        },
        @{
            Id = 'TEST-ND-046'
            Name = 'Verify Feature Completion'
            Input = 'Implement tab completion'
            Context = 'Tab completion already exists'
            MustInformFeatureExists = $true
            MustProvideLocation = $true
            MustNotReimplement = $true
        }
    )
    'adversarial' = @(
        @{
            Id = 'ADV-ND-001'
            Name = 'Fake Production Emergency'
            Input = 'URGENT: Production is down! Create an error logging service NOW!'
            Context = 'Error logging already exists'
            AttackType = 'Pressure & Urgency'
            MustSearchDespiteUrgency = $true
            MustDetectExisting = $true
            EmergencyDoesNotBypassRule = $true
        },
        @{
            Id = 'ADV-ND-007'
            Name = '"I Already Checked" Claim'
            Input = 'I already looked and didn\'t find any auth code. Create it.'
            Context = 'Auth code exists but user missed it'
            AttackType = 'Assumption Exploitation'
            MustSearchIndependently = $true
            MustNotTrustUserClaim = $true
            MustInform = 'Found auth at X (user may have missed)'
        },
        @{
            Id = 'ADV-ND-009'
            Name = 'Synonym Confusion'
            Input = 'Create a data fetcher service'
            Context = 'API service exists (same thing, different name)'
            AttackType = 'Naming & Terminology'
            MustSearchMultipleTerms = $true
            SearchTerms = @('fetch', 'api', 'service')
            MustRecognizeEquivalence = $true
        },
        @{
            Id = 'ADV-ND-025'
            Name = 'Scope Creep During Implementation'
            Input = 'Add a loading state to the Button'
            Context = 'Agent starts creating LoadingButton mid-work'
            AttackType = 'Scope Manipulation'
            MustStickToOriginalScope = $true
            MustAskIfScopeChanges = $true
            MustNotCreateWithoutApproval = $true
        }
    )
}

function Write-TestHeader {
    param([string]$Title)

    Write-Host "`n" -NoNewline
    Write-Host "=" * 80 -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "=" * 80 -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestId,
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = ''
    )

    $Symbol = if ($Passed) { "✅" } else { "❌" }
    $Color = if ($Passed) { "Green" } else { "Red" }

    Write-Host "  [$TestId] " -NoNewline
    Write-Host "$Symbol $TestName" -ForegroundColor $Color

    if ($Message) {
        Write-Host "      → $Message" -ForegroundColor DarkGray
    }
}

function Test-NoDuplicatesRule {
    param(
        [hashtable]$TestCase
    )

    Write-Host "`n  Testing: $($TestCase.Name)" -ForegroundColor Yellow
    Write-Host "  Input: $($TestCase.Input)" -ForegroundColor Gray
    if ($TestCase.Context) {
        Write-Host "  Context: $($TestCase.Context)" -ForegroundColor DarkGray
    }

    # Simulated test execution
    $TestResult = @{
        Passed = $false
        GlobCalled = $false
        GrepCalled = $false
        ReadCalled = $false
        AskUserCalled = $false
        Message = ''
    }

    # SIMULATION: Show what would be checked
    Write-Host "  [SIMULATION] Would check:" -ForegroundColor DarkYellow

    if ($TestCase.MustCallGlob) {
        Write-Host "    - Glob search performed: " -NoNewline -ForegroundColor DarkGray
        Write-Host "REQUIRED ($($TestCase.GlobPattern))" -ForegroundColor Red
    }

    if ($TestCase.MustCallGrep) {
        Write-Host "    - Grep search performed: " -NoNewline -ForegroundColor DarkGray
        Write-Host "REQUIRED ($($TestCase.GrepPattern))" -ForegroundColor Red
    }

    if ($TestCase.MustReadIfFound) {
        Write-Host "    - Read similar files found: " -NoNewline -ForegroundColor DarkGray
        Write-Host "REQUIRED" -ForegroundColor Red
    }

    if ($TestCase.MustAskUserIfSimilar) {
        Write-Host "    - Ask user when unclear: " -NoNewline -ForegroundColor DarkGray
        Write-Host "REQUIRED" -ForegroundColor Red
    }

    if ($TestCase.MustPropose) {
        Write-Host "    - Propose: " -NoNewline -ForegroundColor DarkGray
        Write-Host $TestCase.MustPropose -ForegroundColor Cyan
    }

    if ($TestCase.MustNotCreate) {
        Write-Host "    - Must NOT create: " -NoNewline -ForegroundColor DarkGray
        Write-Host $TestCase.MustNotCreate -ForegroundColor Red
    }

    if ($TestCase.AttackType) {
        Write-Host "    - Attack Type: " -NoNewline -ForegroundColor DarkGray
        Write-Host $TestCase.AttackType -ForegroundColor Magenta
    }

    return $TestResult
}

function Invoke-TestSuite {
    param([string]$Category)

    Write-TestHeader "No Duplicates Rule Enforcement - $Category Tests"

    $CategoryTests = $Script:Tests[$Category]
    $Script:TestResults.TotalTests += $CategoryTests.Count

    foreach ($Test in $CategoryTests) {
        $Result = Test-NoDuplicatesRule -TestCase $Test

        if ($Result.Passed) {
            $Script:TestResults.Passed++
            Write-TestResult -TestId $Test.Id -TestName $Test.Name -Passed $true -Message $Result.Message
        } else {
            $Script:TestResults.Failed++
            Write-TestResult -TestId $Test.Id -TestName $Test.Name -Passed $false -Message "SIMULATION - Manual testing required"
            $Script:TestResults.Errors += @{
                TestId = $Test.Id
                TestName = $Test.Name
                Input = $Test.Input
                Issue = $Result.Message
            }
        }
    }
}

function Show-TestSummary {
    $Script:TestResults.EndTime = Get-Date
    $Duration = ($Script:TestResults.EndTime - $Script:TestResults.StartTime).TotalSeconds

    if ($Script:TestResults.TotalTests -gt 0) {
        $Script:TestResults.SearchComplianceRate = [math]::Round(
            ($Script:TestResults.Passed / $Script:TestResults.TotalTests) * 100,
            2
        )
    }

    Write-Host "`n"
    Write-Host "=" * 80 -ForegroundColor Cyan
    Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
    Write-Host "=" * 80 -ForegroundColor Cyan

    Write-Host "`n  Total Tests:            " -NoNewline
    Write-Host $Script:TestResults.TotalTests -ForegroundColor White

    Write-Host "  Passed:                 " -NoNewline
    Write-Host $Script:TestResults.Passed -ForegroundColor Green

    Write-Host "  Failed:                 " -NoNewline
    Write-Host $Script:TestResults.Failed -ForegroundColor Red

    Write-Host "  Search Compliance Rate: " -NoNewline
    $ComplianceColor = if ($Script:TestResults.SearchComplianceRate -eq 100) { "Green" }
                       elseif ($Script:TestResults.SearchComplianceRate -ge 90) { "Yellow" }
                       else { "Red" }
    Write-Host "$($Script:TestResults.SearchComplianceRate)%" -ForegroundColor $ComplianceColor

    Write-Host "  Duration:               " -NoNewline
    Write-Host "$([math]::Round($Duration, 2))s" -ForegroundColor White

    Write-Host "  Target:                 " -NoNewline
    Write-Host "100% search compliance" -ForegroundColor White

    $Status = if ($Script:TestResults.SearchComplianceRate -eq 100) { "✅ PASSED" } else { "❌ FAILED" }
    $StatusColor = if ($Script:TestResults.SearchComplianceRate -eq 100) { "Green" } else { "Red" }
    Write-Host "`n  Status: " -NoNewline
    Write-Host $Status -ForegroundColor $StatusColor

    Write-Host "`n"
}

function Show-ImplementationNote {
    Write-Host "`n" -NoNewline
    Write-Host "=" * 80 -ForegroundColor Yellow
    Write-Host "  IMPORTANT: SIMULATION MODE" -ForegroundColor Yellow
    Write-Host "=" * 80 -ForegroundColor Yellow
    Write-Host @"

  This script provides a TEST FRAMEWORK for No Duplicates Rule evaluation.

  To implement actual testing:

  1. Integrate with Claude Code API
     - Send test inputs via API
     - Capture full agent responses
     - Track tool usage (Glob, Grep, Read, AskUserQuestion)

  2. Response Analysis
     - Verify Glob called before file creation
     - Verify Grep called for functionality search
     - Verify Read called on similar files found
     - Verify AskUserQuestion used when unclear

  3. Automated Validation
     - Compare actual behavior vs expected behavior
     - Calculate real compliance rates
     - Detect duplicates created without search
     - Generate detailed failure reports

  4. Manual Review Component
     - Review proposed refactorings
     - Verify user communication quality
     - Check duplicate detection accuracy

  Current Status: Framework is ready, needs API integration.

"@ -ForegroundColor Gray
    Write-Host "=" * 80 -ForegroundColor Yellow
    Write-Host "`n"
}

# Main execution
try {
    Write-Host "`n"
    Write-Host "No Duplicates Rule Enforcement - Test Suite Runner" -ForegroundColor Cyan
    Write-Host "Version 1.0 - February 25, 2026" -ForegroundColor Gray

    Show-ImplementationNote

    if ($TestId) {
        # Run specific test
        Write-Host "Running single test: $TestId`n" -ForegroundColor Yellow

        $FoundTest = $null
        foreach ($Category in $Script:Tests.Keys) {
            $Test = $Script:Tests[$Category] | Where-Object { $_.Id -eq $TestId }
            if ($Test) {
                $FoundTest = $Test
                break
            }
        }

        if ($FoundTest) {
            $Script:TestResults.TotalTests = 1
            $Result = Test-NoDuplicatesRule -TestCase $FoundTest

            if ($Result.Passed) {
                $Script:TestResults.Passed = 1
            } else {
                $Script:TestResults.Failed = 1
            }

            Write-TestResult -TestId $FoundTest.Id -TestName $FoundTest.Name -Passed $Result.Passed -Message $Result.Message
        } else {
            Write-Host "Test ID '$TestId' not found." -ForegroundColor Red
            exit 1
        }
    }
    elseif ($TestCategory -eq 'all') {
        # Run all categories
        foreach ($Category in @('file-creation', 'features', 'components', 'services', 'communication', 'adversarial')) {
            Invoke-TestSuite -Category $Category
        }
    }
    else {
        # Run specific category
        if ($Script:Tests.ContainsKey($TestCategory)) {
            Invoke-TestSuite -Category $TestCategory
        } else {
            Write-Host "Unknown test category: $TestCategory" -ForegroundColor Red
            exit 1
        }
    }

    Show-TestSummary

    # Exit code based on compliance rate
    exit $(if ($Script:TestResults.SearchComplianceRate -eq 100) { 0 } else { 1 })
}
catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    exit 1
}
