import React, { useState, useEffect, useCallback } from 'react';
import { previewApi } from './services/api';
import { HomeFeedDto, ContentDetailDto, EpisodeDto, ContentSummaryDto, PlaybackResolutionResultDto } from '@anivora/types';
import { Colors } from './theme/tokens';

type ActiveScreen = 'HOME' | 'DETAIL' | 'SEARCH' | 'PLAYER';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ActiveScreen>('HOME');
  const [history, setHistory] = useState<ActiveScreen[]>([]);
  const [homeFeed, setHomeFeed] = useState<HomeFeedDto | null>(null);
  const [detailContent, setDetailContent] = useState<ContentDetailDto | null>(null);
  const [detailEpisodes, setDetailEpisodes] = useState<EpisodeDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContentSummaryDto[]>([]);
  const [playbackData, setPlaybackData] = useState<PlaybackResolutionResultDto | null>(null);
  const [playingTitle, setPlayingTitle] = useState('');

  // Focus Matrix state
  // [row, col] -> row 0: Navbar/Hero, row 1+: Rails or Episodes
  const [focusRow, setFocusRow] = useState(0);
  const [focusCol, setFocusCol] = useState(0);

  const fetchHome = useCallback(async () => {
    try {
      const data = await previewApi.getHome();
      setHomeFeed(data);
    } catch (e) {
      console.error('Failed to load home:', e);
    }
  }, []);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  const navigate = (nextScreen: ActiveScreen) => {
    setHistory((prev) => [...prev, screen]);
    setScreen(nextScreen);
    setFocusRow(0);
    setFocusCol(0);
  };

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      if (prev) {
        setHistory((h) => h.slice(0, -1));
        setScreen(prev);
        setFocusRow(0);
        setFocusCol(0);
      }
    }
  }, [history]);

  const openDetail = async (slugOrId: string) => {
    try {
      const detail = await previewApi.getDetail(slugOrId);
      const eps = await previewApi.getEpisodes(slugOrId);
      setDetailContent(detail);
      setDetailEpisodes(eps);
      navigate('DETAIL');
    } catch (e) {
      console.error('Failed to open detail:', e);
    }
  };

  const openPlayer = async (episodeId: string, title: string) => {
    try {
      setPlayingTitle(title);
      const data = await previewApi.resolvePlayback(episodeId);
      setPlaybackData(data);
      navigate('PLAYER');
    } catch (e) {
      console.error('Failed to play episode:', e);
    }
  };

  // Keyboard navigation for TV D-Pad simulation (Arrow keys, Enter, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusRow((r) => Math.max(0, r - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusRow((r) => r + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusCol((c) => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusCol((c) => c + 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerSelect();
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const triggerSelect = () => {
    if (screen === 'HOME') {
      if (focusRow === 0 && focusCol === 0 && homeFeed?.hero?.[0]) {
        openDetail(homeFeed.hero[0].slug || homeFeed.hero[0].id);
      } else if (focusRow === 0 && focusCol === 1) {
        navigate('SEARCH');
      } else if (focusRow > 0 && homeFeed?.sections) {
        const sectionIndex = focusRow - 1;
        const section = homeFeed.sections[sectionIndex];
        const item = section?.items?.[focusCol];
        if (item) {
          if (item.episodeId) {
            openPlayer(item.episodeId, `${item.title} - EP ${item.episodeNumber}`);
          } else if (item.id || item.slug) {
            openDetail(item.slug || item.id!);
          }
        }
      }
    } else if (screen === 'DETAIL') {
      if (focusRow === 0 && detailEpisodes.length > 0 && detailEpisodes[0]) {
        const ep = detailEpisodes[0];
        openPlayer(ep.id, `${detailContent?.title} - EP ${ep.episodeNumber}`);
      } else if (focusRow > 0) {
        const epIndex = (focusRow - 1) * 4 + focusCol;
        const ep = detailEpisodes[epIndex];
        if (ep) {
          openPlayer(ep.id, `${detailContent?.title} - EP ${ep.episodeNumber}`);
        }
      }
    } else if (screen === 'SEARCH') {
      if (searchResults[focusCol]) {
        const item = searchResults[focusCol];
        if (item) {
          openDetail(item.slug || item.id);
        }
      }
    }
  };

  const handleSearchInput = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      try {
        const res = await previewApi.search(val.trim());
        setSearchResults(res);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#040508' }}>
      {/* 10-FOOT TV SCREEN CONTAINER (16:9 Aspect Ratio Emulator) */}
      <div
        style={{
          flex: 1,
          height: '100%',
          background: Colors.backgroundPrimary,
          overflowY: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top TV Header Bar */}
        <div
          style={{
            padding: '24px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(8,9,13,0.95) 0%, rgba(8,9,13,0) 100%)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                background: Colors.accentPrimary,
                color: '#FFF',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '18px',
                letterSpacing: '1px',
              }}
            >
              ANIVORA
            </div>
            <span style={{ color: Colors.textMuted, fontSize: '14px', fontWeight: 600 }}>
              TV 10-FOOT ENGINE • {screen}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setScreen('HOME');
                setFocusRow(0);
                setFocusCol(0);
              }}
              style={{
                background: screen === 'HOME' ? Colors.backgroundElevated : 'transparent',
                color: screen === 'HOME' ? Colors.textPrimary : Colors.textMuted,
                border: focusRow === 0 && focusCol === 0 && screen === 'HOME' ? `2px solid ${Colors.accentPrimary}` : '2px solid transparent',
                padding: '8px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Home
            </button>
            <button
              onClick={() => navigate('SEARCH')}
              style={{
                background: screen === 'SEARCH' ? Colors.backgroundElevated : 'transparent',
                color: screen === 'SEARCH' ? Colors.textPrimary : Colors.textMuted,
                border: focusRow === 0 && focusCol === 1 && screen === 'HOME' ? `2px solid ${Colors.accentPrimary}` : '2px solid transparent',
                padding: '8px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              🔍 Search
            </button>
            {screen !== 'HOME' && (
              <button
                onClick={goBack}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: Colors.textSecondary,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ⮌ BACK (Esc)
              </button>
            )}
          </div>
        </div>

        {/* SCREEN 1: HOME */}
        {screen === 'HOME' && homeFeed && (
          <div style={{ paddingBottom: '64px' }}>
            {/* Hero Section */}
            {homeFeed.hero?.[0] && (
              <div
                style={{
                  height: '380px',
                  margin: '0 48px 32px 48px',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: `linear-gradient(90deg, #08090D 30%, rgba(8,9,13,0.4) 100%), url(${homeFeed.hero[0].backdropUrl || homeFeed.hero[0].posterUrl}) center/cover no-repeat`,
                  border: focusRow === 0 && focusCol === 0 ? `3px solid ${Colors.accentPrimary}` : '3px solid transparent',
                  boxShadow: focusRow === 0 && focusCol === 0 ? `0 0 24px ${Colors.focusGlow}` : 'none',
                  transition: 'all 0.2s ease',
                  padding: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ background: Colors.accentPrimary, color: '#FFF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                    {homeFeed.hero[0].type}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: Colors.warning, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                    ★ {homeFeed.hero[0].rating ? homeFeed.hero[0].rating.toFixed(1) : '8.5'}
                  </span>
                </div>
                <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '8px', maxWidth: '700px' }}>
                  {homeFeed.hero[0].title}
                </h1>
                <p style={{ color: Colors.textSecondary, fontSize: '15px', maxWidth: '650px', lineHeight: 1.5, marginBottom: '20px' }}>
                  {homeFeed.hero[0].synopsis || 'Nonton streaming anime & donghua kualitas HD subtitle Indonesia tercepat di ANIVORA TV.'}
                </p>
                <div>
                  <button
                    onClick={() => {
                      const heroItem = homeFeed.hero[0];
                      if (heroItem) {
                        openDetail(heroItem.slug || heroItem.id);
                      }
                    }}
                    style={{
                      background: Colors.accentPrimary,
                      color: '#FFF',
                      border: 'none',
                      padding: '12px 28px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                    }}
                  >
                    ▶ Tonton Sekarang
                  </button>
                </div>
              </div>
            )}

            {/* Rails */}
            {homeFeed.sections?.map((section, sIdx) => {
              const isCurrentRail = focusRow === sIdx + 1;
              return (
                <div key={section.id} style={{ marginBottom: '32px', paddingLeft: '48px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: isCurrentRail ? Colors.accentSecondary : Colors.textPrimary }}>
                    {section.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px' }}>
                    {section.items?.map((item, iIdx) => {
                      const isItemFocused = isCurrentRail && focusCol === iIdx;
                      return (
                        <div
                          key={item.id || item.episodeId || iIdx}
                          onClick={() => {
                            if (item.episodeId) {
                              openPlayer(item.episodeId, `${item.title} - EP ${item.episodeNumber}`);
                            } else {
                              openDetail(item.slug || item.id!);
                            }
                          }}
                          style={{
                            width: '160px',
                            flexShrink: 0,
                            borderRadius: '10px',
                            background: Colors.backgroundElevated,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transform: isItemFocused ? 'scale(1.06)' : 'scale(1)',
                            border: isItemFocused ? `3px solid ${Colors.accentPrimary}` : '3px solid transparent',
                            boxShadow: isItemFocused ? `0 0 16px ${Colors.focusGlow}` : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ height: '220px', position: 'relative' }}>
                            <img
                              src={item.posterUrl || 'https://via.placeholder.com/160x220?text=No+Cover'}
                              alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {item.episodeNumber && (
                              <div style={{ position: 'absolute', top: '8px', right: '8px', background: Colors.accentPrimary, color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                EP {item.episodeNumber}
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '11px', color: Colors.textMuted, marginTop: '2px' }}>
                              {item.status || item.type || 'SUB INDO'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SCREEN 2: DETAIL */}
        {screen === 'DETAIL' && detailContent && (
          <div style={{ padding: '32px 48px', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '36px', marginBottom: '40px' }}>
              <img
                src={detailContent.posterUrl || ''}
                alt={detailContent.title}
                style={{ width: '220px', height: '320px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ background: Colors.accentPrimary, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                    {detailContent.type}
                  </span>
                  <span style={{ background: Colors.backgroundElevated, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: Colors.warning }}>
                    ★ {detailContent.rating || 'N/A'}
                  </span>
                  <span style={{ background: Colors.backgroundElevated, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', color: Colors.textSecondary }}>
                    {detailContent.status} • {detailContent.releaseYear || '2024'}
                  </span>
                </div>
                <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>{detailContent.title}</h1>
                <p style={{ color: Colors.textSecondary, fontSize: '15px', lineHeight: 1.6, maxWidth: '750px', marginBottom: '24px' }}>
                  {detailContent.synopsis || 'Tidak ada sinopsis tersedia.'}
                </p>

                <div style={{ display: 'flex', gap: '16px' }}>
                  {detailEpisodes[0] && (
                    <button
                      onClick={() => {
                        const firstEp = detailEpisodes[0];
                        if (firstEp) {
                          openPlayer(firstEp.id, `${detailContent.title} - EP ${firstEp.episodeNumber}`);
                        }
                      }}
                      style={{
                        background: Colors.accentPrimary,
                        color: '#FFF',
                        border: focusRow === 0 ? '3px solid #FFF' : '3px solid transparent',
                        padding: '12px 32px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '16px',
                        cursor: 'pointer',
                        transform: focusRow === 0 ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      ▶ Putar Episode 1
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Episode Grid */}
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Daftar Episode ({detailEpisodes.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {detailEpisodes.map((ep, idx) => {
                const epRow = Math.floor(idx / 4) + 1;
                const epCol = idx % 4;
                const isEpFocused = focusRow === epRow && focusCol === epCol;
                return (
                  <div
                    key={ep.id}
                    onClick={() => openPlayer(ep.id, `${detailContent.title} - EP ${ep.episodeNumber}`)}
                    style={{
                      background: isEpFocused ? Colors.accentPrimary : Colors.backgroundElevated,
                      color: '#FFF',
                      padding: '18px 24px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: isEpFocused ? '2px solid #FFF' : '2px solid transparent',
                      transform: isEpFocused ? 'scale(1.03)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>Episode {ep.episodeNumber}</span>
                    <span style={{ fontSize: '13px', opacity: 0.8 }}>HD • Sub Indo</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN 3: SEARCH */}
        {screen === 'SEARCH' && (
          <div style={{ padding: '32px 48px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '20px' }}>Pencarian TV</h1>
            <input
              type="text"
              placeholder="Ketik judul anime / donghua..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                maxWidth: '600px',
                padding: '16px 24px',
                fontSize: '18px',
                borderRadius: '10px',
                background: Colors.backgroundElevated,
                border: `2px solid ${Colors.accentPrimary}`,
                color: '#FFF',
                outline: 'none',
                marginBottom: '32px',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
              {searchResults.map((item, idx) => {
                const isFocused = focusCol === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => openDetail(item.slug || item.id)}
                    style={{
                      borderRadius: '10px',
                      background: Colors.backgroundElevated,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isFocused ? `3px solid ${Colors.accentPrimary}` : '3px solid transparent',
                      transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <img src={item.posterUrl || ''} alt={item.title} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                    <div style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: Colors.textMuted, marginTop: '4px' }}>{item.type} • {item.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN 4: PLAYER */}
        {screen === 'PLAYER' && playbackData && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#000' }}>
            {/* Live Video / Embed Player Container */}
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playbackData.selectedSource?.streamUrl ? (
                <iframe
                  src={playbackData.selectedSource.streamUrl}
                  title={playingTitle}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#000',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: Colors.textMuted }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', color: Colors.accentPrimary }}>▶</div>
                  <h3>Stream link tidak tersedia</h3>
                </div>
              )}
            </div>

            {/* Player OSD Control Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                left: '48px',
                right: '48px',
                background: 'rgba(15, 17, 23, 0.92)',
                padding: '16px 24px',
                borderRadius: '12px',
                border: `1px solid ${Colors.borderSubtle}`,
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF' }}>{playingTitle}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span style={{ background: Colors.accentPrimary, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                      {playbackData.selectedSource?.serverLabel || 'Server Utama'}
                    </span>
                    <span style={{ background: Colors.backgroundElevated, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: Colors.accentSecondary }}>
                      {playbackData.selectedSource?.quality || '720p'} • {playbackData.selectedSource?.format || 'HLS'}
                    </span>
                  </div>
                </div>

                {/* Server Switcher options */}
                {playbackData.backupSources && playbackData.backupSources.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: Colors.textMuted }}>Server Cadangan:</span>
                    {playbackData.backupSources.slice(0, 3).map((backup, bIdx) => (
                      <button
                        key={backup.id || bIdx}
                        onClick={() => {
                          setPlaybackData({
                            ...playbackData,
                            selectedSource: backup,
                            backupSources: [
                              playbackData.selectedSource,
                              ...playbackData.backupSources.filter((_, idx) => idx !== bIdx),
                            ],
                          });
                        }}
                        style={{
                          background: Colors.backgroundElevated,
                          color: '#FFF',
                          border: `1px solid ${Colors.borderSubtle}`,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {backup.serverLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', position: 'relative' }}>
                <div style={{ width: '45%', height: '100%', background: Colors.accentPrimary, borderRadius: '2px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: Colors.textSecondary }}>
                <span>10:45 / 24:00 (Auto Progress Sync 15s)</span>
                <span>Sub Indo • Media3 Hardware Acceleration</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIRTUAL D-PAD REMOTE CONTROLLER (SIDE PANEL) */}
      <div
        style={{
          width: '320px',
          background: '#0B0D13',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '1px', color: Colors.accentPrimary, marginBottom: '4px' }}>
            ANIVORA REMOTE
          </div>
          <div style={{ fontSize: '12px', color: Colors.textMuted }}>TV D-Pad Focus Controller</div>
        </div>

        {/* Physical D-Pad Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setFocusRow((r) => Math.max(0, r - 1))}
            style={{
              width: '64px',
              height: '50px',
              background: '#1A1D27',
              color: '#FFF',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ▲
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFocusCol((c) => Math.max(0, c - 1))}
              style={{
                width: '50px',
                height: '50px',
                background: '#1A1D27',
                color: '#FFF',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ◀
            </button>
            <button
              onClick={triggerSelect}
              style={{
                width: '64px',
                height: '50px',
                background: Colors.accentPrimary,
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '13px',
              }}
            >
              OK
            </button>
            <button
              onClick={() => setFocusCol((c) => c + 1)}
              style={{
                width: '50px',
                height: '50px',
                background: '#1A1D27',
                color: '#FFF',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ▶
            </button>
          </div>

          <button
            onClick={() => setFocusRow((r) => r + 1)}
            style={{
              width: '64px',
              height: '50px',
              background: '#1A1D27',
              color: '#FFF',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ▼
          </button>
        </div>

        {/* Function Keys */}
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            onClick={goBack}
            style={{
              flex: 1,
              padding: '12px',
              background: '#1A1D27',
              color: Colors.textSecondary,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            ⮌ BACK
          </button>
          <button
            onClick={() => {
              setScreen('HOME');
              setFocusRow(0);
              setFocusCol(0);
            }}
            style={{
              flex: 1,
              padding: '12px',
              background: '#1A1D27',
              color: Colors.textSecondary,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            ⌂ HOME
          </button>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: '11px', color: Colors.textMuted, lineHeight: 1.5, textAlign: 'center' }}>
          💡 <strong>Keyboard Shortcuts:</strong><br />
          Arrow Keys: Navigasi D-Pad<br />
          Enter: Pilih (OK)<br />
          Esc / Backspace: Kembali (BACK)
        </div>
      </div>
    </div>
  );
};

export default App;

