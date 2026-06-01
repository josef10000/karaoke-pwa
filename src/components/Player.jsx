import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, LogOut, Sparkles, Mic, Settings, Link2, AlertTriangle } from 'lucide-react';
import { initAudioStream } from '../utils/audio';
import { findTargetNoteAtTime, evaluatePitch, getFeedbackStyle } from '../utils/scoring';
import { demoSongsNotes } from '../songs-catalog';
import { extractYouTubeId } from '../utils/ultrastar';


export default function Player({ song, threshold, setThreshold, selectedAudioDevice, setSelectedAudioDevice, onFinishSong, onNavigateHome }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [activeNote, setActiveNote] = useState(null);
  
  // ID ativo do YouTube e controle do link alternativo
  const [activeYoutubeId, setActiveYoutubeId] = useState(song.youtubeId);
  const [tempYoutubeLink, setTempYoutubeLink] = useState('');
  const [youtubeError, setYoutubeError] = useState('');

  
  // Lista de microfones disponíveis para o seletor rápido no Player
  const [devicesList, setDevicesList] = useState([]);
  
  // Dados de captação de voz em tempo real
  const [voiceData, setVoiceData] = useState({ pitchHz: -1, midiNote: -1, noteName: '-', rms: 0 });
  const [feedback, setFeedback] = useState({ text: '', color: 'transparent' });
  const [showSettings, setShowSettings] = useState(false);

  // Refs de controle
  const ytPlayerRef = useRef(null);
  const audioStreamRef = useRef(null);
  const thresholdRef = useRef(threshold);
  const selectedAudioDeviceRef = useRef(selectedAudioDevice);

  // Notas musicais da música ativa (seja da demo ou carregada do Firebase)
  const songData = song.hasDemo ? demoSongsNotes[song.id] : song;
  const hasTargetNotes = songData && songData.notes && songData.notes.length > 0;

  // Atualiza refs para o loop de áudio poder ler instantaneamente sem causar re-renderizações indesejadas
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  useEffect(() => {
    selectedAudioDeviceRef.current = selectedAudioDevice;
    
    // Se o microfone mudar enquanto a música está tocando, reinicializa o áudio
    if (isPlaying) {
      restartAudioCapture();
    }
  }, [selectedAudioDevice]);

  // Carrega microfones disponíveis para o painel de calibração rápido
  const loadAudioDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      setDevicesList(audioInputs);
    } catch (err) {
      console.warn("Falha ao enumerar dispositivos no Player: ", err);
    }
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  // Inicializa o Player do YouTube
  useEffect(() => {
    const initPlayer = () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }

      ytPlayerRef.current = new window.YT.Player('youtube-player', {
        videoId: activeYoutubeId,
        playerVars: {
          autoplay: 0,
          controls: 0, // Oculta controles nativos para design premium customizado
          disablekb: 1,
          fs: 0,
          rel: 0,
          showinfo: 0,
          modestbranding: 1
        },
        events: {
          onStateChange: (event) => {
            // Se a música acabar (status 0 = ended)
            if (event.data === 0) {
              handleFinish();
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopAudioCapture();
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [song, activeYoutubeId]);


  // Loop de atualização de tempo sincronizado do YouTube
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
          const time = ytPlayerRef.current.getCurrentTime();
          setCurrentTime(time);
          
          if (hasTargetNotes) {
            const active = findTargetNoteAtTime(time, songData.notes);
            setActiveNote(active);
          }
        }
      }, 50);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, hasTargetNotes, songData]);

  // Processador e avaliador do tom de voz em tempo real
  const handleAudioProcess = (data) => {
    setVoiceData(data);

    if (hasTargetNotes && activeNote && data.midiNote > 0) {
      const evaluation = evaluatePitch(data.midiNote, activeNote.pitch);
      
      if (evaluation.points > 0) {
        setScore((prev) => prev + evaluation.points);
        setFeedback(getFeedbackStyle(evaluation.rating));
        createPerfectParticle();
      } else {
        setFeedback({ text: '', color: 'transparent' });
      }
    } else {
      // Modo Livre (Free-Sing): acumula pontos por manter a voz ativa e firme
      if (!hasTargetNotes && data.rms > thresholdRef.current) {
        setScore((prev) => prev + 15);
        setFeedback({ text: 'SOPRANDO A VOZ!', color: 'var(--color-secondary)' });
      } else {
        if (data.midiNote === -1) {
          setFeedback({ text: '', color: 'transparent' });
        }
      }
    }
  };

  // Efeito visual de partícula ao acertar nota
  const createPerfectParticle = () => {
    const track = document.getElementById('pitch-track');
    if (!track) return;

    const pointer = document.getElementById('user-pointer');
    if (!pointer) return;

    const rect = pointer.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();

    const particle = document.createElement('div');
    particle.className = 'particle-blast';
    particle.style.left = `${rect.left - trackRect.left + 8}px`;
    particle.style.top = `${rect.top - trackRect.top + 8}px`;

    track.appendChild(particle);
    setTimeout(() => {
      particle.remove();
    }, 2000);
  };

  // Inicializa a captura do microfone
  const startAudioCapture = async () => {
    try {
      const stream = await initAudioStream(
        handleAudioProcess, 
        () => thresholdRef.current,
        selectedAudioDeviceRef.current // Passa o microfone ativo!
      );
      audioStreamRef.current = stream;
    } catch (err) {
      console.error("Falha ao abrir gravação: ", err);
    }
  };

  const stopAudioCapture = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.stop();
      audioStreamRef.current = null;
    }
    setVoiceData({ pitchHz: -1, midiNote: -1, noteName: '-', rms: 0 });
    setFeedback({ text: '', color: 'transparent' });
  };

  const restartAudioCapture = async () => {
    stopAudioCapture();
    await startAudioCapture();
  };

  // Funções de Reprodução do YouTube
  const togglePlay = async () => {
    if (!ytPlayerRef.current) return;

    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
      stopAudioCapture();
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
      await startAudioCapture();
    }
  };

  const handleFinish = () => {
    stopAudioCapture();
    let finalPercent = 0;
    
    if (hasTargetNotes) {
      // Filtra apenas as notas que o cantor já teve a oportunidade de cantar até o tempo atual
      const playedNotes = songData.notes.filter(note => note.time <= currentTime + 0.5);
      
      // Estabelece um mínimo de notas para o cálculo ser estatisticamente justo
      const calculateAgainstCount = Math.max(playedNotes.length, 5);
      const maxPossible = calculateAgainstCount * 100;
      
      finalPercent = Math.min(Math.round((score / maxPossible) * 100), 100);
    } else {
      // Modo Livre (Free-Sing) proporcional ao tempo de vídeo decorrido
      const duration = ytPlayerRef.current && ytPlayerRef.current.getDuration ? ytPlayerRef.current.getDuration() : 180;
      const progressPercent = Math.max(0.05, Math.min(currentTime / duration, 1));
      const maxPossible = Math.round(15000 * progressPercent);
      
      finalPercent = Math.min(Math.round((score / maxPossible) * 100), 100);
    }
    
    onFinishSong({ score, scorePercent: finalPercent });
  };

  const getNoteYPosition = (midiNote) => {
    const minMidi = 48; // A3
    const maxMidi = 78; // F#5
    const range = maxMidi - minMidi;
    const clamped = Math.max(minMidi, Math.min(maxMidi, midiNote));
    return 100 - ((clamped - minMidi) / range) * 100;
  };

  return (
    <div className="flex-1 flex flex-col w-full relative">
      
      {/* Detalhes Superiores do Player */}
      <div className="glass-panel p-4 mb-4 flex-row-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { stopAudioCapture(); onNavigateHome(); }}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', borderRadius: '10px' }}
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
          <div>
            <h3 className="font-bold font-title text-base truncate max-w-[180px] md:max-w-md text-white">{song.title}</h3>
            <p className="text-xs text-color-text-muted leading-none mt-0.5">{song.artist}</p>
          </div>
        </div>

        {/* Pontuação Neon */}
        <div className="text-right">
          <span className="text-[10px] text-color-text-muted font-bold block uppercase tracking-wider">Pontos Neon</span>
          <span className="text-3xl font-black font-title text-gradient title-glow leading-none">{score}</span>
        </div>
      </div>

      {/* Grid de Vídeo e Barra de Pitch */}
      <div className="flex flex-col gap-4 flex-1 mb-4">
        
        {/* YouTube Container */}
        <div className="glass-panel p-1 aspect-video relative overflow-hidden rounded-2xl bg-black max-h-[360px] mx-auto w-full">
          <div id="youtube-player" className="w-full h-full rounded-xl pointer-events-none" />
          
          {/* Overlay de Canto Inicial */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/85 backdrop-filter backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10 overflow-y-auto">
              <span className="hero-tag mb-2">
                <Sparkles className="w-4 h-4" /> Preparar para Soltar a Voz
              </span>
              <h2 className="text-3xl font-extrabold font-title mb-4 text-white">{song.title}</h2>
              <button
                onClick={togglePlay}
                className="btn btn-primary rounded-full w-16 h-16 p-0 flex items-center justify-center text-white scale-100 hover:scale-105 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              >
                <Play className="w-6 h-6 fill-current ml-1" />
              </button>
              
              {/* Box rápido para trocar o vídeo caso esteja indisponível */}
              <div className="w-full max-w-sm glass-panel p-3 bg-black/60 border border-white/5 rounded-xl">
                <p className="text-[10px] text-color-text-muted mb-2 flex items-center gap-1 justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> 
                  Vídeo com erro ou indisponível? Troque o link:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cole aqui o link do YouTube..."
                    value={tempYoutubeLink}
                    onChange={(e) => {
                      setTempYoutubeLink(e.target.value);
                      setYoutubeError('');
                    }}
                    className="flex-1 select-field text-xs py-1.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                  <button
                    onClick={() => {
                      const id = extractYouTubeId(tempYoutubeLink);
                      if (id) {
                        setActiveYoutubeId(id);
                        setTempYoutubeLink('');
                        setYoutubeError('');
                      } else {
                        setYoutubeError('Link inválido!');
                      }
                    }}
                    className="btn btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Mudar
                  </button>
                </div>
                {youtubeError && (
                  <p className="text-[9px] text-red-400 mt-1 font-bold">{youtubeError}</p>
                )}
              </div>

              <p className="text-[10px] text-color-text-muted mt-4 max-w-xs leading-tight">
                Posicione os microfones da caixa Bluetooth e clique em Calibrar abaixo se necessário!
              </p>
            </div>
          )}
        </div>

        {/* Barra de Pitch (Guitar Hero Style) */}
        {hasTargetNotes && isPlaying && (
          <div className="relative">
            <div id="pitch-track" className="pitch-track-container">
              {[20, 40, 60, 80].map((top, idx) => (
                <div key={idx} className="pitch-grid-line" style={{ top: `${top}%` }} />
              ))}

              {activeNote && (
                <div
                  className="pitch-target-block"
                  style={{
                    top: `${getNoteYPosition(activeNote.pitch)}%`,
                    left: '25%',
                    width: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
              )}

              {voiceData.midiNote > 0 && (
                <div
                  id="user-pointer"
                  className={`pitch-user-pointer ${feedback.text === 'PERFEITO!' ? 'perfect' : ''}`}
                  style={{
                    top: `${getNoteYPosition(voiceData.midiNote)}%`,
                    left: '50%'
                  }}
                />
              )}

              <div className="absolute left-4 bottom-2 bg-black/60 px-2 py-0.5 rounded border border-white/5 text-[10px] font-bold font-title flex items-center gap-1.5 text-color-text-muted">
                <Mic className="w-3 h-3 text-primary animate-pulse" /> Cantando: {voiceData.noteName}
              </div>

              {feedback.text && (
                <div
                  className="absolute right-4 top-2 font-black font-title text-sm tracking-wide animate-pulse"
                  style={{ color: feedback.color, textShadow: `0 0 10px ${feedback.color}` }}
                >
                  {feedback.text}
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Controles do Karaokê */}
      {isPlaying && (
        <div className="glass-panel p-4 flex-row-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="btn btn-secondary rounded-full w-10 h-10 p-0 flex items-center justify-center"
            >
              <Pause className="w-5 h-5" />
            </button>
            <span className="text-xs text-color-text-muted font-bold font-title">
              Tempo: {Math.floor(currentTime / 60)}:{(currentTime % 60 < 10 ? '0' : '')}{Math.floor(currentTime % 60)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-secondary flex items-center gap-1.5"
              style={{ padding: '8px 16px', borderRadius: '10px' }}
            >
              <Settings className="w-4 h-4" /> Calibrar Microfone
            </button>
            
            <button
              onClick={handleFinish}
              className="btn btn-primary"
              style={{ padding: '8px 20px', borderRadius: '10px' }}
            >
              Finalizar Performance
            </button>
          </div>
        </div>
      )}

      {/* Painel Rápido de Calibração / Ajuste de Microfone */}
      {showSettings && (
        <div className="absolute bottom-16 right-4 w-80 glass-panel p-5 z-50 bg-black/95 border border-purple-500/30">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold font-title text-white flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-primary" /> Ajuste Rápido de Captação
            </span>
            <button onClick={() => setShowSettings(false)} className="text-[10px] text-color-text-muted hover:text-white">Fechar</button>
          </div>

          {/* Seletor Rápido de Microfone */}
          <div className="flex flex-col gap-1.5 mb-3">
            <span className="text-[10px] font-semibold text-color-text-muted uppercase">Microfone Ativo</span>
            <select
              value={selectedAudioDevice}
              onChange={(e) => setSelectedAudioDevice(e.target.value)}
              className="select-field text-xs py-2 px-3"
            >
              {devicesList.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microfone Externo ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Sensibilidade (Threshold) */}
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex justify-between text-[10px] text-color-text-muted">
              <span>Limiar de Captação</span>
              <span className="font-bold text-primary font-title">{(threshold * 1000).toFixed(0)} mV</span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.08"
              step="0.002"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-600 mb-2"
            />
            <div className="flex justify-between text-[9px] text-color-text-muted leading-none">
              <span>Silêncio</span>
              <span>Caixa de Som no Alto</span>
            </div>
          </div>

          {/* Troca de Link Rápida no Menu */}
          <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-semibold text-color-text-muted uppercase">Substituir Vídeo Ativo</span>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="URL ou ID do YouTube..."
                value={tempYoutubeLink}
                onChange={(e) => setTempYoutubeLink(e.target.value)}
                className="flex-1 select-field text-[11px] py-1.5 px-2.5 bg-white/5 border border-white/10 rounded-lg text-white"
              />
              <button
                onClick={() => {
                  const id = extractYouTubeId(tempYoutubeLink);
                  if (id) {
                    setActiveYoutubeId(id);
                    setTempYoutubeLink('');
                    alert("Vídeo atualizado com sucesso!");
                  } else {
                    alert("Link do YouTube inválido.");
                  }
                }}
                className="btn btn-primary text-xs px-2.5 py-1.5 rounded-lg"
              >
                Alterar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
