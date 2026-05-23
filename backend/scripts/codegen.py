"""Generate TypeScript type definitions from Pydantic schemas.

Usage:
    python -m scripts.codegen       # from backend/
    python backend/scripts/codegen.py # from repo root
    npm run codegen                  # from frontend/

Output: frontend/types/generated/schemas.ts
"""
import importlib
import inspect
import pkgutil
import sys
from pathlib import Path
from enum import Enum
from types import UnionType
from typing import get_origin, get_args, Optional, List, Dict, Any, Union

from pydantic import BaseModel
from pydantic.fields import FieldInfo

BACKEND_DIR = Path(__file__).resolve().parent.parent
# Ensure backend is on sys.path (works when script is run from any cwd)
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

FRONTEND_TYPES_DIR = BACKEND_DIR.parent / "frontend" / "types" / "generated"

SCHEMA_PACKAGE = "schemas"
SKIP_MODEL_NAMES: set[str] = set()

PYTHON_TO_TS = {
    "str": "string",
    "int": "number",
    "float": "number",
    "bool": "boolean",
    "Any": "any",
    "dict": "Record<string, any>",
    "list": "any[]",
}

ENUM_TYPES: dict[str, type] = {}


def _resolve_annotation(annotation):
    """Resolve forward references and return the actual type."""
    if hasattr(annotation, "__forward_arg__"):
        return annotation
    return annotation


def _get_ts_type(annotation, models: dict[str, type], depth: int = 0) -> str:
    if depth > 10:
        return "any"

    # Handle forward references
    if isinstance(annotation, str):
        if annotation in models:
            return annotation
        return annotation

    origin = get_origin(annotation)
    args = get_args(annotation)

    # Plain type
    if origin is None:
        if annotation is type(None) or annotation is None:
            return "null"
        if isinstance(annotation, type) and issubclass(annotation, Enum):
            name = annotation.__name__
            ENUM_TYPES[name] = annotation
            return name
        if isinstance(annotation, type) and issubclass(annotation, BaseModel):
            return annotation.__name__
        name = getattr(annotation, "__name__", str(annotation))
        if name in models:
            return name
        return PYTHON_TO_TS.get(name, name)

    # Union types (including Optional)
    if origin is Union or origin is UnionType:
        non_none = [a for a in args if a is not type(None) and a is not None]
        none_count = sum(1 for a in args if a is type(None) or a is None)
        if len(non_none) == 1:
            inner = _get_ts_type(non_none[0], models, depth + 1)
            return f"{inner} | null" if none_count > 0 else inner
        parts = [_get_ts_type(a, models, depth + 1) for a in non_none]
        result = " | ".join(parts)
        if none_count > 0:
            result = f"{result} | null"
        return result

    # List
    if origin is list or origin is List:
        if args:
            inner = _get_ts_type(args[0], models, depth + 1)
            return f"{inner}[]"
        return "any[]"

    # Dict
    if origin is dict or origin is Dict:
        if args and len(args) == 2:
            val = _get_ts_type(args[1], models, depth + 1)
            return f"Record<string, {val}>"
        return "Record<string, any>"

    return "any"


def _has_default(field: FieldInfo) -> bool:
    """Check if a field has a default value (making it optional at the schema level)."""
    return field.default is not None or field.default is not ...


def _is_truly_optional(annotation) -> bool:
    """Check if the annotation includes None/NoneType."""
    if annotation is None:
        return True
    origin = get_origin(annotation)
    if origin is Union or origin is UnionType:
        args = get_args(annotation)
        return any(a is type(None) for a in args)
    return False


def _generate_enum(enum_cls) -> str:
    name = enum_cls.__name__
    values = [f'  | "{e.value}"' for e in enum_cls]
    return f"export type {name} =\n" + "\n".join(values) + ";\n"


def _generate_interface(model_cls, models: dict[str, type]) -> str:
    name = model_cls.__name__
    lines = [f"export interface {name} {{"]

    for field_name, field_info in model_cls.model_fields.items():
        annotation = field_info.annotation

        # Skip fields excluded from serialization
        if field_info.exclude:
            continue

        ts_type = _get_ts_type(annotation, models)
        is_optional = _is_truly_optional(annotation)
        optional_mark = "?" if is_optional else ""

        doc = field_info.description or ""
        # Use schema default as doc hint if present
        if field_info.default is not None and field_info.default is not ... and not is_optional:
            if isinstance(field_info.default, str):
                doc = doc or f"Default: '{field_info.default}'"
            elif isinstance(field_info.default, (int, float, bool)):
                doc = doc or f"Default: {field_info.default}"

        sanitized = doc.replace("*/", "* /").replace("\n", " ")
        comment = f"  // {sanitized}" if doc else ""

        lines.append(f"  {field_name}{optional_mark}: {ts_type};{comment}")

    lines.append("}")
    return "\n".join(lines) + "\n"


def discover_models(package_name: str = SCHEMA_PACKAGE) -> dict[str, type]:
    import schemas  # noqa: F401
    models: dict[str, type] = {}
    pkg_path = BACKEND_DIR / package_name.replace(".", "/")

    for importer, modname, ispkg in pkgutil.iter_modules([str(pkg_path)]):
        full_modname = f"{package_name}.{modname}"
        try:
            mod = importlib.import_module(full_modname)
        except Exception:
            continue

        for name, obj in inspect.getmembers(mod, inspect.isclass):
            if name in SKIP_MODEL_NAMES:
                continue
            if isinstance(obj, type) and issubclass(obj, BaseModel) and obj is not BaseModel:
                models[name] = obj
            elif isinstance(obj, type) and issubclass(obj, Enum) and obj is not Enum:
                models[name] = obj

    return models


def main():
    models = discover_models()
    output_lines = [
        "// Auto-generated by backend/scripts/codegen.py",
        "// Do not edit manually — regenerate with: python -m scripts.codegen",
        "",
    ]

    # Generate enums first
    for name in sorted(models):
        cls = models[name]
        if isinstance(cls, type) and issubclass(cls, Enum) and cls is not Enum:
            output_lines.append(_generate_enum(cls))
            output_lines.append("")

    # Generate interfaces
    for name in sorted(models):
        cls = models[name]
        if isinstance(cls, type) and issubclass(cls, BaseModel) and cls is not BaseModel:
            output_lines.append(_generate_interface(cls, models))
            output_lines.append("")

    FRONTEND_TYPES_DIR.mkdir(parents=True, exist_ok=True)
    out_path = FRONTEND_TYPES_DIR / "schemas.ts"
    out_path.write_text("\n".join(output_lines), encoding="utf-8")
    print(f"Generated {out_path} ({len(output_lines)} lines, {len(models)} types)")


if __name__ == "__main__":
    main()
