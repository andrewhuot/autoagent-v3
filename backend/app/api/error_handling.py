"""Shared API-layer error-handling helpers."""

from __future__ import annotations

import logging
from enum import Enum
from typing import TypeVar

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

EnumType = TypeVar("EnumType", bound=Enum)


def parse_enum_value(value: str, enum_cls: type[EnumType], field_name: str) -> EnumType:
    """Translate user-provided enum strings into 400 responses when invalid."""

    try:
        return enum_cls(value)
    except ValueError as exc:
        allowed = ", ".join(member.value for member in enum_cls)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}: '{value}'. Expected one of: {allowed}",
        ) from exc


def commit_with_rollback(db: Session, action: str) -> None:
    """Commit writes and rollback with a clear 500 when persistence fails."""

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while attempting to %s", action)
        raise HTTPException(status_code=500, detail=f"Failed to {action}. Please retry.") from exc
