/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
// FIX: For React 18, createRoot must be imported from 'react-dom/client'. It is not available on the default ReactDOM import from 'react-dom'.
import { createRoot } from 'react-dom/client';
import './index.css';

// --- THEME & APPEARANCE CONTEXT ---

const defaultAppearanceSettings = {
    theme: 'light',
    // Backgrounds
    appBgColor: '#f0f2f5',
    contentBgColor: '#ffffff',
    // Text
    textColor: '#333333',
    textSecondaryColor: '#666666',
    fontFamily: 'Roboto',
    // Buttons & UI
    buttonPrimaryBg: '#ff3b30',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryBg: '#e9e9eb',
    buttonSecondaryText: '#333333',
    buttonBorderRadius: 8,
    // Borders
    borderColor: '#e0e0e0',
    borderThickness: 1,
    // Accent
    accentColor: '#ff3b30',
    // Animations
    enableAnimations: true,
};

const darkThemeSettings = {
    ...defaultAppearanceSettings,
    theme: 'dark',
    appBgColor: '#121212',
    contentBgColor: '#1e1e1e',
    textColor: '#e0e0e0',
    textSecondaryColor: '#a0a0a0',
    buttonPrimaryBg: '#ff453a',
    buttonSecondaryBg: '#3a3a3c',
    buttonSecondaryText: '#e0e0e0',
    borderColor: '#444444',
    accentColor: '#ff453a',
};

const AppearanceContext = createContext({
    settings: defaultAppearanceSettings,
    setSettings: (settings) => {},
    resetSettings: () => {},
});

