#!/usr/bin/env python3
"""
Self-Improvement Gym & Git Ratchet - Ralph Toolkit
=================================================
Allows an LLM agent to propose optimizations, test them in a sandboxed
environment, verify against project constraints, and commit/rollback.
"""

import os
import sys
import time
import argparse
import subprocess
import shutil
import tempfile
import stat
import urllib.request
import json
from pathlib import Path

# Load env variables from .env
def load_env(env_path: Path) -> dict:
    env_vars = {}
    if not env_path.exists():
        return env_vars
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

class Sandbox:
    def __enter__(self):
        self.setup()
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()
    def setup(self):
        pass
    def apply_edits(self, file_path: str, new_content: str):
        pass
    def run_verify(self, verification_script: str, url: str, no_e2e: bool) -> tuple[float, str]:
        # Returns (cps_score, output)
        return 0.0, ""
    def rollback(self):
        pass
    def cleanup(self):
        pass

def link_recursive(src: Path, dest: Path):
    if not src.exists():
        return
    if src.is_file():
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(str(src), str(dest))
    elif src.is_dir():
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["cmd", "/c", "mklink", "/j", str(dest), str(src)], capture_output=True)
        else:
            for item in src.iterdir():
                if item.name in ('node_modules', '.git'):
                    continue
                link_recursive(item, dest / item.name)

