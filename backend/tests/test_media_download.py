"""
Backend tests for Media Download API endpoints
Tests: /api/media/info, /api/media/download, /api/media/download/{id}/status, /api/media/download/{id}/file
"""

import pytest
import requests
import time
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test YouTube URL (short video for faster testing)
TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


class TestMediaInfo:
    """Test /api/media/info endpoint - fetches media metadata"""
    
    def test_media_info_youtube_url_success(self):
        """Test that /api/media/info returns correct metadata for YouTube URL"""
        response = requests.post(
            f"{BASE_URL}/api/media/info",
            json={"url": TEST_YOUTUBE_URL},
            timeout=60
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "title" in data, "Response should contain 'title'"
        assert "duration" in data, "Response should contain 'duration'"
        assert "formats" in data, "Response should contain 'formats'"
        assert isinstance(data["formats"], list), "Formats should be a list"
        assert len(data["formats"]) > 0, "Should have at least one format"
        
        # Verify YouTube video ID
        assert data["id"] == "dQw4w9WgXcQ", f"Expected video ID dQw4w9WgXcQ, got {data['id']}"
        
        # Verify title contains expected text
        assert "Rick Astley" in data["title"] or "Never Gonna" in data["title"], f"Unexpected title: {data['title']}"
        
        # Verify duration is reasonable (around 3.5 minutes = 210-215 seconds)
        assert data["duration"] is not None
        assert 200 < data["duration"] < 250, f"Duration {data['duration']} seems incorrect for this video"
        
        print(f"✅ Media info success: {data['title']} ({data['duration']}s)")
    
    def test_media_info_with_format_options(self):
        """Test that format options include mp3 audio"""
        response = requests.post(
            f"{BASE_URL}/api/media/info",
            json={"url": TEST_YOUTUBE_URL, "format": "mp3"},
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for mp3 format option
        mp3_formats = [f for f in data["formats"] if f.get("ext") == "mp3"]
        assert len(mp3_formats) > 0, "Should have mp3 format option"
        
        print(f"✅ MP3 format available: {mp3_formats}")
    
    def test_media_info_invalid_url(self):
        """Test that invalid URL returns error"""
        response = requests.post(
            f"{BASE_URL}/api/media/info",
            json={"url": "https://invalid-url.fake/video"},
            timeout=60
        )
        
        # Should return 400 for invalid URL
        assert response.status_code == 400, f"Expected 400 for invalid URL, got {response.status_code}"
        print("✅ Invalid URL correctly returns 400")


class TestMediaDownload:
    """Test /api/media/download endpoint - starts download"""
    
    def test_start_download_success(self):
        """Test that download starts and returns download_id"""
        response = requests.post(
            f"{BASE_URL}/api/media/download",
            json={
                "url": TEST_YOUTUBE_URL,
                "format": "mp3",
                "quality": "low"  # Use low quality for faster test
            },
            timeout=60
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "download_id" in data, "Response should contain 'download_id'"
        assert "status" in data, "Response should contain 'status'"
        assert data["status"] == "started", f"Expected status 'started', got {data['status']}"
        assert isinstance(data["download_id"], str), "download_id should be a string"
        assert len(data["download_id"]) > 0, "download_id should not be empty"
        
        print(f"✅ Download started with ID: {data['download_id']}")
        return data["download_id"]


class TestDownloadStatus:
    """Test /api/media/download/{id}/status endpoint"""
    
    def test_download_status_flow(self):
        """Test complete download flow: start -> poll status -> completion"""
        # Step 1: Start download
        start_response = requests.post(
            f"{BASE_URL}/api/media/download",
            json={
                "url": TEST_YOUTUBE_URL,
                "format": "mp3",
                "quality": "low"
            },
            timeout=60
        )
        
        assert start_response.status_code == 200
        download_id = start_response.json()["download_id"]
        print(f"Download started: {download_id}")
        
        # Step 2: Poll for status until completed or failed (max 120 seconds)
        max_wait = 120
        poll_interval = 3
        elapsed = 0
        final_status = None
        
        while elapsed < max_wait:
            status_response = requests.get(
                f"{BASE_URL}/api/media/download/{download_id}/status",
                timeout=30
            )
            
            assert status_response.status_code == 200, f"Status check failed: {status_response.status_code}"
            
            status = status_response.json()
            print(f"Status: {status['status']} - Progress: {status.get('progress', 0):.1f}%")
            
            # Verify status structure
            assert "id" in status
            assert "status" in status
            assert "progress" in status
            
            if status["status"] in ["completed", "failed"]:
                final_status = status
                break
            
            time.sleep(poll_interval)
            elapsed += poll_interval
        
        # Step 3: Verify completion
        assert final_status is not None, f"Download did not complete within {max_wait} seconds"
        assert final_status["status"] == "completed", f"Download failed: {final_status.get('error', 'Unknown error')}"
        
        # Verify completion data
        assert final_status["progress"] == 100, f"Progress should be 100, got {final_status['progress']}"
        assert final_status.get("title") is not None, "Title should be set on completion"
        assert "Rick Astley" in final_status["title"] or "Never Gonna" in final_status["title"], \
            f"Title should contain 'Rick Astley': {final_status['title']}"
        
        print(f"✅ Download completed: {final_status['title']}")
        return download_id, final_status
    
    def test_download_status_nonexistent_id(self):
        """Test that nonexistent download ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/media/download/nonexistent-id-12345/status",
            timeout=30
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Nonexistent ID correctly returns 404")


class TestDownloadFile:
    """Test /api/media/download/{id}/file endpoint - file retrieval"""
    
    def test_download_file_after_completion(self):
        """Test that completed download returns file for browser download"""
        # First, do a complete download
        start_response = requests.post(
            f"{BASE_URL}/api/media/download",
            json={
                "url": TEST_YOUTUBE_URL,
                "format": "mp3",
                "quality": "low"
            },
            timeout=60
        )
        
        assert start_response.status_code == 200
        download_id = start_response.json()["download_id"]
        
        # Wait for completion
        max_wait = 120
        poll_interval = 3
        elapsed = 0
        
        while elapsed < max_wait:
            status_response = requests.get(
                f"{BASE_URL}/api/media/download/{download_id}/status",
                timeout=30
            )
            status = status_response.json()
            
            if status["status"] == "completed":
                break
            elif status["status"] == "failed":
                pytest.fail(f"Download failed: {status.get('error')}")
            
            time.sleep(poll_interval)
            elapsed += poll_interval
        
        # Now test file endpoint
        file_response = requests.get(
            f"{BASE_URL}/api/media/download/{download_id}/file",
            timeout=60,
            stream=True  # Important: stream large files
        )
        
        # Status assertion
        assert file_response.status_code == 200, f"Expected 200, got {file_response.status_code}: {file_response.text}"
        
        # Check Content-Type header
        content_type = file_response.headers.get("Content-Type", "")
        assert "audio" in content_type or "mpeg" in content_type, \
            f"Expected audio content type, got {content_type}"
        
        # Check Content-Disposition header for filename
        content_disp = file_response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp or "filename" in content_disp, \
            f"Expected file attachment header, got {content_disp}"
        
        # Verify file has content
        content_length = file_response.headers.get("Content-Length")
        if content_length:
            assert int(content_length) > 0, "File should have content"
            print(f"✅ File size: {int(content_length)} bytes")
        
        # Read first chunk to verify it's actual audio data
        first_chunk = next(file_response.iter_content(chunk_size=1024))
        assert len(first_chunk) > 0, "File should have downloadable content"
        
        print(f"✅ File download working for ID: {download_id}")
    
    def test_download_file_nonexistent_id(self):
        """Test that nonexistent download ID returns 404 for file"""
        response = requests.get(
            f"{BASE_URL}/api/media/download/nonexistent-id-12345/file",
            timeout=30
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Nonexistent ID correctly returns 404 for file endpoint")


class TestMediaDownloads:
    """Test /api/media/downloads endpoint - list all downloads"""
    
    def test_list_downloads(self):
        """Test that downloads list returns array"""
        response = requests.get(
            f"{BASE_URL}/api/media/downloads",
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ Downloads list returned {len(data)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
