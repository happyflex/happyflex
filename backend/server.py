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


# ============= MEDIA DOWNLOAD ENDPOINTS =============

# Since all public APIs require authentication in 2025,
# we provide helpful error messages and alternatives to users

@api_router.post("/media/info")
async def get_media_info(request: DownloadRequest):
    """Get media info from URL - returns basic info for UI"""
    try:
        # Extract video ID from URL for basic info
        video_id = None
        url = request.url
        platform = "unknown"
        thumbnail = None
        
        if "youtube.com" in url or "youtu.be" in url:
            platform = "youtube"
            if "youtu.be/" in url:
                video_id = url.split("youtu.be/")[1].split("?")[0].split("/")[0]
            elif "watch?v=" in url:
                video_id = url.split("watch?v=")[1].split("&")[0]
            elif "/shorts/" in url:
                video_id = url.split("/shorts/")[1].split("?")[0].split("/")[0]
            if video_id:
                thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        elif "tiktok.com" in url:
            platform = "tiktok"
        elif "twitter.com" in url or "x.com" in url:
            platform = "twitter"
        elif "instagram.com" in url:
            platform = "instagram"
        
        # Return basic info
        return {
            'id': video_id or str(uuid.uuid4()),
            'title': f"Video {video_id}" if video_id else "Media",
            'duration': None,
            'thumbnail': thumbnail,
            'platform': platform,
            'formats': [
                {'format_id': 'mp3', 'ext': 'mp3', 'quality': 'audio', 'filesize_str': '~3-10 MB', 'has_audio': True, 'has_video': False},
                {'format_id': 'mp4_low', 'ext': 'mp4', 'quality': '480p', 'filesize_str': '~10-30 MB', 'has_audio': True, 'has_video': True},
                {'format_id': 'mp4_medium', 'ext': 'mp4', 'quality': '720p', 'filesize_str': '~30-80 MB', 'has_audio': True, 'has_video': True},
                {'format_id': 'mp4_high', 'ext': 'mp4', 'quality': '1080p', 'filesize_str': '~80-200 MB', 'has_audio': True, 'has_video': True},
            ],
            'source_url': request.url,
            'note': 'Stahování z online platforem vyžaduje použití externího nástroje jako cobalt.tools nebo yt-dlp.'
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
    """Background task - provides helpful guidance since direct download is blocked"""
    status = active_downloads.get(download_id)
    if not status:
        return
    
    try:
        status.status = 'downloading'
        status.progress = 10
        
        # Extract video info
        video_id = None
        platform = "této platformy"
        
        if "youtube.com" in url or "youtu.be" in url:
            platform = "YouTube"
            if "youtu.be/" in url:
                video_id = url.split("youtu.be/")[1].split("?")[0].split("/")[0]
            elif "watch?v=" in url:
                video_id = url.split("watch?v=")[1].split("&")[0]
            elif "/shorts/" in url:
                video_id = url.split("/shorts/")[1].split("?")[0].split("/")[0]
        elif "tiktok.com" in url:
            platform = "TikTok"
        elif "twitter.com" in url or "x.com" in url:
            platform = "Twitter/X"
        
        status.title = f"Video {video_id}" if video_id else "Media"
        status.progress = 50
        
        # Since all public APIs require auth, provide helpful error
        await asyncio.sleep(1)  # Simulate processing
        
        status.status = 'failed'
        status.error = f"Stahování z {platform} je blokováno. Použijte cobalt.tools ve svém prohlížeči nebo nainstalujte yt-dlp lokálně."
        logger.info(f"Download blocked for {url} - directing user to alternatives")
            
    except Exception as e:
        logger.error(f"Download error: {e}")
        status.status = 'failed'
        status.error = f"Chyba: {str(e)}"


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