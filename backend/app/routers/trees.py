import uuid
from collections import defaultdict, deque

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models.relationship import Relationship, RelationshipType
from app.models.tree import Tree
from app.schemas.tree import (
    NodeData,
    ReactFlowEdge,
    ReactFlowNode,
    TreeCreate,
    TreeNodesResponse,
    TreeOut,
)

router = APIRouter()
logger = structlog.get_logger()


@router.get("/trees", response_model=list[TreeOut])
async def list_trees(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tree).where(Tree.owner_id == current_user.id).order_by(Tree.created_at.desc())
    )
    return result.scalars().all()


@router.post("/trees", response_model=TreeOut, status_code=status.HTTP_201_CREATED)
async def create_tree(
    payload: TreeCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    tree = Tree(owner_id=current_user.id, name=payload.name)
    db.add(tree)
    await db.flush()
    await db.refresh(tree)
    logger.info("Tree created", tree_id=str(tree.id), owner_id=str(current_user.id))
    return tree


@router.delete("/trees/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tree(
    tree_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = result.scalar_one_or_none()

    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tree not found")

    if tree.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the tree owner")

    await db.delete(tree)
    logger.info("Tree deleted", tree_id=str(tree_id))


@router.get("/trees/{tree_id}/nodes", response_model=TreeNodesResponse)
async def get_tree_nodes(
    tree_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = result.scalar_one_or_none()
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tree not found")

    if tree.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    from app.models.person import Person

    persons_result = await db.execute(select(Person).where(Person.tree_id == tree_id))
    persons = persons_result.scalars().all()

    rels_result = await db.execute(select(Relationship).where(Relationship.tree_id == tree_id))
    relationships = rels_result.scalars().all()

    children_map: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    parent_map: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)

    for rel in relationships:
        if rel.relationship_type == RelationshipType.parent:
            children_map[rel.person_id].append(rel.related_person_id)
            parent_map[rel.related_person_id].append(rel.person_id)

    person_ids = {p.id for p in persons}
    root_ids = [pid for pid in person_ids if not parent_map.get(pid)]

    generation: dict[uuid.UUID, int] = {}
    queue: deque[uuid.UUID] = deque()

    for root_id in root_ids:
        generation[root_id] = 0
        queue.append(root_id)

    while queue:
        current_id = queue.popleft()
        current_gen = generation[current_id]
        for child_id in children_map.get(current_id, []):
            if child_id not in generation:
                generation[child_id] = current_gen + 1
                queue.append(child_id)

    for p in persons:
        if p.id not in generation:
            generation[p.id] = 0

    gen_to_persons: dict[int, list[uuid.UUID]] = defaultdict(list)
    for pid, gen in generation.items():
        gen_to_persons[gen].append(pid)

    positions: dict[uuid.UUID, dict[str, float]] = {}
    for gen, pids in gen_to_persons.items():
        for idx, pid in enumerate(pids):
            positions[pid] = {"x": float(idx * 200), "y": float(gen * 200)}

    person_map = {p.id: p for p in persons}

    nodes = []
    for p in persons:
        pos = positions.get(p.id, {"x": 0.0, "y": 0.0})
        nodes.append(
            ReactFlowNode(
                id=str(p.id),
                data=NodeData(
                    id=str(p.id),
                    first_name=p.first_name,
                    last_name=p.last_name,
                    avatar_thumb_url=p.avatar_thumb_url,
                    birth_date=p.birth_date,
                ),
                position=pos,
            )
        )

    edges = []
    for rel in relationships:
        edges.append(
            ReactFlowEdge(
                id=str(rel.id),
                source=str(rel.person_id),
                target=str(rel.related_person_id),
                type=rel.relationship_type.value,
            )
        )

    return TreeNodesResponse(nodes=nodes, edges=edges)
