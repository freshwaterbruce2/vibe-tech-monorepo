#!/usr/bin/env python3
"""
Script to fix the DoorEntryRow test file by adding missing props and fields
"""

import re

def fix_test_file():
    file_path = "src/components/__tests__/DoorEntryRow.test.tsx"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix missing tcrPresent fields in DoorSchedule objects
    patterns_to_fix = [
        # Pattern for DoorSchedule objects missing tcrPresent
        (r'(const \w+: DoorSchedule = \{[^}]*createdBy: "[^"]*",)\s*(\};)', r'\1\n      tcrPresent: false,\2'),
        
        # Pattern for DoorEntryRow components missing isMobileView prop
        (r'(<DoorEntryRow[^>]*isAnimated={false})\s*(/>)', r'\1\n            isMobileView={false}\2'),
        (r'(<DoorEntryRow[^>]*isAnimated={false})\s*(\n\s*/>)', r'\1\n            isMobileView={false}\2'),
    ]
    
    for pattern, replacement in patterns_to_fix:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    # Remove unused variable
    content = content.replace('const palletCell = screen.getByTestId("pallet-count-cell");', '// const palletCell = screen.getByTestId("pallet-count-cell");')
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("Fixed DoorEntryRow test file")

if __name__ == "__main__":
    fix_test_file()