const AppearanceProvider = ({ children }) => {
    const [settings, setSettings] = useState(() => {
        try {
            const savedSettings = localStorage.getItem('appearanceSettings');
            // Merge saved settings with defaults to ensure new settings are applied
            return savedSettings 
                ? { ...defaultAppearanceSettings, ...JSON.parse(savedSettings) } 
                : defaultAppearanceSettings;
        } catch (error) {
            return defaultAppearanceSettings;
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--app-bg-color', settings.appBgColor);
        root.style.setProperty('--content-bg-color', settings.contentBgColor);
        root.style.setProperty('--text-color', settings.textColor);
        root.style.setProperty('--text-secondary-color', settings.textSecondaryColor);
        root.style.setProperty('--font-family', settings.fontFamily);
        root.style.setProperty('--button-primary-bg', settings.buttonPrimaryBg);
        root.style.setProperty('--button-primary-text', settings.buttonPrimaryText);
        root.style.setProperty('--button-secondary-bg', settings.buttonSecondaryBg);
        root.style.setProperty('--button-secondary-text', settings.buttonSecondaryText);
        root.style.setProperty('--button-border-radius', `${settings.buttonBorderRadius}px`);
        root.style.setProperty('--border-color', settings.borderColor);
        root.style.setProperty('--border-thickness', `${settings.borderThickness}px`);
        root.style.setProperty('--accent-color', settings.accentColor);
        root.style.setProperty('--transition-duration', settings.enableAnimations ? '0.2s' : '0s');
    }, [settings]);

    // Automatically save settings when they change
    useEffect(() => {
        try {
            localStorage.setItem('appearanceSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save appearance settings:', error);
        }
    }, [settings]);

    const resetSettings = () => {
        localStorage.removeItem('appearanceSettings');
        setSettings(defaultAppearanceSettings);
    };

    const value = { settings, setSettings, resetSettings };

    return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

// --- PLAYER CONTEXT ---

const defaultPlayerSettings = {
    // Theme & Colors
    backgroundColor: '#ffffff',
    buttonColor: '#ff3b30',
    accentColor: '#ff9500',
    textColor: '#000000',
    // Layout & Size
    fullPlayerSize: 80, // percentage of viewport width
    miniPlayerPosition: 'bottom-stretched',
    // Text & Fonts
    titleFontSize: 24, // in pixels
    artistFontSize: 18, // in pixels
    // Controls & Buttons
    showShuffle: true,
    showRepeat: true,
    shuffleButtonColor: '#ff9500',
    repeatButtonColor: '#ff9500',
    // Progress Bar
    progressThickness: 4, // in pixels
    progressColor: '#ff3b30',
    timelineBgColor: '#e0e0e0',
    timelineThumbColor: '#ff3b30',
    // Animations & Effects
    enableAnimations: true,
};

// Helper function to shuffle an array (Fisher-Yates shuffle)
const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
};

const PlayerContext = createContext(null);

const PlayerProvider = ({ children, songs }) => {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
    const [currentQueue, setCurrentQueue] = useState([]);
    const [shuffledQueue, setShuffledQueue] = useState([]);
    const [isShuffleActive, setIsShuffleActive] = useState(false);
    const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
    const audioRef = React.useRef(null);

    const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
        try {
            const saved = localStorage.getItem('recentlyPlayedSongs');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load recently played songs:', error);
            return [];
        }
    });

    useEffect(() => {
        try {
            // Don't store the File object in localStorage
            const storableRecentlyPlayed = recentlyPlayed.map(song => {
                const { file, ...storableSong } = song;
                return storableSong;
            });
            localStorage.setItem('recentlyPlayedSongs', JSON.stringify(storableRecentlyPlayed));
        } catch (error) {
            console.error('Failed to save recently played songs:', error);
        }
    }, [recentlyPlayed]);
    
    const [playerSettings, setPlayerSettings] = useState(() => {
        try {
            const savedSettings = localStorage.getItem('playerSettings');
             // Merge saved settings with defaults to ensure new settings are applied
            return savedSettings 
                ? { ...defaultPlayerSettings, ...JSON.parse(savedSettings) }
                : defaultPlayerSettings;
        } catch (error) {
            return defaultPlayerSettings;
        }
    });

    const handleEnded = () => {
        if (repeatMode === 'one') {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error("Replay failed", e));
        } else {
            playNext();
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        const handleTimeUpdate = () => setProgress(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [currentSong, currentQueue, repeatMode, isShuffleActive, shuffledQueue]); // Re-attach listener if dependencies change
    
    useEffect(() => {
        const root = document.documentElement;
        if (currentSong && playerSettings.miniPlayerPosition === 'bottom-stretched') {
             root.style.setProperty('--mini-player-height', '65px');
        } else {
             root.style.setProperty('--mini-player-height', '0px');
        }
    }, [currentSong, playerSettings.miniPlayerPosition]);

    // Media Session API for background/lock screen controls
    useEffect(() => {
        if ('mediaSession' in navigator) {
            if (currentSong) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: currentSong.title,
                    artist: currentSong.artist,
                    artwork: [{ src: currentSong.albumArtUrl, sizes: '96x96', type: 'image/png' }]
                });
                navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

                navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
                navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
                navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
                navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());

            } else {
                 navigator.mediaSession.metadata = null;
                 navigator.mediaSession.playbackState = "none";
            }
        }
    }, [currentSong, isPlaying, currentQueue, isShuffleActive, shuffledQueue]);


    const playSong = (songToPlay, queue) => {
        if (queue) {
            setCurrentQueue(queue);
            if (isShuffleActive) {
                const otherSongs = queue.filter(s => s.id !== songToPlay.id);
                setShuffledQueue([songToPlay, ...shuffleArray(otherSongs)]);
            }
        }
        
        const song = songToPlay.file ? songToPlay : songs.find(s => s.id === songToPlay.id);

        if (!song) {
            alert('This song is from a previous session and is no longer available. Please import it again.');
            setRecentlyPlayed(prev => prev.filter(s => s.id !== songToPlay.id));
            return;
        }

        if (currentSong && currentSong.id === song.id) {
            togglePlayPause();
        } else {
            setCurrentSong(song);
            audioRef.current.src = URL.createObjectURL(song.file);
            audioRef.current.play().catch(e => console.error("Playback failed", e));
            setIsPlaying(true);
        }
        
        setRecentlyPlayed(prev => {
            const filtered = prev.filter(s => s.id !== song.id);
            const newHistory = [song, ...filtered];
            return newHistory.slice(0, 50);
        });
    };
    
    const playNext = () => {
        const activeQueue = isShuffleActive ? shuffledQueue : currentQueue;
        if (!currentSong || activeQueue.length === 0) return;

        const currentIndex = activeQueue.findIndex(s => s.id === currentSong.id);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex + 1;
        if (nextIndex >= activeQueue.length) {
            if (repeatMode === 'all') {
                nextIndex = 0; // Loop back
            } else {
                // Stop playback if not repeating
                setIsPlaying(false); 
                return;
            }
        }
        playSong(activeQueue[nextIndex], currentQueue);
    };

    const playPrevious = () => {
        const activeQueue = isShuffleActive ? shuffledQueue : currentQueue;
        if (!currentSong || activeQueue.length === 0) return;

        const currentIndex = activeQueue.findIndex(s => s.id === currentSong.id);
        if (currentIndex === -1) return;
        
        // Go to previous or wrap around
        const prevIndex = (currentIndex - 1 + activeQueue.length) % activeQueue.length;
        playSong(activeQueue[prevIndex], currentQueue);
    };

    const togglePlayPause = () => {
        if (!currentSong) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Playback failed", e));
        }
        setIsPlaying(!isPlaying);
    };
    
    const toggleShuffle = () => {
        const newShuffleState = !isShuffleActive;
        setIsShuffleActive(newShuffleState);

        if (newShuffleState && currentSong) {
            // Shuffle is being turned ON
            const otherSongs = currentQueue.filter(s => s.id !== currentSong.id);
            const newShuffledQueue = [currentSong, ...shuffleArray(otherSongs)];
            setShuffledQueue(newShuffledQueue);
        } else {
            // Shuffle is being turned OFF
            setShuffledQueue([]);
        }
    };

    const toggleRepeat = () => {
        const modes = ['off', 'all', 'one'];
        const currentModeIndex = modes.indexOf(repeatMode);
        const nextModeIndex = (currentModeIndex + 1) % modes.length;
        setRepeatMode(modes[nextModeIndex]);
    };

    const seek = (time) => {
        audioRef.current.currentTime = time;
        setProgress(time);
    };

    const openFullPlayer = () => setIsFullPlayerVisible(true);
    const closeFullPlayer = () => setIsFullPlayerVisible(false);

    const updatePlayerSettings = (newSettings) => {
        setPlayerSettings(newSettings);
        localStorage.setItem('playerSettings', JSON.stringify(newSettings));
    };

    const value = {
        currentSong, isPlaying, progress, duration,
        playerSettings, playSong, togglePlayPause, updatePlayerSettings,
        recentlyPlayed, isFullPlayerVisible, openFullPlayer, closeFullPlayer,
        playNext, playPrevious, seek,
        isShuffleActive, repeatMode, toggleShuffle, toggleRepeat
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
            <audio ref={audioRef} />
        </PlayerContext.Provider>
    );
};


