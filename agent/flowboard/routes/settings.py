import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from flowboard.config import STORAGE_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = STORAGE_DIR / "settings.json"

class LocalSettings(BaseModel):
    auto_export: bool = False
    output_dir: str = ""

def get_local_settings() -> dict:
    if not SETTINGS_FILE.exists():
        default_settings = {
            "auto_export": False,
            "output_dir": str(STORAGE_DIR / "output")
        }
        try:
            SETTINGS_FILE.write_text(json.dumps(default_settings, indent=2), encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to write default settings: {e}")
        return default_settings

    try:
        data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        if "output_dir" not in data or not data["output_dir"]:
            data["output_dir"] = str(STORAGE_DIR / "output")
        return data
    except Exception as e:
        logger.error(f"Failed to read settings: {e}")
        return {
            "auto_export": False,
            "output_dir": str(STORAGE_DIR / "output")
        }

@router.get("/local")
def get_settings() -> dict:
    return get_local_settings()

@router.post("/local")
def save_settings(settings: LocalSettings) -> dict:
    output_path_str = settings.output_dir.strip()
    if not output_path_str:
        output_path_str = str(STORAGE_DIR / "output")
    
    # Try to resolve and create output directory
    try:
        output_path = Path(output_path_str).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
        output_path_str = str(output_path)
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid output directory path or permission denied: {e}"
        )

    updated = {
        "auto_export": settings.auto_export,
        "output_dir": output_path_str
    }

    try:
        SETTINGS_FILE.write_text(json.dumps(updated, indent=2), encoding="utf-8")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save settings file: {e}"
        )

    return {"ok": True, "settings": updated}

@router.post("/open-output")
def open_output_folder() -> dict:
    settings = get_local_settings()
    output_dir = settings.get("output_dir")
    
    if not output_dir:
        output_dir = str(STORAGE_DIR / "output")
        
    path = Path(output_dir)
    try:
        path.mkdir(parents=True, exist_ok=True)
        # Windows explorer startfile
        os.startfile(str(path))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to open explorer: {e}"
        )

class RevealRequest(BaseModel):
    media_id: str

@router.post("/reveal-file")
def reveal_file(req: RevealRequest) -> dict:
    from flowboard.services import media as media_service
    
    media_id = media_service.normalize_media_id(req.media_id)
    if not media_service.is_valid_media_id(media_id):
        raise HTTPException(status_code=400, detail="Invalid media_id")

    settings = get_local_settings()
    output_dir = settings.get("output_dir")
    if not output_dir:
        output_dir = str(STORAGE_DIR / "output")

    # Search in output directory first, then fallback to cache directory
    target_file: Optional[Path] = None
    
    # 1. Search in output directory
    out_path = Path(output_dir)
    if out_path.exists():
        # Match anything ending with {media_id}.ext
        for p in out_path.glob(f"*{media_id}.*"):
            if p.is_file():
                target_file = p
                break
                
    # 2. Search in media cache
    if not target_file:
        target_file = media_service.cached_path(media_id)

    if not target_file or not target_file.exists():
        raise HTTPException(status_code=404, detail="Media file not found locally")

    try:
        # Highlight file in Windows Explorer
        subprocess.run(["explorer.exe", "/select,", str(target_file.resolve())], check=False)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reveal file in explorer: {e}"
        )
