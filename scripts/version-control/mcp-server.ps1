# MCP Server for D:\ Drive Version Control
# Exposes version control operations to Antigravity IDE via MCP

param(
    [Parameter(Mandatory=$false)]
    [string]$Command
)

$ErrorActionPreference = "Stop"
$VCRoot = "C:\dev\scripts\version-control"

function Write-MCPResponse {
    param([hashtable]$Response)
    $json = $Response | ConvertTo-Json -Depth 10 -Compress
    Write-Output $json
}

function Get-Tools {
    @{
        tools = @(
            @{
                name = "snapshot_create"
                description = "Create a snapshot of C:\dev workspace"
                inputSchema = @{
                    type = "object"
                    properties = @{
                        description = @{
                            type = "string"
                            description = "Description of the snapshot (like commit message)"
                        }
                        tag = @{
                            type = "string"
                            description = "Optional tag name for the snapshot"
                        }
                    }
                    required = @("description")
                }
            },
            @{
                name = "snapshot_list"
                description = "List all snapshots with metadata"
                inputSchema = @{
                    type = "object"
                    properties = @{
                        limit = @{
                            type = "number"
                            description = "Maximum number of snapshots to return"
                            default = 10
                        }
                    }
                }
            },
            @{
                name = "snapshot_restore"
                description = "Restore workspace to a specific snapshot"
                inputSchema = @{
                    type = "object"
                    properties = @{
                        snapshotId = @{
                            type = "string"
                            description = "Snapshot ID to restore (format: YYYYMMDD-HHMMSS)"
                        }
                        tag = @{
                            type = "string"
                            description = "Or restore by tag name"
                        }
                    }
                }
            },
            @{
                name = "snapshot_status"
                description = "Get current repository status"
                inputSchema = @{
                    type = "object"
                    properties = @{}
                }
            }
        )
    }
}

function Invoke-Tool {
    param(
        [string]$Name,
        [hashtable]$Arguments
    )

    switch ($Name) {
        "snapshot_create" {
            $desc = $Arguments.description
            $tag = $Arguments.tag

            $cmd = "& '$VCRoot\Save-Snapshot.ps1' -Description '$desc'"
            if ($tag) {
                $cmd += " -Tag '$tag'"
            }

            $result = Invoke-Expression $cmd

            @{
                content = @(
                    @{
                        type = "text"
                        text = "Snapshot created successfully: $result"
                    }
                )
            }
        }

        "snapshot_list" {
            $limit = $Arguments.limit ?? 10
            $snapshots = & "$VCRoot\List-Snapshots.ps1" -Limit $limit

            @{
                content = @(
                    @{
                        type = "text"
                        text = ($snapshots | Out-String)
                    }
                )
            }
        }

        "snapshot_restore" {
            $snapshotId = $Arguments.snapshotId
            $tag = $Arguments.tag

            if ($snapshotId) {
                $result = & "$VCRoot\Restore-Snapshot.ps1" -SnapshotId $snapshotId
            } elseif ($tag) {
                $result = & "$VCRoot\Restore-Snapshot.ps1" -Tag $tag
            } else {
                throw "Either snapshotId or tag must be provided"
            }

            @{
                content = @(
                    @{
                        type = "text"
                        text = "Snapshot restored successfully: $result"
                    }
                )
            }
        }

        "snapshot_status" {
            $status = & "$VCRoot\Repository-Status.ps1"

            @{
                content = @(
                    @{
                        type = "text"
                        text = ($status | Out-String)
                    }
                )
            }
        }

        default {
            throw "Unknown tool: $Name"
        }
    }
}

# Main MCP server loop
if ($Command -eq "list_tools") {
    Write-MCPResponse (Get-Tools)
} elseif ($Command -eq "call_tool") {
    # Read stdin for tool arguments
    $input = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $result = Invoke-Tool -Name $input.name -Arguments $input.arguments
    Write-MCPResponse $result
} else {
    Write-Error "Unknown command: $Command"
}