// SVG Icons as React Components for better reusability and control
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const ImportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
    </svg>
);

const MusicNoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
    </svg>
);
const ChevronDownIcon = ({ color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
    </svg>
);
// Player Icons
const PlayIcon = ({ color }) => <svg viewBox="0 0 24 24" fill={color}><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = ({ color }) => <svg viewBox="0 0 24 24" fill={color}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const SkipNextIcon = ({ color }) => <svg viewBox="0 0 24 24" fill={color}><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>;
const SkipPreviousIcon = ({ color }) => <svg viewBox="0 0 24 24" fill={color}><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>;
const ShuffleIcon = ({ color, active }) => <svg viewBox="0 0 24 24" fill={active ? color : 'grey'}><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>;

const RepeatIcon = ({ color, mode }) => {
    const iconColor = mode !== 'off' ? color : 'grey';
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill={iconColor} style={{ position: 'absolute' }}>
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {mode === 'one' && (
                <span style={{
                    position: 'absolute',
                    color: iconColor,
                    fontSize: '12px',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    lineHeight: 1
                }}>1</span>
            )}
        </div>
    );
};

const MiniPlayer = () => {
    const { 
        currentSong, 
        isPlaying, 
        togglePlayPause, 
        progress, 
        duration,
        playerSettings,
        openFullPlayer,
    } = useContext(PlayerContext);
    
    if (!currentSong) return null;

    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
    
    const handleToggle = (e) => {
        e.stopPropagation();
        togglePlayPause();
    };

    return (
        <div 
            className={`mini-player ${playerSettings.miniPlayerPosition}`} 
            style={{ 
                backgroundColor: playerSettings.backgroundColor,
                transition: playerSettings.enableAnimations ? 'all 0.3s ease' : 'none'
            }}
            aria-label="Music Player, tap to expand"
            role="button"
            tabIndex="0"
            onClick={openFullPlayer}
        >
            <img src={currentSong.albumArtUrl} alt={`Album art for ${currentSong.title}`} className="mini-player-art" />
            <div className="mini-player-info">
                <p style={{ color: playerSettings.textColor }} className="song-title">{currentSong.title}</p>
                <p style={{ color: playerSettings.textColor }} className="song-artist">{currentSong.artist}</p>
            </div>
            <div className="mini-player-controls">
                <button onClick={handleToggle} className="player-control-button" aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <PauseIcon color={playerSettings.buttonColor} /> : <PlayIcon color={playerSettings.buttonColor} />}
                </button>
            </div>
            <div className="mini-player-progress-container">
                <div 
                    className="mini-player-progress-bar"
                    style={{ 
                        width: `${progressPercent}%`, 
                        height: `${playerSettings.progressThickness}px`, 
                        backgroundColor: playerSettings.progressColor 
                    }}
                ></div>
            </div>
        </div>
    );
};

