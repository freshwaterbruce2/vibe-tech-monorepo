import os
import json

def add_deploy_targets():
    apps_dir = os.path.join(os.getcwd(), "apps")
    if not os.path.exists(apps_dir):
        print("Error: apps directory not found")
        return

    updated_count = 0
    for item in os.listdir(apps_dir):
        app_path = os.path.join(apps_dir, item)
        if not os.path.isdir(app_path):
            continue

        project_json_path = os.path.join(app_path, "project.json")
        if not os.path.exists(project_json_path):
            continue

        try:
            with open(project_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading {project_json_path}: {e}")
            continue

        tags = data.get("tags", [])
        if "factory:generated" in tags or "factory:saas" in tags:
            # We want to add target "deploy"
            targets = data.get("targets", {})
            targets["deploy"] = {
                "executor": "nx:run-commands",
                "dependsOn": ["build"],
                "options": {
                    "commands": [
                        "pnpm exec vercel build --prod --yes --scope team_K61A5zl2rIRvueizg7oCGh1n",
                        "pnpm exec vercel deploy --prebuilt --prod --scope team_K61A5zl2rIRvueizg7oCGh1n --yes"
                    ],
                    "cwd": f"apps/{item}",
                    "parallel": False
                }
            }
            data["targets"] = targets
            
            with open(project_json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            
            print(f"Added deploy target to {item}")
            updated_count += 1

    print(f"Completed! Added deploy target to {updated_count} projects.")

if __name__ == "__main__":
    add_deploy_targets()