class DockerSandbox(Sandbox):
    def __init__(self, monorepo_root: Path, image_name="ralph-gym-sandbox"):
        self.monorepo_root = monorepo_root.resolve()
        self.image_name = image_name
        self.container_name = f"ralph-gym-sandbox-{int(time.time())}"
        
    def setup(self):
        print(f"Building Docker image {self.image_name}...")
        dockerfile_dir = self.monorepo_root / "tools" / "ralph"
        subprocess.run(
            ["docker", "build", "-t", self.image_name, "-f", str(dockerfile_dir / "Dockerfile"), str(dockerfile_dir)],
            check=True
        )
        
        print(f"Running isolated Docker container {self.container_name}...")
        cmd = [
            "docker", "run", "-d",
            "--name", self.container_name,
            "-v", f"{self.monorepo_root}:/workspace-src:ro",
            self.image_name,
            "tail", "-f", "/dev/null"
        ]
        subprocess.run(cmd, check=True)
        
        print("Cloning workspace to isolated writeable /sandbox inside container...")
        subprocess.run([
            "docker", "exec", self.container_name,
            "git", "clone", "/workspace-src", "/sandbox"
        ], check=True)
        
        print("Linking node_modules folders inside Docker sandbox...")
        link_cmd = (
            "find /workspace-src -name 'node_modules' -type d -prune | while read dir; do "
            "rel=${dir#/workspace-src/}; "
            "mkdir -p \"/sandbox/$(dirname \"$rel\")\"; "
            "ln -sf \"$dir\" \"/sandbox/$rel\"; "
            "done"
        )
        subprocess.run([
            "docker", "exec", self.container_name,
            "bash", "-c", link_cmd
        ], check=True)

        print("Linking agent and configuration directories inside Docker sandbox...")
        link_python_script = """
import pathlib, os
def link_rec(src, dest):
    if not src.exists(): return
    if src.is_file():
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.symlink(src, dest)
    elif src.is_dir():
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.symlink(src, dest)
        else:
            for item in src.iterdir():
                if item.name in ('node_modules', '.git'): continue
                link_rec(item, dest / item.name)

link_rec(pathlib.Path('/workspace-src/.agent'), pathlib.Path('/sandbox/.agent'))
link_rec(pathlib.Path('/workspace-src/.agents'), pathlib.Path('/sandbox/.agents'))
if pathlib.Path('/workspace-src/.env').exists() and not pathlib.Path('/sandbox/.env').exists():
    os.symlink('/workspace-src/.env', '/sandbox/.env')
"""
        subprocess.run([
            "docker", "exec", self.container_name,
            "python3", "-c", link_python_script
        ], check=True)
        
    def apply_edits(self, file_path: str, new_content: str):
        print(f"Applying edits to {file_path} in Docker sandbox...")
        # Write content to temporary file on host, then docker cp
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.py', encoding='utf-8') as f:
            f.write(new_content)
            temp_name = f.name
        try:
            dest = f"{self.container_name}:/sandbox/{file_path}"
            subprocess.run(["docker", "cp", temp_name, dest], check=True)
        finally:
            os.remove(temp_name)
            
    def run_verify(self, verification_script: str, url: str, no_e2e: bool) -> tuple[float, str]:
        print(f"Running verification ({verification_script}) inside Docker sandbox...")
        args_str = f". --url {url}"
        if no_e2e:
            args_str += " --no-e2e"
        
        cmd = [
            "docker", "exec", self.container_name,
            "bash", "-c", f"cd /sandbox && python {verification_script} {args_str}"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        cps = 1.0 if res.returncode == 0 else 0.0
        return cps, res.stdout + res.stderr
        
    def rollback(self):
        print("Executing Git Ratchet Rollback inside Docker sandbox...")
        subprocess.run([
            "docker", "exec", self.container_name,
            "bash", "-c", "cd /sandbox && git reset --hard && git clean -fd"
        ], check=True)
        
    def cleanup(self):
        print(f"Cleaning up Docker container {self.container_name}...")
        subprocess.run(["docker", "stop", self.container_name], capture_output=True)
        subprocess.run(["docker", "rm", self.container_name], capture_output=True)

class LocalSandbox(Sandbox):
    def __init__(self, monorepo_root: Path):
        self.monorepo_root = monorepo_root.resolve()
        # Sandbox must reside on D: drive per path policies
        self.sandbox_dir = Path(f"D:/tmp-sandbox-ralph-{int(time.time())}")
        
    def setup(self):
        print(f"Cloning workspace locally to isolated directory {self.sandbox_dir}...")
        os.makedirs(self.sandbox_dir.parent, exist_ok=True)
        subprocess.run([
            "git", "clone", str(self.monorepo_root), str(self.sandbox_dir)
        ], check=True)
        
        # Link untracked/ignored agent tooling and config directories recursively
        print("Linking agent directories to local sandbox...")
        link_recursive(self.monorepo_root / ".agent", self.sandbox_dir / ".agent")
        link_recursive(self.monorepo_root / ".agents", self.sandbox_dir / ".agents")
                
        # Copy env file to sandbox
        src_env = self.monorepo_root / ".env"
        if src_env.exists():
            shutil.copy(str(src_env), str(self.sandbox_dir / ".env"))
            
        self.link_node_modules()
        
    def link_node_modules(self):
        print("Linking node_modules folders from host to local sandbox...")
        for root, dirs, _ in os.walk(self.monorepo_root):
            # Prune directories we don't want to walk into
            prune_dirs = [d for d in dirs if d in ('node_modules', '.git', '.venv', '__pycache__', 'dist', 'build', '.next', '.nx')]
            for d in prune_dirs:
                dirs.remove(d)
                
            node_modules_path = Path(root) / "node_modules"
            if node_modules_path.exists() and node_modules_path.is_dir():
                rel_path = node_modules_path.relative_to(self.monorepo_root)
                sandbox_nm_path = self.sandbox_dir / rel_path
                os.makedirs(sandbox_nm_path.parent, exist_ok=True)
                
                # Create directory junction on Windows
                cmd = ["cmd", "/c", "mklink", "/j", str(sandbox_nm_path), str(node_modules_path)]
                subprocess.run(cmd, capture_output=True)
                
    def apply_edits(self, file_path: str, new_content: str):
        print(f"Applying edits to {file_path} in local sandbox...")
        dest = self.sandbox_dir / file_path
        os.makedirs(dest.parent, exist_ok=True)
        with open(dest, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
    def run_verify(self, verification_script: str, url: str, no_e2e: bool) -> tuple[float, str]:
        print(f"Running verification ({verification_script}) in local sandbox...")
        cmd = [sys.executable, verification_script, ".", "--url", url]
        if no_e2e:
            cmd.append("--no-e2e")
            
        res = subprocess.run(
            cmd,
            cwd=str(self.sandbox_dir),
            capture_output=True,
            text=True,
            shell=True
        )
        cps = 1.0 if res.returncode == 0 else 0.0
        return cps, res.stdout + res.stderr
        
    def rollback(self):
        print("Executing Git Ratchet Rollback in local sandbox...")
        subprocess.run(["git", "reset", "--hard"], cwd=str(self.sandbox_dir), check=True)
        subprocess.run(["git", "clean", "-fd"], cwd=str(self.sandbox_dir), check=True)
        
    def cleanup(self):
        print(f"Cleaning up local sandbox directory {self.sandbox_dir}...")
        if not self.sandbox_dir.exists():
            return
            
        # Safely remove Windows directory junctions first
        for root, dirs, _ in os.walk(self.sandbox_dir, topdown=False):
            for d in dirs:
                dir_path = Path(root) / d
                if dir_path.is_symlink() or os.path.islink(str(dir_path)):
                    try:
                        os.rmdir(dir_path)
                    except Exception as e:
                        print(f"Warning: Failed to remove junction {dir_path}: {e}")
                        
        def remove_readonly(func, path, excinfo):
            os.chmod(path, stat.S_IWRITE)
            func(path)
        try:
            shutil.rmtree(self.sandbox_dir, onerror=remove_readonly)
        except Exception as e:
            print(f"Warning: Failed to clean up local sandbox dir {self.sandbox_dir}: {e}")

def check_docker() -> bool:
    try:
        res = subprocess.run(["docker", "info"], capture_output=True, text=True)
        return res.returncode == 0
    except Exception:
        return False

def query_groq(api_key: str, model: str, target_file: str, code_content: str) -> dict | None:
    print(f"Querying Groq ({model}) for code optimizations...")
    url = "https://api.groq.com/openai/v1/chat/completions"
    prompt = f"""
You are an expert optimization engineer in the Ralph Self-Improvement Gym.
Analyze the target code below and propose a performance, lint, or safety optimization.
Target File: {target_file}

Code:
```python
{code_content}
```

Format your response strictly as a JSON object:
{{
  "rationale": "Brief explanation of the optimization",
  "edits": [
    {{
      "file_path": "{target_file}",
      "new_content": "The entire new content of the file"
    }}
  ]
}}
Do NOT output any markdown, code blocks, or text outside the JSON block. Ensure it is valid JSON.
"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a code optimization assistant. You only output valid JSON responses."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            content = res_json['choices'][0]['message']['content']
            return json.loads(content)
    except Exception as e:
        print(f"Error querying Groq API: {e}")
        return None

def propagate_optimization(monorepo_root: Path, target_file: str, rationale: str, new_content: str, skill_name: str):
    print("\n[Propagation] Safe validation passed! Drafting Fleet Propagation branch...")
    timestamp = int(time.time())
    branch_name = f"ralph-opt-{skill_name}-{timestamp}"
    
    # 1. Create a new git branch on the host
    subprocess.run(["git", "checkout", "-b", branch_name], cwd=str(monorepo_root), check=True)
    
    # 2. Apply the optimization changes to the host file
    host_target = monorepo_root / target_file
    with open(host_target, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"[Propagation] Applied optimized code to host file: {target_file}")
    
    # 3. Locate and update the SKILL.md file
    skill_file = None
    for folder in [".agent/skills", ".agents/skills"]:
        potential_path = monorepo_root / folder / skill_name / "SKILL.md"
        if potential_path.exists():
            skill_file = potential_path
            break
            
    if skill_file:
        print(f"[Propagation] Updating skill file: {skill_file.relative_to(monorepo_root)}")
        with open(skill_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Find where to append lesson learned
        lesson_inserted = False
        for i, line in enumerate(lines):
            if "## Lessons Learned" in line or "## Lessons" in line:
                lines.insert(i + 1, f"- **{target_file} Optimization**: {rationale} (Self-Improved {time.strftime('%Y-%m-%d')})\n")
                lesson_inserted = True
                break
        if not lesson_inserted:
            lines.append(f"\n## Lessons Learned\n- **{target_file} Optimization**: {rationale} (Self-Improved {time.strftime('%Y-%m-%d')})\n")
            
        with open(skill_file, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    else:
        print(f"[Warning] Could not find skill file for '{skill_name}' under .agent/skills or .agents/skills.")
        
    # 4. Git commit the changes
    subprocess.run(["git", "add", "."], cwd=str(monorepo_root), check=True)
    commit_msg = f"ralph(opt): self-improvement lesson learned in {skill_name}"
    subprocess.run(["git", "commit", "-m", commit_msg], cwd=str(monorepo_root), check=True)
    
    print(f"\n[SUCCESS] Optimization Drafted Successfully!")
    print(f"Branch: {branch_name}")
    print(f"Commit: {commit_msg}")
    print(f"Action Required: Run 'git push origin {branch_name}' and submit a Pull Request for human approval.")

def run_loop(args: argparse.Namespace, monorepo_root: Path, env: dict):
    # Determine sandbox mode
    use_docker = False
    if args.sandbox == 'docker':
        use_docker = True
    elif args.sandbox == 'auto':
        use_docker = check_docker()
        if not use_docker:
            print("Docker daemon not detected. Falling back to local isolated sandbox.")
            
    # Resolve target file content
    target_path = monorepo_root / args.target
    if not target_path.exists():
        print(f"Error: Target file {target_path} does not exist.")
        sys.exit(1)
        
    with open(target_path, 'r', encoding='utf-8') as f:
        code_content = f.read()
        
    # Generate proposal
    proposal = None
    if args.simulate:
        print("[Simulation Mode] Generating mock optimization proposal...")
        proposal = {
            "rationale": "Mock performance enhancement adding optimized lookup maps.",
            "edits": [
                {
                    "file_path": args.target,
                    "new_content": code_content + "\n# Optimized by Ralph Self-Improvement Gym Simulation\n"
                }
            ]
        }
    else:
        api_key = env.get("GROQ_API_KEY")
        if not api_key:
            print("Error: GROQ_API_KEY not found in .env file. Use --simulate or configure GROQ_API_KEY.")
            sys.exit(1)
        model = env.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        proposal = query_groq(api_key, model, args.target, code_content)
        
    if not proposal or "edits" not in proposal:
        print("Error: Failed to obtain a valid optimization proposal.")
        sys.exit(1)
        
    print(f"\nProposed Optimization Rationale: {proposal['rationale']}")
    
    # Run sandbox execution
    sandbox = DockerSandbox(monorepo_root) if use_docker else LocalSandbox(monorepo_root)
    verification_script = ".agent/scripts/checklist.py" if args.checklist else ".agent/scripts/verify_all.py"
    
    with sandbox as sb:
        # Apply edits
        for edit in proposal["edits"]:
            sb.apply_edits(edit["file_path"], edit["new_content"])
            
        # Run verification
        cps, logs = sb.run_verify(verification_script, args.url, args.no_e2e)
        print(f"Constraint Preservation Score (CPS): {cps:.2f}")
        
        # Git Ratchet Guardrail
        if cps < 1.00:
            print("\n[FAIL] SAHOO Constraint Verification Failed (CPS < 1.00)!")
            print("--- Verification Logs ---")
            print(logs)
            print("-------------------------")
            print("Immediate rollback initiated to prevent alignment drift.")
            sb.rollback()
            print("Loop aborted.")
            sys.exit(1)
        else:
            print("\n[PASS] SAHOO Safeguards Passed (CPS = 1.00)!")
            # Propagate changes
            for edit in proposal["edits"]:
                propagate_optimization(monorepo_root, edit["file_path"], proposal["rationale"], edit["new_content"], args.skill)

def main():
    parser = argparse.ArgumentParser(description="Ralph Self-Improvement Gym & Git Ratchet")
    parser.add_argument("--sandbox", choices=["docker", "local", "auto"], default="auto", help="Sandbox mode (default: auto)")
    parser.add_argument("--url", default="http://localhost:3000", help="Verification URL (default: http://localhost:3000)")
    parser.add_argument("--checklist", action="store_true", help="Use checklist.py instead of verify_all.py for faster checks")
    parser.add_argument("--no-e2e", action="store_true", help="Skip E2E checks in verify_all")
    parser.add_argument("--target", default="tools/ralph/src/scorer.py", help="File to optimize (default: tools/ralph/src/scorer.py)")
    parser.add_argument("--skill", default="clean-code", help="Skill name to propagate lessons learned to (default: clean-code)")
    parser.add_argument("--simulate", action="store_true", help="Simulate optimization without Groq call")
    parser.add_argument("--loops", type=int, default=1, help="Number of loops to execute")
    args = parser.parse_args()
    
    # Resolve monorepo root
    here = Path(__file__).resolve()
    monorepo_root = here.parents[2]
    
    # Load env
    env = load_env(monorepo_root / ".env")
    
    for i in range(args.loops):
        print(f"\n=== Self-Improvement Loop {i+1}/{args.loops} ===")
        run_loop(args, monorepo_root, env)

if __name__ == "__main__":
    main()