const FullPlayer = () => {
    const {
        currentSong, isPlaying, progress, duration,
        togglePlayPause, playNext, playPrevious, seek,
        playerSettings, closeFullPlayer,
        isShuffleActive, repeatMode, toggleShuffle, toggleRepeat
    } = useContext(PlayerContext);
    
    if (!currentSong) return null;

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleSeek = (e) => {
        // FIX: The value from a range input event target is a string. It must be converted to a number before being passed to the seek function.
        seek(Number(e.target.value));
    };

    return (
        <div className="full-player-overlay" style={{ backgroundColor: playerSettings.backgroundColor, transition: playerSettings.enableAnimations ? 'background-color 0.3s' : 'none' }}>
            <button onClick={closeFullPlayer} className="full-player-close-btn" aria-label="Close full screen player">
                <ChevronDownIcon color={playerSettings.textColor} />
            </button>
            <div className="full-player-content">
                <img src={currentSong.albumArtUrl} alt={`Album art for ${currentSong.title}`} className="full-player-art-large" />
                <div className="full-player-details">
                    <h2 className="full-player-title" style={{ color: playerSettings.textColor, fontSize: `${playerSettings.titleFontSize}px` }}>
                        {currentSong.title}
                    </h2>
                    <p className="full-player-artist" style={{ color: playerSettings.textColor, fontSize: `${playerSettings.artistFontSize}px` }}>
                        {currentSong.artist}
                    </p>
                </div>

                <div className="full-player-progress-wrapper">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={progress}
                        onChange={handleSeek}
                        className="full-player-scrubber"
                        aria-label="Song progress"
// FIX: Cast style object with CSS custom properties to React.CSSProperties to fix TypeScript error.
                        style={{
                            '--progress-percent': `${(progress / duration) * 100 || 0}%`,
                            '--progress-thickness': `${playerSettings.progressThickness}px`,
                            '--progress-color': playerSettings.progressColor,
                            '--timeline-bg-color': playerSettings.timelineBgColor,
                            '--timeline-thumb-color': playerSettings.timelineThumbColor
                        } as React.CSSProperties}
                    />
                    <div className="full-player-times" style={{ color: playerSettings.textColor }}>
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="full-player-main-controls">
                    {playerSettings.showShuffle && <button onClick={toggleShuffle} className="player-control-button" aria-label="Shuffle"><ShuffleIcon color={playerSettings.shuffleButtonColor} active={isShuffleActive} /></button>}
                    <button onClick={playPrevious} className="player-control-button" aria-label="Previous song"><SkipPreviousIcon color={playerSettings.buttonColor} /></button>
                    <button onClick={togglePlayPause} className="player-control-button large" aria-label={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <PauseIcon color={playerSettings.buttonColor} /> : <PlayIcon color={playerSettings.buttonColor} />}
                    </button>
                    <button onClick={playNext} className="player-control-button" aria-label="Next song"><SkipNextIcon color={playerSettings.buttonColor} /></button>
                    {playerSettings.showRepeat && <button onClick={toggleRepeat} className="player-control-button" aria-label="Repeat"><RepeatIcon color={playerSettings.repeatButtonColor} mode={repeatMode} /></button>}
                </div>
            </div>
        </div>
    );
};


const BottomNavBar = ({ activeItem, setActiveItem }) => {
    return (
        <nav className="bottom-nav-bar" aria-label="Main navigation">
            <button
                className={`nav-item ${activeItem === 'Home' ? 'active' : ''}`}
                aria-label="Home"
                aria-current={activeItem === 'Home' ? 'page' : undefined}
                onClick={() => setActiveItem('Home')}
            >
                <HomeIcon />
                <span>Home</span>
            </button>
            <button
                className={`nav-item ${activeItem === 'Songs' ? 'active' : ''}`}
                aria-label="Songs"
                aria-current={activeItem === 'Songs' ? 'page' : undefined}
                onClick={() => setActiveItem('Songs')}
            >
                <MusicNoteIcon />
                <span>Songs</span>
            </button>
            <button
                className={`nav-item ${activeItem === 'Import' ? 'active' : ''}`}
                aria-label="Import"
                aria-current={activeItem === 'Import' ? 'page' : undefined}
                onClick={() => setActiveItem('Import')}
            >
                <ImportIcon />
                <span>Import</span>
            </button>
            <button
                className={`nav-item ${activeItem === 'Settings' ? 'active' : ''}`}
                aria-label="Settings"
                aria-current={activeItem === 'Settings' ? 'page' : undefined}
                onClick={() => setActiveItem('Settings')}
            >
                <SettingsIcon />
                <span>Settings</span>
            </button>
        </nav>
    );
};

