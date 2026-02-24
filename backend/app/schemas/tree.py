import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


class TreeCreate(BaseModel):
    name: str


class TreeOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    created_at: datetime


class NodeData(BaseModel):
    id: str
    first_name: str
    last_name: str
    avatar_thumb_url: str | None
    birth_date: date | None


class ReactFlowNode(BaseModel):
    id: str
    data: NodeData
    position: dict[str, float]


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str


class TreeNodesResponse(BaseModel):
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]
