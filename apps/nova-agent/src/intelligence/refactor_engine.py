import json
from vibe_shared.ipc.schemas import IPCMessageType

class RefactorEngine:
    """
    The brain that decides EXACTLY what code needs to change.
    """
    def prepare_insertion(self, file_path, new_logic, line_number):
        # Create the payload for the IPC Bridge using the dedicated CODE_EDIT channel
        payload = {
            "type": IPCMessageType.CODE_EDIT,
            "source": "nova",
            "target": "vibe",
            "payload": {
                "filePath": file_path,
                "content": new_logic,
                "range": {
                    "startLine": line_number,
                    "startColumn": 1,
                    "endLine": line_number,
                    "endColumn": 1
                },
                "action": "insert"
            }
        }
        return json.dumps(payload)
