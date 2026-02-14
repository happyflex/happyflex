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
import yt_dlp
import subprocess


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

@api_router.post("/media/info")
async def get_media_info(request: DownloadRequest):
    """Get media info and available formats from URL"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            # Anti-bot bypass options
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            'socket_timeout': 30,
            'nocheckcertificate': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            
            # Process formats
            formats = []
            seen_qualities = set()
            
            for f in info.get('formats', []):
                ext = f.get('ext', '')
                quality = f.get('format_note', f.get('height', 'unknown'))
                filesize = f.get('filesize') or f.get('filesize_approx', 0)
                
                # Skip duplicates
                key = f"{ext}_{quality}"
                if key in seen_qualities:
                    continue
                seen_qualities.add(key)
                
                if ext in ['mp4', 'webm', 'm4a', 'mp3']:
                    formats.append({
                        'format_id': f.get('format_id'),
                        'ext': ext,
                        'quality': str(quality),
                        'filesize': filesize,
                        'filesize_str': format_size(filesize) if filesize else 'Unknown',
                        'has_audio': f.get('acodec', 'none') != 'none',
                        'has_video': f.get('vcodec', 'none') != 'none',
                    })
            
            # Add audio-only options
            formats.append({
                'format_id': 'bestaudio',
                'ext': 'mp3',
                'quality': 'best',
                'filesize': 0,
                'filesize_str': '~3-10 MB',
                'has_audio': True,
                'has_video': False,
            })
            
            return {
                'id': info.get('id', str(uuid.uuid4())),
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration'),
                'thumbnail': info.get('thumbnail'),
                'formats': formats,
                'source_url': request.url
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


def progress_hook(d, download_id):
    """Hook to track download progress"""
    if download_id not in active_downloads:
        return
    
    status = active_downloads[download_id]
    
    if d['status'] == 'downloading':
        status.status = 'downloading'
        total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
        downloaded = d.get('downloaded_bytes', 0)
        
        if total > 0:
            status.progress = (downloaded / total) * 100
        
        status.speed = d.get('_speed_str', '')
        status.eta = d.get('_eta_str', '')
        
    elif d['status'] == 'finished':
        status.status = 'processing'
        status.progress = 95


async def download_media_task(download_id: str, url: str, format_type: str, quality: str):
    """Background task to download media"""
    status = active_downloads.get(download_id)
    if not status:
        return
    
    try:
        output_template = str(DOWNLOADS_DIR / f"{download_id}.%(ext)s")
        
        # Enhanced options - use specific format IDs that are known to work
        ydl_opts = {
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'progress_hooks': [lambda d: progress_hook(d, download_id)],
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            'socket_timeout': 30,
            'retries': 10,
            'fragment_retries': 10,
            'nocheckcertificate': True,
        }
        
        if format_type == 'mp3':
            # Use format 140 (m4a audio) which is commonly available
            ydl_opts['format'] = '140/bestaudio'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192' if quality == 'high' else '128' if quality == 'medium' else '96',
            }]
        else:  # mp4
            if quality == 'high':
                # 137 = 1080p video, 140 = audio
                ydl_opts['format'] = '137+140/136+140/bestvideo+bestaudio/best'
            elif quality == 'low':
                # 160 = 144p video
                ydl_opts['format'] = '160+140/worstvideo+bestaudio/worst'
            else:
                # 136 = 720p video
                ydl_opts['format'] = '136+140/135+140/bestvideo[height<=720]+bestaudio/best'
            
            ydl_opts['merge_output_format'] = 'mp4'
        
        # Run yt-dlp in thread pool
        loop = asyncio.get_event_loop()
        
        def do_download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                return info
        
        info = await loop.run_in_executor(None, do_download)
        
        # Find the downloaded file
        ext = 'mp3' if format_type == 'mp3' else 'mp4'
        file_path = DOWNLOADS_DIR / f"{download_id}.{ext}"
        
        if not file_path.exists():
            # Try to find any file with download_id
            for f in DOWNLOADS_DIR.glob(f"{download_id}.*"):
                file_path = f
                break
        
        if file_path.exists():
            # Calculate checksum
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            
            status.status = 'completed'
            status.progress = 100
            status.file_path = str(file_path)
            status.file_size = file_path.stat().st_size
            status.title = info.get('title', 'Unknown')
            
            # Save metadata
            metadata = {
                'id': download_id,
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration'),
                'source_url': url,
                'file_path': str(file_path),
                'file_size': status.file_size,
                'format': format_type,
                'quality': quality,
                'checksum': sha256_hash.hexdigest(),
                'downloaded_at': datetime.now(timezone.utc).isoformat()
            }
            
            metadata_path = DOWNLOADS_DIR / f"{download_id}.json"
            async with aiofiles.open(metadata_path, 'w') as f:
                await f.write(json.dumps(metadata, indent=2))
        else:
            status.status = 'failed'
            status.error = 'Downloaded file not found'
            
    except Exception as e:
        logger.error(f"Download error: {e}")
        status.status = 'failed'
        status.error = str(e)


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
    """Get the downloaded file"""
    if download_id not in active_downloads:
        raise HTTPException(status_code=404, detail="Download not found")
    
    status = active_downloads[download_id]
    
    if status.status != 'completed' or not status.file_path:
        raise HTTPException(status_code=400, detail="Download not completed")
    
    file_path = Path(status.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=f"{status.title or download_id}{file_path.suffix}",
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