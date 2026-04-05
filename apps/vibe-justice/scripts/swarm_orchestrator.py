import asyncio
import subprocess
import time
import sys
from pathlib import Path

# VIBE-JUSTICE LOCAL SWARM ORCHESTRATOR
# Deploys 3 Sub-Agents to execute parallel operations safely within the local environment.

def run_verification_agent():
    print("[AGENT 1] 🛡️ VERIFICATION SWEEP STARTED: Executing nx run vibe-justice:quality:full")
    # Using shell=True for windows cross-compatibility with pnpm/nx
    try:
        process = subprocess.Popen(
            "npx nx run vibe-justice:quality:full", 
            cwd=r"C:\dev", 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            shell=True
        )
        stdout, stderr = process.communicate()
        if process.returncode == 0:
            print("[AGENT 1] ✅ VERIFICATION PASSED. Zero regressions detected.")
            return True
        else:
            print("[AGENT 1] ❌ VERIFICATION FAILED.")
            print(stderr)
            return False
    except Exception as e:
        print(f"[AGENT 1] ⚠️ Execution Error: {e}")
        return False

def run_ocr_agent():
    print("[AGENT 2] 👁️ ADVANCED OCR INTEGRATION STARTED: Initializing local Tesseract pipeline.")
    try:
        # We append the path to ensure the backend modules can be imported
        sys.path.append(r"C:\dev\apps\vibe-justice\backend")
        from vibe_justice.services.ocr_service import get_ocr_service
        ocr = get_ocr_service()
        # Initializing the singleton and validating supported formats
        print(f"[AGENT 2] ✅ Tesseract OCR Service Engine bound. Config: {ocr.tesseract_config}")
        return True
    except ImportError as e:
        print(f"[AGENT 2] ⚠️ Missing Dependency for OCR: {e}")
        print("[AGENT 2] Install with: pip install pytesseract pdf2image Pillow")
        return False
    except Exception as e:
        print(f"[AGENT 2] ⚠️ OCR Initialization Error: {e}")
        return False

def run_rag_agent():
    print("[AGENT 3] 🧠 LOCAL RAG STORAGE STARTED: Spinning up SQLite/ChromaDB Persistent Store.")
    try:
        sys.path.append(r"C:\dev\apps\vibe-justice\backend")
        from vibe_justice.services.retrieval_service import RetrievalService
        from vibe_justice.utils.paths import get_chroma_directory
        rag = RetrievalService()
        client = rag._ensure_client()
        collections = client.list_collections()
        print(f"[AGENT 3] ✅ Local Vector DB Initialized at {get_chroma_directory()}")
        print(f"[AGENT 3] 📁 Available Collections: {[c.name for c in collections]}")
        return True
    except ImportError as e:
        print(f"[AGENT 3] ⚠️ Missing Dependency for Vector Store: {e}")
        print("[AGENT 3] Install with: pip install chromadb")
        return False
    except Exception as e:
        print(f"[AGENT 3] ⚠️ RAG Initialization Error: {e}")
        return False

async def main():
    print("==========================================================")
    print(" GRAVITY CLAW (G-CLAW) :: PARALLEL SUB-AGENT ORCHESTRATOR ")
    print("==========================================================")
    print("Deploying local agent swarm...\n")

    # Run the verification agent synchronously as it's a heavy build task, 
    # but we will wrap them in AsyncIO threads for true parallelism.
    
    loop = asyncio.get_running_loop()
    
    # Execute all three tasks concurrently using thread pool executor
    tasks = [
        loop.run_in_executor(None, run_verification_agent),
        loop.run_in_executor(None, run_ocr_agent),
        loop.run_in_executor(None, run_rag_agent)
    ]
    
    start_time = time.time()
    results = await asyncio.gather(*tasks)
    elapsed = time.time() - start_time
    
    print("\n==========================================================")
    print(f" SWARM EXECUTION COMPLETE ({elapsed:.2f} seconds)")
    print("==========================================================")
    print(f"Agent 1 (Verification): {'SUCCESS' if results[0] else 'FAILED/SKIPPED'}")
    print(f"Agent 2 (Local OCR):    {'SUCCESS' if results[1] else 'FAILED/SKIPPED'}")
    print(f"Agent 3 (Vector RAG):   {'SUCCESS' if results[2] else 'FAILED/SKIPPED'}")

if __name__ == "__main__":
    asyncio.run(main())
