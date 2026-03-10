import glob
import json
import os
from collections import defaultdict


def validate_dependencies():
    workspace_roots = ["apps", "packages", "backend"]
    package_files = []

    # 1. Find package.json files
    print("Scanning for package.json files...")
    for root in workspace_roots:
        # Search depth 1 and 2
        root_path = os.path.join(os.getcwd(), root)
        if not os.path.exists(root_path):
            continue

        # Specific subdirs
        params = glob.glob(os.path.join(root_path, "*", "package.json"))
        package_files.extend(params)

        # Nested (e.g. packages/feature-flags/dashboard)
        params_nested = glob.glob(os.path.join(root_path, "*", "*", "package.json"))
        package_files.extend(params_nested)

    print(f"Found {len(package_files)} packages.")

    dependencies = defaultdict(set)
    dev_dependencies = defaultdict(set)
    package_names = {}  # path -> name

    # 2. Gather versions
    for file_path in package_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                name = data.get("name", "unknown")
                package_names[file_path] = name

                for dep, ver in data.get("dependencies", {}).items():
                    dependencies[dep].add(ver)

                for dep, ver in data.get("devDependencies", {}).items():
                    dev_dependencies[dep].add(ver)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

    # 3. Report Mismatches
    print("\n--- Version Mismatches ---")
    mismatches_found = False
    all_deps = set(list(dependencies.keys()) + list(dev_dependencies.keys()))

    for dep in sorted(all_deps):
        versions = dependencies.get(dep, set()) | dev_dependencies.get(dep, set())
        # Filter details like "workspace:*" or similar if needed, but let's show raw for now
        if len(versions) > 1:
            print(f"{dep}: {', '.join(sorted(versions))}")
            mismatches_found = True

            # Print which package uses which version (detailed)
            # Iterate again to find culprits (inefficient but fine for this scale)
            for file_path in package_files:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                    v = data.get("dependencies", {}).get(dep)
                    if v:
                        print(f"  - {data.get('name')}: {v} (dep)")

                    v = data.get("devDependencies", {}).get(dep)
                    if v:
                        print(f"  - {data.get('name')}: {v} (dev)")

    if not mismatches_found:
        print("No version mismatches found.")

    # 4. Check for Circular Dependencies using workspace-graph.json
    print("\n--- Circular Dependencies ---")
    graph_path = os.path.join(os.getcwd(), "workspace-graph.json")
    if os.path.exists(graph_path):
        try:
            with open(graph_path, "r", encoding="utf-8") as f:
                graph_data = json.load(f)

            nodes = graph_data.get("graph", {}).get("nodes", {})
            dependencies_graph = graph_data.get("graph", {}).get("dependencies", {})

            # Convert to adjacency list
            adj = defaultdict(list)

            # The structure of workspace-graph.json might vary.
            # Usually dependencies is a map of source -> targets
            # Let's inspect valid keys.
            if isinstance(dependencies_graph, dict):
                for source, deps in dependencies_graph.items():
                    for target_obj in deps:
                        target = target_obj.get("target")
                        if target:
                            adj[source].append(target)
            else:
                # It might be implicit in "nodes" -> "dependencies" in some nx versions?
                # Or just standard "dependencies" map.
                # Let's try to infer from "dependencies" key at top level first.
                pass

            # If top level dependencies is empty, check if nodes have them
            if not adj:
                for name, node in nodes.items():
                    # Sometimes dependencies are listed in the node?
                    # Actually standard Nx graph usually has a top level 'dependencies'
                    pass

            # If we couldn't parse dependencies, we might need another way.
            # But let's look for cycles if we have data.

            # DFS for cycles
            visited = set()
            recursion_stack = set()
            cycles = []

            def dfs(node, path):
                visited.add(node)
                recursion_stack.add(node)
                path.append(node)

                for neighbor in adj.get(node, []):
                    if neighbor not in visited:
                        dfs(neighbor, path)
                    elif neighbor in recursion_stack:
                        # Cycle found
                        cycle_path = path[path.index(neighbor) :] + [neighbor]
                        cycles.append(cycle_path)

                recursion_stack.remove(node)
                path.pop()

            for node in list(nodes.keys()):  # Iterate all nodes
                if node not in visited:
                    dfs(node, [])

            if cycles:
                print(f"Found {len(cycles)} circular dependencies:")
                for c in cycles:
                    print(" -> ".join(c))
            else:
                print("No circular dependencies found (or graph parsing failed/empty).")

        except Exception as e:
            print(f"Error analyzing graph: {e}")
    else:
        print("workspace-graph.json not found.")


if __name__ == "__main__":
    validate_dependencies()
