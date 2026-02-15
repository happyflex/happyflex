from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import asyncio
import aiofiles
import hashlib
import json
import httpx

ROOT_DIR = Path(__file__).parent
DOWNLOADS_DIR = ROOT_DIR / "downloads"
DOWNLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Download Models
class DownloadRequest(BaseModel):
    url: str
    format: str = "mp3"  # mp3 or mp4
    quality: str = "medium"  # low, medium, high

class MediaInfo(BaseModel):
    id: str
    title: str
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    formats: List[Dict] = []
    source_url: str

class DownloadStatus(BaseModel):
    id: str
    status: str  # pending, downloading, completed, failed
    progress: float = 0
    speed: Optional[str] = None
    eta: Optional[str] = None
    error: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    title: Optional[str] = None

# Active downloads tracking
active_downloads: Dict[str, DownloadStatus] = {}

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ============= MEDIA DOWNLOAD ENDPOINTS (COBALT API) =============

# Cobalt API requires authentication in 2025
# We'll try multiple public instances and fallback gracefully

COBALT_API_INSTANCES = [
    "https://api.cobalt.tools",
    "https://cobalt.tools/api"
]

async def call_cobalt_api(url: str, format_type: str, quality: str) -> dict:
    """Call Cobalt API to get download URL"""
    # Map quality to Cobalt format
    quality_map = {
        'low': '480',
        'medium': '720',
        'high': '1080'
    }
    video_quality = quality_map.get(quality, '720')
    
    # Cobalt API payload
    payload = {
        "url": url,
        "downloadMode": "audio" if format_type == "mp3" else "auto",
        "audioFormat": "mp3" if format_type == "mp3" else "best",
        "audioBitrate": "128",
        "videoQuality": video_quality,
        "filenameStyle": "pretty",
        "youtubeVideoCodec": "h264"
    }
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    last_error = None
    
    # Try each Cobalt instance
    for api_url in COBALT_API_INSTANCES:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    api_url,
                    json=payload,
                    headers=headers
                )
                
                logger.info(f"Cobalt API response from {api_url}: status={response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Cobalt API data: {data}")
                    
                    # Check for successful response
                    status = data.get("status")
                    if status in ["tunnel", "redirect", "stream"]:
                        return {
                            "success": True,
                            "url": data.get("url"),
                            "filename": data.get("filename", "download"),
                            "status": status
                        }
                    elif status == "picker":
                        # Multiple options available, pick first
                        picker = data.get("picker", [])
                        if picker:
                            item = picker[0]
                            return {
                                "success": True,
                                "url": item.get("url"),
                                "filename": data.get("filename", "download"),
                                "status": "picker"
                            }
                    elif status == "error":
                        error_data = data.get("error", {})
                        error_code = error_data.get("code", "") if isinstance(error_data, dict) else str(error_data)
                        
                        # Check if it's an auth error
                        if "auth" in error_code.lower():
                            last_error = "Cobalt API vyžaduje autentizaci. YouTube aktivně blokuje stahování bez přihlášení."
                        else:
                            last_error = error_data.get("message", error_code) if isinstance(error_data, dict) else str(error_data)
                        
                        logger.warning(f"Cobalt API error from {api_url}: {last_error}")
                        continue
                else:
                    last_error = f"HTTP {response.status_code}"
                    logger.warning(f"Cobalt API failed from {api_url}: {last_error}")
                    
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Cobalt API exception from {api_url}: {e}")
            continue
    
    return {
        "success": False,
        "error": last_error or "Všechny Cobalt API instance selhaly. YouTube aktivně blokuje stahování bez autentizace."
    }


@api_router.post("/media/info")
async def get_media_info(request: DownloadRequest):
    """Get media info from URL - returns basic info for UI"""
    try:
        # Extract video ID from URL for basic info
        video_id = None
        url = request.url
        
        if "youtube.com" in url or "youtu.be" in url:
            if "youtu.be/" in url:
                video_id = url.split("youtu.be/")[1].split("?")[0].split("/")[0]
            elif "watch?v=" in url:
                video_id = url.split("watch?v=")[1].split("&")[0]
            elif "/shorts/" in url:
                video_id = url.split("/shorts/")[1].split("?")[0].split("/")[0]
        
        # Return basic info - actual download will try Cobalt
        return {
            'id': video_id or str(uuid.uuid4()),
            'title': f"Video {video_id}" if video_id else "Media",
            'duration': None,
            'thumbnail': f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg" if video_id else None,
            'formats': [
                {'format_id': 'mp3', 'ext': 'mp3', 'quality': 'audio', 'filesize_str': '~3-10 MB', 'has_audio': True, 'has_video': False},
                {'format_id': 'mp4_low', 'ext': 'mp4', 'quality': '480p', 'filesize_str': '~10-30 MB', 'has_audio': True, 'has_video': True},
                {'format_id': 'mp4_medium', 'ext': 'mp4', 'quality': '720p', 'filesize_str': '~30-80 MB', 'has_audio': True, 'has_video': True},
                {'format_id': 'mp4_high', 'ext': 'mp4', 'quality': '1080p', 'filesize_str': '~80-200 MB', 'has_audio': True, 'has_video': True},
            ],
            'source_url': request.url,
            'note': 'Stahování z YouTube může vyžadovat autentizaci kvůli omezením platformy.'
        }
            
    except Exception as e:
        logger.error(f"Error getting media info: {e}")
        raise HTTPException(status_code=400, detail=str(e))


def format_size(size_bytes):
    """Format bytes to human readable string"""
    if size_bytes == 0:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


