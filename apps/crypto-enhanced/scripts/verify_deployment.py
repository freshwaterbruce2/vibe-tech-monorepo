import os
import sys
import sqlite3
from pathlib import Path

def check_path(path_str, description, should_exist=True):
    path = Path(path_str)
    exists = path.exists()
    status = "✅" if exists == should_exist else "❌"
    print(f"{status} {description}: {path} (Exists: {exists})")
    return exists == should_exist

def check_sqlite_wal(db_path):
    if not Path(db_path).exists():
        print(f"❌ Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode")
        mode = cursor.fetchone()[0]
        conn.close()
        
        status = "✅" if mode.upper() == "WAL" else "❌"
        print(f"{status} SQLite Mode: {mode.upper()} (Expected: WAL)")
        return mode.upper() == "WAL"
    except Exception as e:
        print(f"❌ Failed to check SQLite mode: {e}")
        return False

def main():
    print("=== DEPLOYMENT VERIFICATION ===")
    
    # Check D:\ Drive paths
    d_drive_checks = [
        (r"D:\\databases\\crypto-enhanced\\trading.db", "Trading Database"),
        (r"D:\\logs\\crypto-enhanced", "Logs Directory"),
        (r"D:\\.trading_bot", "Trading Bot State Dir"),
    ]
    
    all_passed = True
    for path, desc in d_drive_checks:
        if not check_path(path, desc, should_exist=True):
            all_passed = False
            
    # Check for pollution in C:\ source
    c_drive_checks = [
        ("nonce_state.json", "Root Nonce State", False),
        ("trading.db", "Root Database", False),
        ("trading.log", "Root Log", False),
    ]
    
    for path, desc, should_exist in c_drive_checks:
        full_path = Path(os.getcwd()) / path
        if not check_path(full_path, desc, should_exist=should_exist):
            print(f"  ⚠️  Clean up this file: {full_path}")
            all_passed = False

    # Check WAL Mode
    if not check_sqlite_wal(r"D:\\databases\\crypto-enhanced\\trading.db"):
        all_passed = False

    print("\n=== SUMMARY ===")
    if all_passed:
        print("✅ SYSTEM READY FOR LIVE FIRE")
        sys.exit(0)
    else:
        print("❌ VERIFICATION FAILED - FIX ISSUES BEFORE TRADING")
        sys.exit(1)

if __name__ == "__main__":
    main()
