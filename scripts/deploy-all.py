import os
import subprocess
import concurrent.futures
import re

PROJECTS = [
    "factory-saas-smoke",
    "prior-auth-pro",
    "proposal-review-saas",
    "_-factory-runtime-smoke"
]

SCOPE = "team_K61A5zl2rIRvueizg7oCGh1n"

def deploy_project(project_name):
    project_dir = os.path.join(os.getcwd(), "apps", project_name)
    if not os.path.exists(project_dir):
        return project_name, False, f"Directory not found: {project_dir}", None

    print(f"[{project_name}] Starting deployment process...")

    # Set up clean environment without VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
    env = os.environ.copy()
    env.pop("VERCEL_TOKEN", None)
    env.pop("VERCEL_ORG_ID", None)
    env.pop("VERCEL_PROJECT_ID", None)

    try:
        # Step 1: Link the project
        print(f"[{project_name}] Linking project...")
        link_cmd = [
            "pnpm", "exec", "vercel", "link",
            "--yes",
            "--scope", SCOPE
        ]
        res = subprocess.run(link_cmd, cwd=project_dir, env=env, capture_output=True, text=True, shell=True)
        if res.returncode != 0:
            return project_name, False, f"Link failed:\n{res.stderr or res.stdout}", None

        # Step 2: Build the project locally
        print(f"[{project_name}] Building project locally...")
        build_cmd = [
            "pnpm", "exec", "vercel", "build",
            "--prod",
            "--yes",
            "--scope", SCOPE
        ]
        res = subprocess.run(build_cmd, cwd=project_dir, env=env, capture_output=True, text=True, shell=True)
        if res.returncode != 0:
            return project_name, False, f"Build failed:\n{res.stderr or res.stdout}", None

        # Step 3: Deploy prebuilt project
        print(f"[{project_name}] Deploying to Vercel...")
        deploy_cmd = [
            "pnpm", "exec", "vercel", "deploy",
            "--prebuilt",
            "--prod",
            "--scope", SCOPE,
            "--yes"
        ]
        res = subprocess.run(deploy_cmd, cwd=project_dir, env=env, capture_output=True, text=True, shell=True)
        if res.returncode != 0:
            return project_name, False, f"Deploy failed:\n{res.stderr or res.stdout}", None

        # Extract Production URL from output
        prod_url = None
        match = re.search(r"Production\s+(https://\S+)", res.stdout)
        if match:
            prod_url = match.group(1)
        else:
            # Fallback check in stderr
            match = re.search(r"Production\s+(https://\S+)", res.stderr)
            if match:
                prod_url = match.group(1)

        print(f"[{project_name}] Successfully deployed! URL: {prod_url}")
        return project_name, True, "Success", prod_url

    except Exception as e:
        return project_name, False, f"Exception occurred: {str(e)}", None

def deploy_all():
    print("Initiating mass Vercel deployment for 14 SaaS apps...")
    results = []
    
    # Deploy concurrently with 1 workers
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        futures = {executor.submit(deploy_project, p): p for p in PROJECTS}
        for future in concurrent.futures.as_completed(futures):
            project_name = futures[future]
            try:
                name, success, msg, url = future.result()
                results.append({
                    "name": name,
                    "success": success,
                    "message": msg,
                    "url": url
                })
            except Exception as e:
                results.append({
                    "name": project_name,
                    "success": False,
                    "message": f"Future exception: {str(e)}",
                    "url": None
                })

    print("\n" + "="*50)
    print("Vercel Mass Deployment Summary:")
    print("="*50)
    
    success_count = 0
    for res in results:
        status_str = "SUCCESS" if res["success"] else "FAILED"
        url_str = res["url"] if res["url"] else "N/A"
        if res["success"]:
            success_count += 1
            print(f"[OK] {res['name']}: {status_str} | URL: {url_str}")
        else:
            print(f"[FAIL] {res['name']}: {status_str} | Reason: {res['message']}")
            
    print("="*50)
    print(f"Total deployed: {success_count}/{len(PROJECTS)}")
    print("="*50)

if __name__ == "__main__":
    deploy_all()