const Home = () => {
    const { recentlyPlayed, playSong } = useContext(PlayerContext);

    return (
        <div>
            <h1 className="page-title">Home</h1>
            <hr className="title-underline" />
            
            <section className="recently-played-section" aria-labelledby="recently-played-title">
                <h2 id="recently-played-title" className="section-title">Recently Played</h2>
                {recentlyPlayed.length === 0 ? (
                    <p className="empty-state">Songs you play will appear here.</p>
                ) : (
                    <ul className="song-list">
                        {recentlyPlayed.map(song => (
                             <li 
                                key={song.id} 
                                className="song-item"
                                onClick={() => playSong(song, recentlyPlayed)}
                                role="button"
                                tabIndex="0"
                                aria-label={`Play ${song.title} by ${song.artist}`}
                            >
                                <img src={song.albumArtUrl} alt={`Album art for ${song.title}`} className="song-album-art" />
                                <div className="song-details">
                                    <p className="song-title">{song.title}</p>
                                    <p className="song-artist">{song.artist}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

const EditModal = ({ file, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');

    useEffect(() => {
        if (file) {
            // Pre-fill title by removing the extension, and set a placeholder for artist
            setTitle(file.name.replace(/\.[^/.]+$/, ""));
            setArtist('Unknown Artist');
        }
    }, [file]);

    if (!file) {
        return null;
    }

    const handleSave = () => {
        onSave({ title, artist });
    };
    
    // Create a portal to render the modal in the 'modal-root' div
    return ReactDOM.createPortal(
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-content">
                <h2 id="modal-title" className="modal-title">Edit</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="form-group">
                        <label htmlFor="title">Title</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="artist">Artist</label>
                        <input
                            id="artist"
                            type="text"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="button-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')
    );
};


const Import = ({ onSongAdded, setActiveItem }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [editingFile, setEditingFile] = useState(null);


    const handleFileChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const files = Array.from(event.target.files);
            setSelectedFiles(files);
            setEditingFile(files[0]); // Open modal for the first file
        }
    };

    const handleCloseModal = () => {
        setEditingFile(null);
    };

    const handleSaveMetadata = (metadata) => {
        const newSong = {
            id: Date.now(),
            title: metadata.title,
            artist: metadata.artist,
            albumArtUrl: 'https://placehold.co/64x64/png', // Placeholder art
            file: editingFile,
        };
        onSongAdded(newSong);
        setSelectedFiles([]);
        handleCloseModal();
        setActiveItem('Songs');
    };

    return (
        <div>
            <h1 className="page-title">Import</h1>
            <hr className="title-underline" />

            <div className="import-container">
                <p>Select one or more MP3 files to import into your library.</p>
                <input
                    type="file"
                    id="file-upload"
                    accept=".mp3"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    aria-label="File upload"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                    Choose Files
                </label>

                {selectedFiles.length > 0 && (
                    <div className="file-list-container">
                        <h2 className="section-title">Selected Files:</h2>
                        <ul className="file-list">
                            {selectedFiles.map((file, index) => (
                                <li key={index} className="file-list-item">
                                    {file.displayName || file.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <EditModal
                file={editingFile}
                onClose={handleCloseModal}
                onSave={handleSaveMetadata}
            />
        </div>
    );
};

const Songs = ({ songs }) => {
    const { playSong } = useContext(PlayerContext);
    
    return (
        <div>
            <h1 className="page-title">Songs</h1>
            <hr className="title-underline" />
            {songs.length === 0 ? (
                <p className="empty-state">Your imported songs will appear here.</p>
            ) : (
                <ul className="song-list">
                    {songs.map(song => (
                        <li 
                            key={song.id} 
                            className="song-item"
                            onClick={() => playSong(song, songs)}
                            role="button"
                            tabIndex="0"
                            aria-label={`Play ${song.title} by ${song.artist}`}
                        >
                            <img src={song.albumArtUrl} alt={`Album art for ${song.title}`} className="song-album-art" />
                            <div className="song-details">
                                <p className="song-title">{song.title}</p>
                                <p className="song-artist">{song.artist}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const AppearanceSettings = () => {
    const { settings, setSettings, resetSettings } = useContext(AppearanceContext);
    
    const isCustomTheme = settings.theme === 'custom';

    const handleThemeChange = (theme) => {
        if (theme === 'light') {
            setSettings(defaultAppearanceSettings);
        } else if (theme === 'dark') {
            setSettings(darkThemeSettings);
        } else {
            setSettings(prev => ({ ...prev, theme: 'custom' }));
        }
    };
    
    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, theme: 'custom', [key]: value }));
    };

    return (
        <div className="appearance-settings-container">
            <h2 className="section-title">Appearance</h2>
            
            {/* Theme Selection - Always Visible */}
            <div className="settings-group">
                <h3>Theme</h3>
                <div className="theme-selector">
                    <label><input type="radio" name="theme" value="light" checked={settings.theme === 'light'} onChange={() => handleThemeChange('light')} /> Light</label>
                    <label><input type="radio" name="theme" value="dark" checked={settings.theme === 'dark'} onChange={() => handleThemeChange('dark')} /> Dark</label>
                    <label><input type="radio" name="theme" value="custom" checked={settings.theme === 'custom'} onChange={() => handleThemeChange('custom')} /> Custom</label>
                </div>
            </div>

            {/* Conditionally Rendered Custom Settings */}
            {isCustomTheme && (
                <div className="custom-appearance-settings">
                    <div className="settings-grid">
                        {/* Backgrounds */}
                        <div className="settings-group">
                            <h3>Backgrounds</h3>
                            <div className="setting-item">
                                <label htmlFor="appBgColor">App Background</label>
                                <input type="color" id="appBgColor" value={settings.appBgColor} onChange={e => handleSettingChange('appBgColor', e.target.value)} />
                            </div>
                            <div className="setting-item">
                                <label htmlFor="contentBgColor">Content Background</label>
                                <input type="color" id="contentBgColor" value={settings.contentBgColor} onChange={e => handleSettingChange('contentBgColor', e.target.value)} />
                            </div>
                        </div>

                        {/* Text */}
                        <div className="settings-group">
                            <h3>Text</h3>
                            <div className="setting-item">
                                <label htmlFor="textColor">Primary Text</label>
                                <input type="color" id="textColor" value={settings.textColor} onChange={e => handleSettingChange('textColor', e.target.value)} />
                            </div>
                            <div className="setting-item">
                                <label htmlFor="textSecondaryColor">Secondary Text</label>
                                <input type="color" id="textSecondaryColor" value={settings.textSecondaryColor} onChange={e => handleSettingChange('textSecondaryColor', e.target.value)} />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="settings-group">
                            <h3>Buttons & UI Elements</h3>
                            <div className="setting-item">
                                <label htmlFor="buttonPrimaryBg">Primary Button BG</label>
                                <input type="color" id="buttonPrimaryBg" value={settings.buttonPrimaryBg} onChange={e => handleSettingChange('buttonPrimaryBg', e.target.value)} />
                            </div>
                             <div className="setting-item">
                                <label htmlFor="buttonBorderRadius">Corner Radius ({settings.buttonBorderRadius}px)</label>
                                {/* FIX: The value from a range input is a string. It must be converted to a number to match the state's type. */}
                                <input type="range" id="buttonBorderRadius" min="0" max="24" value={settings.buttonBorderRadius} onChange={e => handleSettingChange('buttonBorderRadius', Number(e.target.value))} />
                            </div>
                        </div>

                        {/* Accent */}
                        <div className="settings-group">
                            <h3>Accent Color</h3>
                            <div className="setting-item">
                                <label htmlFor="accentColor">Accent</label>
                                <input type="color" id="accentColor" value={settings.accentColor} onChange={e => handleSettingChange('accentColor', e.target.value)} />
                            </div>
                        </div>

                        {/* Animations */}
                        <div className="settings-group">
                            <h3>Animations</h3>
                            <div className="setting-item toggle">
                                <label htmlFor="enableAppAnimations">Enable UI Animations</label>
                                <label className="switch">
                                     <input type="checkbox" id="enableAppAnimations" checked={settings.enableAnimations} onChange={e => handleSettingChange('enableAnimations', e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
             <div className="settings-actions">
                <button className="button-secondary" onClick={resetSettings}>Reset to Default</button>
            </div>
        </div>
    );
};

const PlayerCustomization = () => {
    const { playerSettings, updatePlayerSettings } = useContext(PlayerContext);

    const handleSettingChange = (key, value) => {
        updatePlayerSettings({ ...playerSettings, [key]: value });
    };

    const resetToDefaultSettings = () => {
        updatePlayerSettings(defaultPlayerSettings);
    };
    
    const MiniPlayerPreview = () => (
        <div className={`mini-player-preview ${playerSettings.miniPlayerPosition}`} style={{ backgroundColor: playerSettings.backgroundColor, transition: playerSettings.enableAnimations ? 'all 0.3s ease' : 'none' }}>
            <div className="mini-player-art"></div>
            <div className="mini-player-info">
                <p style={{ color: playerSettings.textColor, fontSize: '14px', fontWeight: 'bold' }}>Song Title</p>
                <p style={{ color: playerSettings.textColor, fontSize: '12px' }}>Artist Name</p>
            </div>
            <div className="mini-player-controls">
                <div className="player-icon"><PlayIcon color={playerSettings.buttonColor} /></div>
                <div className="player-icon"><SkipNextIcon color={playerSettings.buttonColor} /></div>
            </div>
            <div className="mini-player-progress-container">
                <div style={{ width: '40%', height: `${playerSettings.progressThickness}px`, backgroundColor: playerSettings.progressColor }}></div>
            </div>
        </div>
    );
    
    const FullPlayerPreview = () => (
        <div className="full-player-preview" style={{ backgroundColor: playerSettings.backgroundColor, width: `${playerSettings.fullPlayerSize}%`, transition: playerSettings.enableAnimations ? 'all 0.3s ease' : 'none' }}>
            <div className="full-player-art-lg"></div>
            <p style={{ color: playerSettings.textColor, fontSize: `${playerSettings.titleFontSize}px`, fontWeight: 'bold', marginTop: '20px' }}>Song Title</p>
            <p style={{ color: playerSettings.textColor, fontSize: `${playerSettings.artistFontSize}px`, marginBottom: '20px' }}>Artist Name</p>
            <div className="full-player-progress-container" style={{ 
                height: `${playerSettings.progressThickness}px`, 
                backgroundColor: playerSettings.timelineBgColor,
                borderRadius: '99px'
            }}>
                <div style={{ 
                    width: '40%', 
                    height: '100%', 
                    backgroundColor: playerSettings.progressColor,
                    borderRadius: '99px'
                }}></div>
                 <div style={{
                    position: 'absolute',
                    left: '40%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: playerSettings.timelineThumbColor,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}></div>
            </div>
            <div className="full-player-controls">
                {playerSettings.showShuffle && <div className="player-icon"><ShuffleIcon color={playerSettings.shuffleButtonColor} active={true} /></div>}
                <div className="player-icon"><SkipPreviousIcon color={playerSettings.buttonColor} /></div>
                <div className="player-icon large"><PauseIcon color={playerSettings.buttonColor} /></div>
                <div className="player-icon"><SkipNextIcon color={playerSettings.buttonColor} /></div>
                {playerSettings.showRepeat && <div className="player-icon"><RepeatIcon color={playerSettings.repeatButtonColor} mode={'one'} /></div>}
            </div>
        </div>
    );

    return (
        <div className="player-customization-container">
            <h2 className="section-title">Player Customization</h2>
            
            <div className="preview-area">
                <MiniPlayerPreview />
                <FullPlayerPreview />
            </div>

            <div className="settings-grid">
                {/* Theme & Colors */}
                <div className="settings-group">
                    <h3>Theme & Colors</h3>
                    <div className="setting-item">
                        <label htmlFor="backgroundColor">Background Color</label>
                        <input type="color" id="backgroundColor" value={playerSettings.backgroundColor} onChange={e => handleSettingChange('backgroundColor', e.target.value)} />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="buttonColor">Button Color</label>
                        <input type="color" id="buttonColor" value={playerSettings.buttonColor} onChange={e => handleSettingChange('buttonColor', e.target.value)} />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="accentColor">Accent Color</label>
                        <input type="color" id="accentColor" value={playerSettings.accentColor} onChange={e => handleSettingChange('accentColor', e.target.value)} />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="textColor">Text Color</label>
                        <input type="color" id="textColor" value={playerSettings.textColor} onChange={e => handleSettingChange('textColor', e.target.value)} />
                    </div>
                </div>

                {/* Layout & Size */}
                <div className="settings-group">
                    <h3>Layout & Size</h3>
                    <div className="setting-item">
                        <label htmlFor="fullPlayerSize">Full Player Size ({playerSettings.fullPlayerSize}%)</label>
                        {/* FIX: The value from a range input is a string. It must be converted to a number to match the state's type. */}
                        <input type="range" id="fullPlayerSize" min="50" max="100" value={playerSettings.fullPlayerSize} onChange={e => handleSettingChange('fullPlayerSize', Number(e.target.value))} />
                    </div>
                     <div className="setting-item">
                        <label htmlFor="miniPlayerPosition">Mini Player Position</label>
                        <select id="miniPlayerPosition" value={playerSettings.miniPlayerPosition} onChange={e => handleSettingChange('miniPlayerPosition', e.target.value)}>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-stretched">Bottom (Stretched)</option>
                        </select>
                    </div>
                </div>
                
                 {/* Text & Fonts */}
                <div className="settings-group">
                    <h3>Text & Fonts</h3>
                    <div className="setting-item">
                        <label htmlFor="titleFontSize">Title Font Size ({playerSettings.titleFontSize}px)</label>
                        {/* FIX: The value from a range input is a string. It must be converted to a number to match the state's type. */}
                        <input type="range" id="titleFontSize" min="16" max="40" value={playerSettings.titleFontSize} onChange={e => handleSettingChange('titleFontSize', Number(e.target.value))} />
                    </div>
                     <div className="setting-item">
                        <label htmlFor="artistFontSize">Artist Font Size ({playerSettings.artistFontSize}px)</label>
                        {/* FIX: The value from a range input is a string. It must be converted to a number to match the state's type. */}
                        <input type="range" id="artistFontSize" min="12" max="32" value={playerSettings.artistFontSize} onChange={e => handleSettingChange('artistFontSize', Number(e.target.value))} />
                    </div>
                </div>

                {/* Controls & Buttons */}
                <div className="settings-group">
                    <h3>Controls & Buttons</h3>
                    <div className="setting-item toggle">
                        <label htmlFor="showShuffle">Show Shuffle Button</label>
                        <label className="switch">
                            <input type="checkbox" id="showShuffle" checked={playerSettings.showShuffle} onChange={e => handleSettingChange('showShuffle', e.target.checked)} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <div className="setting-item toggle">
                        <label htmlFor="showRepeat">Show Repeat Button</label>
                        <label className="switch">
                            <input type="checkbox" id="showRepeat" checked={playerSettings.showRepeat} onChange={e => handleSettingChange('showRepeat', e.target.checked)} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <div className="setting-item">
                        <label htmlFor="shuffleButtonColor">Shuffle Button Color</label>
                        <input type="color" id="shuffleButtonColor" value={playerSettings.shuffleButtonColor} onChange={e => handleSettingChange('shuffleButtonColor', e.target.value)} />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="repeatButtonColor">Repeat Button Color</label>
                        <input type="color" id="repeatButtonColor" value={playerSettings.repeatButtonColor} onChange={e => handleSettingChange('repeatButtonColor', e.target.value)} />
                    </div>
                </div>

                {/* Progress Bar */}
                 <div className="settings-group">
                    <h3>Progress Bar</h3>
                    <div className="setting-item">
                        <label htmlFor="progressThickness">Thickness ({playerSettings.progressThickness}px)</label>
                        {/* FIX: The value from a range input is a string. It must be converted to a number to match the state's type. */}
                        <input type="range" id="progressThickness" min="2" max="12" value={playerSettings.progressThickness} onChange={e => handleSettingChange('progressThickness', Number(e.target.value))} />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="progressColor">Progress Color</label>
                        <input type="color" id="progressColor" value={playerSettings.progressColor} onChange={e => handleSettingChange('progressColor', e.target.value)} />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="timelineBgColor">Background Color</label>
                        <input type="color" id="timelineBgColor" value={playerSettings.timelineBgColor} onChange={e => handleSettingChange('timelineBgColor', e.target.value)} />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="timelineThumbColor">Scrubber Color</label>
                        <input type="color" id="timelineThumbColor" value={playerSettings.timelineThumbColor} onChange={e => handleSettingChange('timelineThumbColor', e.target.value)} />
                    </div>
                </div>

                {/* Animations */}
                 <div className="settings-group">
                    <h3>Animations & Effects</h3>
                    <div className="setting-item toggle">
                        <label htmlFor="enableAnimations">Enable Animations</label>
                        <label className="switch">
                             <input type="checkbox" id="enableAnimations" checked={playerSettings.enableAnimations} onChange={e => handleSettingChange('enableAnimations', e.target.checked)} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div className="settings-actions">
                <button className="button-secondary" onClick={resetToDefaultSettings}>Reset to Default</button>
            </div>
        </div>
    );
};


const App = ({ songs, onSongAdded, activeItem, setActiveItem }) => {
    const { currentSong, isFullPlayerVisible } = useContext(PlayerContext);

    const renderContent = () => {
        switch (activeItem) {
            case 'Home':
                return <Home />;
            case 'Songs':
                return <Songs songs={songs} />;
            case 'Import':
                 return <Import onSongAdded={onSongAdded} setActiveItem={setActiveItem} />;
            case 'Settings':
                 return (
                    <div>
                        <h1 className="page-title">Settings</h1>
                        <hr className="title-underline" />
                        <AppearanceSettings />
                        <PlayerCustomization />
                    </div>
                );
            default:
                return <Home />;
        }
    };

    return (
        <>
            <main className="main-content">
                {renderContent()}
            </main>
            {isFullPlayerVisible && <FullPlayer />}
            {currentSong && !isFullPlayerVisible && <MiniPlayer />}
            <BottomNavBar activeItem={activeItem} setActiveItem={setActiveItem} />
        </>
    );
};

const AppWrapper = () => {
    const [activeItem, setActiveItem] = useState('Home');
    const [songs, setSongs] = useState([]);

    const addSong = (song) => {
        setSongs(prevSongs => [...prevSongs, song]);
    };

    return (
        <AppearanceProvider>
            <PlayerProvider songs={songs}>
                <App 
                    songs={songs} 
                    onSongAdded={addSong} 
                    activeItem={activeItem} 
                    setActiveItem={setActiveItem} 
                />
            </PlayerProvider>
        </AppearanceProvider>
    );
};

// FIX: Use createRoot from 'react-dom/client' for React 18 apps, and assert that the root element exists.
const root = createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <AppWrapper />
    </React.StrictMode>
);