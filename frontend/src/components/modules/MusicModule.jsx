import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, List, Music, Film, Link2, Plus, Trash2, 
  Edit3, ChevronDown, ChevronUp, Upload, X, GripVertical,
  Minimize2, Maximize2, Library, ListMusic, Download, Loader2, Check,
  AlertCircle, HardDrive
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

// Storage keys
const STORAGE_KEYS = {
  library: 'steward_music_library',
  playlists: 'steward_music_playlists',
  state: 'steward_music_state'
};

// Media types
const MEDIA_TYPES = {
  audio: { icon: Music, label: 'Audio', color: 'text-cyan-400' },
  video: { icon: Film, label: 'Video', color: 'text-purple-400' },
  link: { icon: Link2, label: 'Link', color: 'text-yellow-400' }
};

const MusicModule = () => {
  // State
  const [activeTab, setActiveTab] = useState('player'); // player, library, playlists
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [miniMode, setMiniMode] = useState(false);
  const [error, setError] = useState(null);
  const [currentLibraryItem, setCurrentLibraryItem] = useState(null); // Direct library playback
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [newItemForm, setNewItemForm] = useState({ title: '', type: 'audio', source: '', tags: '' });
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // Download states
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadFormat, setDownloadFormat] = useState('mp3');
  const [downloadQuality, setDownloadQuality] = useState('medium');
  const [mediaInfo, setMediaInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [activeDownload, setActiveDownload] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  
  // Refs
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const downloadPollRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    const storedLibrary = localStorage.getItem(STORAGE_KEYS.library);
    const storedPlaylists = localStorage.getItem(STORAGE_KEYS.playlists);
    const storedState = localStorage.getItem(STORAGE_KEYS.state);
    
    if (storedLibrary) setLibrary(JSON.parse(storedLibrary));
    if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
    if (storedState) {
      const state = JSON.parse(storedState);
      setCurrentPlaylist(state.currentPlaylist);
      setCurrentTrackIndex(state.currentTrackIndex || 0);
      setVolume(state.volume ?? 0.7);
      setIsRepeat(state.isRepeat || false);
      setIsShuffle(state.isShuffle || false);
    }
  }, []);

  // Save library to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.library, JSON.stringify(library));
  }, [library]);

  // Save playlists to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.playlists, JSON.stringify(playlists));
  }, [playlists]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.state, JSON.stringify({
      currentPlaylist,
      currentTrackIndex,
      volume,
      isRepeat,
      isShuffle
    }));
  }, [currentPlaylist, currentTrackIndex, volume, isRepeat, isShuffle]);

  // Get current track
  const getCurrentTrack = useCallback(() => {
    // If playing from library directly
    if (currentLibraryItem) {
      return currentLibraryItem;
    }
    // If playing from playlist
    if (!currentPlaylist) return null;
    const playlist = playlists.find(p => p.id === currentPlaylist);
    if (!playlist || !playlist.items.length) return null;
    return playlist.items[currentTrackIndex] || playlist.items[0];
  }, [currentPlaylist, currentTrackIndex, playlists, currentLibraryItem]);

  const currentTrack = getCurrentTrack();

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        handleNext();
      }
    };
    const handleError = () => {
      setError('Nelze přehrát tuto položku');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isRepeat]);

  // Play/Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setError('Nelze přehrát'));
    }
    setIsPlaying(!isPlaying);
    setError(null);
  };

  // Next track
  const handleNext = () => {
    if (!currentPlaylist) return;
    const playlist = playlists.find(p => p.id === currentPlaylist);
    if (!playlist || !playlist.items.length) return;

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.items.length);
    } else {
      nextIndex = (currentTrackIndex + 1) % playlist.items.length;
    }
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  // Previous track
  const handlePrev = () => {
    if (!currentPlaylist) return;
    const playlist = playlists.find(p => p.id === currentPlaylist);
    if (!playlist || !playlist.items.length) return;

    let prevIndex;
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * playlist.items.length);
    } else {
      prevIndex = (currentTrackIndex - 1 + playlist.items.length) % playlist.items.length;
    }
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  };

  // Seek
  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  // Volume
  const handleVolumeChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newVolume = Math.max(0, Math.min(1, percent));
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
    if (newVolume > 0) setIsMuted(false);
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  // Format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add item to library
  const handleAddItem = () => {
    if (!newItemForm.title.trim() || !newItemForm.source.trim()) return;
    
    const newItem = {
      id: `item-${Date.now()}`,
      title: newItemForm.title.trim(),
      type: newItemForm.type,
      source: newItemForm.source.trim(),
      tags: newItemForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      addedAt: new Date().toISOString()
    };
    
    setLibrary(prev => [...prev, newItem]);
    setNewItemForm({ title: '', type: 'audio', source: '', tags: '' });
    setShowAddForm(false);
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const newItem = {
      id: `item-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      type: 'audio',
      source: url,
      tags: [],
      addedAt: new Date().toISOString(),
      isLocal: true
    };
    
    setLibrary(prev => [...prev, newItem]);
  };

  // Delete item from library
  const deleteFromLibrary = (itemId) => {
    // Stop playback if deleting current item
    if (currentLibraryItem?.id === itemId) {
      setCurrentLibraryItem(null);
      setIsPlaying(false);
    }
    setLibrary(prev => prev.filter(item => item.id !== itemId));
    // Also remove from all playlists
    setPlaylists(prev => prev.map(playlist => ({
      ...playlist,
      items: playlist.items.filter(item => item.id !== itemId)
    })));
  };

  // Create playlist
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name: newPlaylistName.trim(),
      items: [],
      createdAt: new Date().toISOString()
    };
    
    setPlaylists(prev => [...prev, newPlaylist]);
    setNewPlaylistName('');
    setShowPlaylistForm(false);
  };

  // Delete playlist
  const deletePlaylist = (playlistId) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    if (currentPlaylist === playlistId) {
      setCurrentPlaylist(null);
      setCurrentTrackIndex(0);
      setIsPlaying(false);
    }
  };

  // ============= DOWNLOAD FUNCTIONS =============
  
  // Fetch media info from URL
  const fetchMediaInfo = async () => {
    if (!downloadUrl.trim()) return;
    
    setLoadingInfo(true);
    setDownloadError(null);
    setMediaInfo(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/media/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadUrl })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch media info');
      }
      
      const info = await response.json();
      setMediaInfo(info);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setLoadingInfo(false);
    }
  };
  
  // Start download
  const startDownload = async () => {
    if (!downloadUrl.trim()) return;
    
    setDownloadError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/media/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: downloadUrl,
          format: downloadFormat,
          quality: downloadQuality
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start download');
      }
      
      const result = await response.json();
      setActiveDownload({
        id: result.download_id,
        status: 'pending',
        progress: 0
      });
      
      // Start polling for status
      pollDownloadStatus(result.download_id);
      
    } catch (err) {
      setDownloadError(err.message);
    }
  };
  
  // Poll download status
  const pollDownloadStatus = (downloadId) => {
    if (downloadPollRef.current) {
      clearInterval(downloadPollRef.current);
    }
    
    downloadPollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/media/download/${downloadId}/status`);
        if (!response.ok) return;
        
        const status = await response.json();
        setActiveDownload(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(downloadPollRef.current);
          downloadPollRef.current = null;
          
          if (status.status === 'completed') {
            // Add to library automatically
            addDownloadedToLibrary(status);
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 1000);
  };
  
  // Add downloaded file to library
  const addDownloadedToLibrary = (downloadStatus) => {
    const newItem = {
      id: `item-${Date.now()}`,
      title: downloadStatus.title || 'Downloaded Media',
      type: downloadFormat === 'mp3' ? 'audio' : 'video',
      source: `${API_BASE}/api/media/download/${downloadStatus.id}/file`,
      tags: [],
      addedAt: new Date().toISOString(),
      isDownloaded: true,
      downloadId: downloadStatus.id,
      fileSize: downloadStatus.file_size
    };
    
    setLibrary(prev => [...prev, newItem]);
  };
  
  // Download file to PC
  const downloadToPC = async (downloadId, title) => {
    try {
      const link = document.createElement('a');
      link.href = `${API_BASE}/api/media/download/${downloadId}/file`;
      link.download = `${title || 'download'}.${downloadFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download to PC error:', err);
    }
  };
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (downloadPollRef.current) {
        clearInterval(downloadPollRef.current);
      }
    };
  }, []);
  
  // Reset download form
  const resetDownloadForm = () => {
    setShowDownloadForm(false);
    setDownloadUrl('');
    setMediaInfo(null);
    setActiveDownload(null);
    setDownloadError(null);
  };

  // Add to playlist
  const addToPlaylist = (playlistId, item) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        // Avoid duplicates
        if (p.items.some(i => i.id === item.id)) return p;
        return { ...p, items: [...p.items, item] };
      }
      return p;
    }));
  };

  // Remove from playlist
  const removeFromPlaylist = (playlistId, itemId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, items: p.items.filter(i => i.id !== itemId) };
      }
      return p;
    }));
  };

  // Play playlist
  const playPlaylist = (playlistId, startIndex = 0) => {
    setCurrentLibraryItem(null); // Clear library playback
    setCurrentPlaylist(playlistId);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
    setError(null);
  };

  // Play item directly from library
  const playFromLibrary = (item) => {
    // If clicking on currently playing item, toggle play/pause
    if (currentLibraryItem?.id === item.id) {
      togglePlay();
      return;
    }
    
    // Clear playlist playback, play from library
    setCurrentPlaylist(null);
    setCurrentTrackIndex(0);
    setCurrentLibraryItem(item);
    setIsPlaying(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    
    // Switch to player tab
    setActiveTab('player');
  };

  // Reorder playlist items
  const reorderPlaylist = (playlistId, fromIndex, toIndex) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const newItems = [...p.items];
        const [moved] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, moved);
        return { ...p, items: newItems };
      }
      return p;
    }));
  };

  // Check if URL is YouTube
  const isYouTubeUrl = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  // Get YouTube embed URL
  const getYouTubeEmbedUrl = (url) => {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  };

  // Render player controls
  const renderPlayerControls = () => (
    <div className="space-y-3">
      {/* Now Playing */}
      <div className="text-center">
        {currentTrack ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-1">
              {React.createElement(MEDIA_TYPES[currentTrack.type]?.icon || Music, { 
                className: `h-4 w-4 ${MEDIA_TYPES[currentTrack.type]?.color || 'text-cyan-400'}` 
              })}
              <span className="text-sm font-medium text-white truncate max-w-[200px]">
                {currentTrack.title}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {MEDIA_TYPES[currentTrack.type]?.label}
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-sm">Nic se nepřehrává</div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-400 text-center bg-red-500/10 rounded px-2 py-1">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div 
        className="h-1 bg-cyan-500/20 rounded-full cursor-pointer group"
        onClick={handleSeek}
      >
        <div 
          className="h-full bg-cyan-500 rounded-full relative transition-all group-hover:bg-cyan-400"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsShuffle(!isShuffle)}
          className={`h-8 w-8 ${isShuffle ? 'text-cyan-400' : 'text-gray-500'} hover:text-cyan-300`}
        >
          <Shuffle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="h-8 w-8 text-gray-400 hover:text-cyan-400"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="h-12 w-12 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full"
          disabled={!currentTrack}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-8 w-8 text-gray-400 hover:text-cyan-400"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRepeat(!isRepeat)}
          className={`h-8 w-8 ${isRepeat ? 'text-cyan-400' : 'text-gray-500'} hover:text-cyan-300`}
        >
          <Repeat className="h-4 w-4" />
        </Button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-7 w-7 text-gray-400 hover:text-cyan-400"
        >
          {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <div 
          className="flex-1 h-1 bg-cyan-500/20 rounded-full cursor-pointer"
          onClick={handleVolumeChange}
        >
          <div 
            className="h-full bg-cyan-500/60 rounded-full"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  // Render library tab
  const renderLibrary = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Knihovna ({library.length})</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDownloadForm(true)}
            className="h-7 w-7 text-gray-400 hover:text-green-400"
            title="Stáhnout z URL"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 w-7 text-gray-400 hover:text-cyan-400"
            title="Nahrát soubor"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddForm(true)}
            className="h-7 w-7 text-gray-400 hover:text-cyan-400"
            title="Přidat odkaz"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Download from URL form */}
      {showDownloadForm && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-400 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Stáhnout médium
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetDownloadForm}
              className="h-6 w-6 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              placeholder="URL videa (YouTube, TikTok, Twitter...)"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              className="bg-transparent border-green-500/30 text-white text-sm flex-1"
            />
            <Button
              size="sm"
              onClick={fetchMediaInfo}
              disabled={loadingInfo || !downloadUrl.trim()}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400"
            >
              {loadingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Načíst'}
            </Button>
          </div>
          
          {/* Error */}
          {downloadError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-2 space-y-1">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{downloadError}</span>
              </div>
            </div>
          )}
          
          {/* Media Info */}
          {mediaInfo && !activeDownload && (
            <div className="space-y-2">
              {/* Thumbnail */}
              {mediaInfo.thumbnail && (
                <div className="relative aspect-video bg-black/30 rounded overflow-hidden">
                  <img 
                    src={mediaInfo.thumbnail} 
                    alt={mediaInfo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              
              <div className="text-sm text-white font-medium truncate">
                {mediaInfo.title}
              </div>
              {mediaInfo.duration && (
                <div className="text-xs text-gray-400">
                  Délka: {Math.floor(mediaInfo.duration / 60)}:{(mediaInfo.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
              
              {/* Warning note */}
              {mediaInfo.note && (
                <div className="text-xs text-yellow-500/80 bg-yellow-500/10 rounded px-2 py-1">
                  ⚠️ {mediaInfo.note}
                </div>
              )}
              
              {/* Format & Quality Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Formát</label>
                  <select
                    value={downloadFormat}
                    onChange={(e) => setDownloadFormat(e.target.value)}
                    className="w-full bg-[#0f1d35] border border-green-500/30 rounded text-white text-sm p-1.5"
                  >
                    <option value="mp3">MP3 (Audio)</option>
                    <option value="mp4">MP4 (Video)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Kvalita</label>
                  <select
                    value={downloadQuality}
                    onChange={(e) => setDownloadQuality(e.target.value)}
                    className="w-full bg-[#0f1d35] border border-green-500/30 rounded text-white text-sm p-1.5"
                  >
                    <option value="low">Nízká (~2-5 MB)</option>
                    <option value="medium">Střední (~5-15 MB)</option>
                    <option value="high">Vysoká (~15-50 MB)</option>
                  </select>
                </div>
              </div>
              
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={startDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Stáhnout {downloadFormat.toUpperCase()}
              </Button>
            </div>
          )}
          
          {/* Download Progress */}
          {activeDownload && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {activeDownload.status === 'pending' && 'Zahajuji...'}
                  {activeDownload.status === 'downloading' && 'Stahuji...'}
                  {activeDownload.status === 'processing' && 'Zpracovávám...'}
                  {activeDownload.status === 'completed' && (
                    <span className="text-green-400 flex items-center gap-1">
                      <Check className="h-4 w-4" /> Hotovo!
                    </span>
                  )}
                  {activeDownload.status === 'failed' && (
                    <span className="text-red-400">Chyba</span>
                  )}
                </span>
                <span className="text-cyan-400">{Math.round(activeDownload.progress)}%</span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-green-500/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    activeDownload.status === 'completed' ? 'bg-green-500' : 
                    activeDownload.status === 'failed' ? 'bg-red-500' : 'bg-green-400'
                  }`}
                  style={{ width: `${activeDownload.progress}%` }}
                />
              </div>
              
              {/* Speed & ETA */}
              {activeDownload.speed && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{activeDownload.speed}</span>
                  {activeDownload.eta && <span>ETA: {activeDownload.eta}</span>}
                </div>
              )}
              
              {/* Completed actions */}
              {activeDownload.status === 'completed' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                    onClick={() => {
                      // Find the newly added item and play it
                      const newItem = library.find(item => item.downloadId === activeDownload.id);
                      if (newItem) playFromLibrary(newItem);
                      resetDownloadForm();
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" /> Přehrát
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => downloadToPC(activeDownload.id, activeDownload.title)}
                  >
                    <HardDrive className="h-3 w-3 mr-1" /> Uložit do PC
                  </Button>
                </div>
              )}
              
              {/* Error message with details */}
              {activeDownload.status === 'failed' && activeDownload.error && (
                <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-2 space-y-2">
                  <div className="font-medium">❌ {activeDownload.error}</div>
                  {activeDownload.error.includes('autentizaci') || activeDownload.error.includes('blokuje') ? (
                    <div className="text-gray-400 text-[10px]">
                      YouTube a další platformy aktivně blokují stahování ze serverových prostředí. 
                      Zkuste použít lokální nástroj jako yt-dlp nebo cobalt.tools ve svém prohlížeči.
                    </div>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white text-xs"
                    onClick={() => {
                      setActiveDownload(null);
                      setDownloadError(null);
                    }}
                  >
                    Zkusit znovu
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-cyan-500/10 rounded-lg p-3 space-y-2">
          <Input
            placeholder="Název"
            value={newItemForm.title}
            onChange={(e) => setNewItemForm(prev => ({ ...prev, title: e.target.value }))}
            className="bg-transparent border-cyan-500/20 text-white text-sm"
          />
          <Input
            placeholder="URL (YouTube, audio link...)"
            value={newItemForm.source}
            onChange={(e) => setNewItemForm(prev => ({ ...prev, source: e.target.value }))}
            className="bg-transparent border-cyan-500/20 text-white text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newItemForm.type}
              onChange={(e) => setNewItemForm(prev => ({ ...prev, type: e.target.value }))}
              className="flex-1 bg-transparent border border-cyan-500/20 rounded text-white text-sm p-1"
            >
              <option value="audio" className="bg-[#0f1d35]">Audio</option>
              <option value="video" className="bg-[#0f1d35]">Video</option>
              <option value="link" className="bg-[#0f1d35]">Link</option>
            </select>
            <Button size="sm" onClick={handleAddItem} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              Přidat
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)} className="text-gray-400">
              Zrušit
            </Button>
          </div>
        </div>
      )}

      {/* Library list */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {library.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            Knihovna je prázdná
          </div>
        ) : (
          library.map(item => {
            const isCurrentItem = currentLibraryItem?.id === item.id;
            const isItemPlaying = isCurrentItem && isPlaying;
            
            return (
              <div 
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded-lg group transition-all cursor-pointer ${
                  isCurrentItem 
                    ? 'bg-cyan-500/20 border border-cyan-500/40' 
                    : 'hover:bg-cyan-500/10 border border-transparent'
                }`}
                onClick={() => playFromLibrary(item)}
              >
                {/* Play button / Now playing indicator */}
                <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
                  {isItemPlaying ? (
                    // Equalizer animation for playing item
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-cyan-400 rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                      <div className="w-1 bg-cyan-400 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                      <div className="w-1 bg-cyan-400 rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
                    </div>
                  ) : isCurrentItem ? (
                    // Paused indicator
                    <Pause className="h-4 w-4 text-cyan-400" />
                  ) : (
                    // Play button on hover, icon otherwise
                    <>
                      <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
                        {React.createElement(MEDIA_TYPES[item.type]?.icon || Music, { 
                          className: `h-4 w-4 ${MEDIA_TYPES[item.type]?.color || 'text-cyan-400'}` 
                        })}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/30 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5 text-cyan-400 ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Title */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate block ${isCurrentItem ? 'text-cyan-300 font-medium' : 'text-white'}`}>
                    {item.title}
                  </span>
                  {isCurrentItem && (
                    <span className="text-xs text-cyan-500">Právě přehrává</span>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {playlists.length > 0 && (
                    <select
                      className="bg-cyan-500/20 border-none rounded text-xs text-cyan-400 p-1"
                      onChange={(e) => {
                        if (e.target.value) addToPlaylist(e.target.value, item);
                        e.target.value = '';
                      }}
                      defaultValue=""
                    >
                      <option value="" className="bg-[#0f1d35]">+ Playlist</option>
                      {playlists.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#0f1d35]">{p.name}</option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFromLibrary(item.id)}
                    className="h-6 w-6 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Render playlists tab
  const renderPlaylists = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Playlisty ({playlists.length})</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowPlaylistForm(true)}
          className="h-7 w-7 text-gray-400 hover:text-cyan-400"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Create playlist form */}
      {showPlaylistForm && (
        <div className="flex gap-2">
          <Input
            placeholder="Název playlistu"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="bg-transparent border-cyan-500/20 text-white text-sm"
            onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
          />
          <Button size="sm" onClick={createPlaylist} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            Vytvořit
          </Button>
        </div>
      )}

      {/* Playlists list */}
      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {playlists.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            Žádné playlisty
          </div>
        ) : (
          playlists.map(playlist => (
            <div key={playlist.id} className="bg-cyan-500/5 rounded-lg overflow-hidden">
              <div 
                className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-cyan-500/10 transition-colors ${
                  currentPlaylist === playlist.id ? 'bg-cyan-500/20' : ''
                }`}
                onClick={() => setEditingPlaylist(editingPlaylist === playlist.id ? null : playlist.id)}
              >
                <ListMusic className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-white">{playlist.name}</span>
                <span className="text-xs text-gray-500">{playlist.items.length} položek</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); playPlaylist(playlist.id); }}
                  className="h-6 w-6 text-cyan-400 hover:text-cyan-300"
                >
                  <Play className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist.id); }}
                  className="h-6 w-6 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                {editingPlaylist === playlist.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
              
              {/* Expanded playlist */}
              {editingPlaylist === playlist.id && (
                <div className="border-t border-cyan-500/10 p-2 space-y-1">
                  {playlist.items.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-2">
                      Prázdný playlist
                    </div>
                  ) : (
                    playlist.items.map((item, index) => (
                      <div 
                        key={item.id}
                        className={`flex items-center gap-2 p-1 rounded text-xs hover:bg-cyan-500/10 cursor-pointer ${
                          currentPlaylist === playlist.id && currentTrackIndex === index ? 'bg-cyan-500/20' : ''
                        }`}
                        onClick={() => playPlaylist(playlist.id, index)}
                      >
                        <GripVertical className="h-3 w-3 text-gray-600 cursor-grab" />
                        {React.createElement(MEDIA_TYPES[item.type]?.icon || Music, { 
                          className: `h-3 w-3 ${MEDIA_TYPES[item.type]?.color || 'text-cyan-400'}` 
                        })}
                        <span className="flex-1 text-white truncate">{item.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); removeFromPlaylist(playlist.id, item.id); }}
                          className="h-5 w-5 text-gray-500 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render video/iframe for YouTube
  const renderVideoPlayer = () => {
    if (!currentTrack || !isYouTubeUrl(currentTrack.source)) return null;
    
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
        <iframe
          src={isPlaying ? getYouTubeEmbedUrl(currentTrack.source) : ''}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  };

  // Mini mode render
  if (miniMode) {
    return (
      <div className="h-full flex flex-col text-gray-200 p-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="h-8 w-8 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full flex-shrink-0"
            disabled={!currentTrack}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white truncate">
              {currentTrack?.title || 'Nic se nepřehrává'}
            </div>
            <div className="h-1 bg-cyan-500/20 rounded-full mt-1">
              <div 
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMiniMode(false)}
            className="h-6 w-6 text-gray-500 hover:text-cyan-400"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={currentTrack?.type === 'audio' ? currentTrack.source : ''}
          volume={isMuted ? 0 : volume}
          autoPlay={isPlaying}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col text-gray-200">
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 px-2">
        <div className="flex">
          {[
            { id: 'player', icon: Music, label: 'Přehrávač' },
            { id: 'library', icon: Library, label: 'Knihovna' },
            { id: 'playlists', icon: ListMusic, label: 'Playlisty' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? 'text-cyan-400 border-cyan-400' 
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMiniMode(true)}
          className="h-6 w-6 text-gray-500 hover:text-cyan-400"
          title="Mini režim"
        >
          <Minimize2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'player' && (
          <>
            {currentTrack && isYouTubeUrl(currentTrack.source) && renderVideoPlayer()}
            {renderPlayerControls()}
          </>
        )}
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'playlists' && renderPlaylists()}
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.type === 'audio' && !isYouTubeUrl(currentTrack.source) ? currentTrack.source : ''}
        volume={isMuted ? 0 : volume}
        autoPlay={isPlaying && currentTrack?.type === 'audio'}
      />
    </div>
  );
};

export default MusicModule;