async def download_media_task(download_id: str, url: str, format_type: str, quality: str):
    """Background task to download media using Cobalt API"""
    status = active_downloads.get(download_id)
    if not status:
        return
    
    try:
        status.status = 'downloading'
        status.progress = 10
        
        # Extract title from URL
        video_id = None
        if "youtube.com" in url or "youtu.be" in url:
            if "youtu.be/" in url:
                video_id = url.split("youtu.be/")[1].split("?")[0].split("/")[0]
            elif "watch?v=" in url:
                video_id = url.split("watch?v=")[1].split("&")[0]
            elif "/shorts/" in url:
                video_id = url.split("/shorts/")[1].split("?")[0].split("/")[0]
        
        status.title = f"Video {video_id}" if video_id else "Downloaded Media"
        
        # Try Cobalt API first
        result = await call_cobalt_api(url, format_type, quality)
        
        if not result.get("success"):
            status.status = 'failed'
            status.error = result.get("error", "Stahování selhalo. YouTube blokuje stahování ze serverových prostředí.")
            logger.error(f"Cobalt API failed: {result.get('error')}")
            return
        
        download_url = result.get("url")
        filename = result.get("filename", "download")
        if filename:
            status.title = filename.replace(".mp4", "").replace(".mp3", "").replace(".webm", "")
        
        status.progress = 20
        
        # Download the file
        ext = format_type if format_type in ['mp3', 'mp4'] else 'mp4'
        file_path = DOWNLOADS_DIR / f"{download_id}.{ext}"
        
        async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
            async with client.stream("GET", download_url) as response:
                if response.status_code != 200:
                    status.status = 'failed'
                    status.error = f"Stahování selhalo: HTTP {response.status_code}"
                    return
                
                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0
                
                async with aiofiles.open(file_path, 'wb') as f:
                    async for chunk in response.aiter_bytes(chunk_size=1024*1024):
                        await f.write(chunk)
                        downloaded += len(chunk)
                        
                        if total_size > 0:
                            progress = 20 + (downloaded / total_size) * 75
                            status.progress = min(95, progress)
                        else:
                            status.progress = min(95, status.progress + 5)
        
        if file_path.exists():
            status.status = 'completed'
            status.progress = 100
            status.file_path = str(file_path)
            status.file_size = file_path.stat().st_size
            
            # Save metadata
            metadata = {
                'id': download_id,
                'title': status.title,
                'source_url': url,
                'file_path': str(file_path),
                'file_size': status.file_size,
                'format': format_type,
                'quality': quality,
                'downloaded_at': datetime.now(timezone.utc).isoformat()
            }
            
            metadata_path = DOWNLOADS_DIR / f"{download_id}.json"
            async with aiofiles.open(metadata_path, 'w') as f:
                await f.write(json.dumps(metadata, indent=2))
            
            logger.info(f"Download completed: {file_path}")
        else:
            status.status = 'failed'
            status.error = 'Stažený soubor nebyl nalezen'
            
    except httpx.TimeoutException:
        status.status = 'failed'
        status.error = 'Časový limit vypršel při stahování'
    except Exception as e:
        logger.error(f"Download error: {e}")
        status.status = 'failed'
        status.error = f"Chyba při stahování: {str(e)}"


@api_router.post("/media/download")
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Start media download"""
    download_id = str(uuid.uuid4())
    
    # Initialize status
    active_downloads[download_id] = DownloadStatus(
        id=download_id,
        status='pending',
        progress=0
    )
    
    # Start download in background
    background_tasks.add_task(
        download_media_task,
        download_id,
        request.url,
        request.format,
        request.quality
    )
    
    return {'download_id': download_id, 'status': 'started'}


@api_router.get("/media/download/{download_id}/status")
async def get_download_status(download_id: str):
    """Get download status"""
    if download_id not in active_downloads:
        raise HTTPException(status_code=404, detail="Download not found")
    
    return active_downloads[download_id]


@api_router.get("/media/download/{download_id}/file")
async def get_downloaded_file(download_id: str):
    """Get the downloaded file for browser download"""
    file_path = None
    title = None
    
    # First check active downloads
    if download_id in active_downloads:
        status = active_downloads[download_id]
        if status.status != 'completed' or not status.file_path:
            raise HTTPException(status_code=400, detail="Download not completed")
        file_path = Path(status.file_path)
        title = status.title
    else:
        # Check saved metadata
        metadata_path = DOWNLOADS_DIR / f"{download_id}.json"
        if metadata_path.exists():
            async with aiofiles.open(metadata_path, 'r') as f:
                content = await f.read()
                metadata = json.loads(content)
                file_path = Path(metadata.get('file_path', ''))
                title = metadata.get('title', download_id)
        else:
            # Try to find file directly
            for f in DOWNLOADS_DIR.glob(f"{download_id}.*"):
                if f.suffix in ['.mp3', '.mp4', '.m4a', '.webm']:
                    file_path = f
                    title = download_id
                    break
    
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Sanitize filename for download
    safe_title = "".join(c for c in (title or download_id) if c.isalnum() or c in ' -_').strip()
    if not safe_title:
        safe_title = download_id
    
    return FileResponse(
        path=str(file_path),
        filename=f"{safe_title}{file_path.suffix}",
        media_type='audio/mpeg' if file_path.suffix == '.mp3' else 'video/mp4'
    )


@api_router.get("/media/downloads")
async def list_downloads():
    """List all downloads"""
    downloads = []
    for meta_file in DOWNLOADS_DIR.glob("*.json"):
        try:
            async with aiofiles.open(meta_file, 'r') as f:
                content = await f.read()
                metadata = json.loads(content)
                downloads.append(metadata)
        except Exception as e:
            logger.error(f"Error reading metadata: {e}")
    
    return downloads


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()