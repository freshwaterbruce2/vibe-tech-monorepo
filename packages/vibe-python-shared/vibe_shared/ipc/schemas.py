from enum import Enum
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
import uuid

class IPCMessageType(str, Enum):
    TASK_STARTED = 'task_started'
    TASK_STOPPED = 'task_stopped'
    ERROR = 'error'
    ACK = 'ack'
    # OS Control (Nova Mission Control)
    OS_CLICK = 'os:click'
    OS_TYPE = 'os:type'
    OS_HOTKEY = 'os:hotkey'
    OS_MINIMIZE = 'os:minimize'
    OS_FOCUS = 'os:focus'
    OS_BROWSER_OPEN = 'os:browser_open'

class BaseMessage(BaseModel):
    # Matches Zod baseMessageSchema
    messageId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: IPCMessageType
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    source: str = "nova"
    target: Optional[str] = None
    version: str = "1.0.0"
    correlationId: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)

class TaskStartedPayload(BaseModel):
    # Matches taskStartedPayloadSchema
    task_id: str
    task_type: str
    title: str
    context: Optional[Dict[str, Any]] = None

class TaskStartedMessage(BaseMessage):
    type: IPCMessageType = IPCMessageType.TASK_STARTED
    payload: TaskStartedPayload

class OsCommandPayload(BaseModel):
    targetWindow: Optional[str] = "Vibe Code Studio"
    x: Optional[float] = None
    y: Optional[float] = None
    text: Optional[str] = None
    keys: Optional[list[str]] = None
    url: Optional[str] = None
    # Legacy support
    action: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None

    model_config = ConfigDict(populate_by_name=True)

class OsClickMessage(BaseMessage):
    type: IPCMessageType = IPCMessageType.OS_CLICK
    payload: OsCommandPayload

class OsTypeMessage(BaseMessage):
    type: IPCMessageType = IPCMessageType.OS_TYPE
    payload: OsCommandPayload

class OsHotkeyMessage(BaseMessage):
    type: IPCMessageType = IPCMessageType.OS_HOTKEY
    payload: OsCommandPayload

class OsMinimizeMessage(BaseMessage):
    type: IPCMessageType = IPCMessageType.OS_MINIMIZE
    payload: OsCommandPayload

class OsFocusMessage(BaseMessage):
    type: IPCMessageType = IPCMessageType.OS_FOCUS
    payload: OsCommandPayload

class OsBrowserOpenMessage(BaseMessage):
    type: IPCMessageType = IPCMessageType.OS_BROWSER_OPEN
    payload: OsCommandPayload

