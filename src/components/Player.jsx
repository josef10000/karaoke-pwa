import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, LogOut, Sparkles, Volume2, Mic, Settings } from 'lucide-react';
import { initAudioStream } from '../utils/audio';
import { findTargetNoteAtTime, evaluatePitch, getFeedbackStyle } from '../utils/scoring';
import { demoSongsNotes } from '../songs-catalog';

export default function Player({ song, threshold, setThreshold, onFinishSong, onNavigateHome }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [activeNote, setActiveNote] = useState(null);
  
  // Dados de captação de voz em tempo real
  const [voiceData, setVoiceData] = useState({ pitchHz: -1, midiNote: -1, noteName: '-', rms: 0 });
  const [feedback, setFeedback] = useState({ text: '', color: 'transparent' });
  const [showSettings, setShowSettings] = useState(false);

  // Refs de controle
  const ytPlayerRef = useRef(null);
  const audioStreamRef = useRef(null);
  const requestRef = useRef(null);
  const thresholdRef = useRef(threshold);

  // Notas musicais da música ativa (seja da demo ou carregada do Firebase)
  const songData = song.hasDemo ? demoSongsNotes[song.id] : song;
  const hasTargetNotes = songData && songData.notes && songData.notes.length > 0;

  // Atualiza ref do threshold para o loop de áudio poder ler instantaneamente
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  // Inicializa o Player do YouTube
  useEffect(() => {
    const initPlayer = () => {
      // Destrói player se já existir por garantia
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }

      ytPlayerRef.current = new window.YT.Player('youtube-player', {
        videoId: song.youtubeId,
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
          onReady: () => {
            console.log("YouTube Player Pronto");
          },
          onStateChange: (event) => {
            // Se a música acabar (status 0 = ended)
            if (event.data === 0) {
              handleFinish();
            }
          }
        }
      });
    };

    // Caso a API do YouTube já esteja carregada
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Fallback aguardando API carregar
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopAudioCapture();
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [song]);

  // Loop de atualização de tempo sincronizado do YouTube
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
          const time = ytPlayerRef.current.getCurrentTime();
          setCurrentTime(time);
          
          // Se tiver notas mapeadas, processa a nota ativa no segundo atual
          if (hasTargetNotes) {
            const active = findTargetNoteAtTime(time, songData.notes);
            setActiveNote(active);
          }
        }
      }, 50); // Tick rápido para sincronia perfeita
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, hasTargetNotes, songData]);

  // Processador e avaliador do tom de voz em tempo real
  const handleAudioProcess = (data) => {
    setVoiceData(data);

    // Se tiver nota alvo ativa na música e o usuário estiver cantando algo
    if (hasTargetNotes && activeNote && data.midiNote > 0) {
      const evaluation = evaluatePitch(data.midiNote, activeNote.pitch);
      
      if (evaluation.points > 0) {
        setScore((prev) => prev + evaluation.points);
        setFeedback(getFeedbackStyle(evaluation.rating));
        
        // Dispara partícula de acerto perfeito
        createPerfectParticle();
      } else {
        setFeedback({ text: '', color: 'transparent' });
      }
    } else {
      // Modo Canto Livre (Free-Sing) sem notas pré-mapeadas
      // Usuário ganha pontos se sustentar som acima do limiar no ritmo
      if (!hasTargetNotes && data.rms > thresholdRef.current) {
        setScore((prev) => prev + 15); // Pontuação simplificada por canto/energia
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
    }, 4000);
  };

  // Controle de Áudio
  const startAudioCapture = async () => {
    try {
      const stream = await initAudioStream(handleAudioProcess, () => thresholdRef.current);
      audioStreamRef.current = stream;
    } catch (err) {
      alert("Permissão de microfone negada. Não será possível processar a pontuação.");
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

  // Funções de Reprodução
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
    // Mapeia pontuação final percentual para enviar
    // Pontuação máxima arbitrária baseada na duração ou total de notas
    const maxPossible = hasTargetNotes ? songData.notes.length * 100 : 15000;
    const finalPercent = Math.min(Math.round((score / maxPossible) * 100), 100);
    onFinishSong({ score, scorePercent: finalPercent });
  };

  // --- Lógica de Renderização de Letras ---
  // Acha a linha de letra atual baseado nas notas cronológicas
  const getLyricsMarkup = () => {
    if (!hasTargetNotes) {
      return (
        <div className="text-center py-6">
          <p className="lyric-line active">Modo Livre - Acompanhe a legenda do vídeo do YouTube!</p>
          <p className="text-xs text-color-text-muted mt-2">Cante perto do microfone e pontue por ritmo e intensidade.</p>
        </div>
      );
    }

    // Agrupa notas em frases baseado em tempo / GAP (ex: silêncio maior que 1.5 segundos divide frases)
    const phrases = [];
    let currentPhrase = [];
    
    songData.notes.forEach((note, idx) => {
      currentPhrase.push(note);
      const nextNote = songData.notes[idx + 1];
      
      if (!nextNote || (nextNote.time - (note.time + note.duration)) > 1.8) {
        phrases.push([...currentPhrase]);
        currentPhrase = [];
      }
    });

    // Encontra a frase atual na qual o tempo corrente do vídeo se encaixa
    let activePhraseIndex = phrases.findIndex(phrase => {
      const start = phrase[0].time;
      const end = phrase[phrase.length - 1].time + phrase[phrase.length - 1].duration;
      return currentTime >= start - 1.0 && currentTime <= end + 1.0;
    });

    // Se não estiver cantando frase ativa no momento, tenta achar a próxima mais próxima
    if (activePhraseIndex === -1) {
      activePhraseIndex = phrases.findIndex(phrase => phrase[0].time > currentTime);
    }

    const currentWords = activePhraseIndex !== -1 ? phrases[activePhraseIndex] : [];
    const nextWords = activePhraseIndex !== -1 && phrases[activePhraseIndex + 1] ? phrases[activePhraseIndex + 1] : [];

    return (
      <div className="flex flex-col items-center justify-center py-4">
        {/* Linha Ativa */}
        <div className="lyric-line active min-h-[40px]">
          {currentWords.map((word, idx) => {
            const isSung = currentTime >= word.time;
            return (
              <span
                key={idx}
                className={`lyric-word ${isSung ? 'sung' : ''}`}
              >
                {word.text}
              </span>
            );
          })}
        </div>
        
        {/* Linha de Preparação (Subsequente) */}
        <div className="lyric-line text-sm opacity-40 mt-1 min-h-[30px] font-medium scale-90">
          {nextWords.map((word) => word.text).join('')}
        </div>
      </div>
    );
  };

  // --- Lógica de Posicionamento da Barra de Notas (Estilo Guitar Hero) ---
  // Posicionamento vertical das notas na escala MIDI
  // Mapeamos notas MIDI de 50 (agudo/baixo) a 80 (grave/alto)
  const getNoteYPosition = (midiNote) => {
    const minMidi = 48; // A3
    const maxMidi = 78; // F#5
    const range = maxMidi - minMidi;
    const clamped = Math.max(minMidi, Math.min(maxMidi, midiNote));
    
    // Inverte a porcentagem pois o topo no CSS é de 0 a 100% (maior MIDI fica mais acima)
    return 100 - ((clamped - minMidi) / range) * 100;
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto py-4 relative">
      
      {/* Barra de Controle de Informações Superiores */}
      <div className="glass-panel p-4 mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { stopAudioCapture(); onNavigateHome(); }}
            className="btn btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
            style={{ minHeight: 'auto' }}
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
          <div>
            <h3 className="font-bold font-title text-sm truncate max-w-[200px] md:max-w-xs">{song.title}</h3>
            <p className="text-[11px] text-color-text-muted leading-none">{song.artist}</p>
          </div>
        </div>

        {/* Pontuação Neon */}
        <div className="text-right">
          <span className="text-[10px] text-color-text-muted font-bold block uppercase tracking-wider">Pontos Neon</span>
          <span className="text-2xl font-black font-title text-gradient-purple title-glow">{score}</span>
        </div>
      </div>

      {/* Box Principal de Canto (Vídeo + Barra de Pitch) */}
      <div className="grid grid-cols-1 gap-4 mb-4 flex-1">
        
        {/* YouTube Container */}
        <div className="glass-panel p-1 aspect-video relative overflow-hidden rounded-2xl bg-black max-h-[350px] mx-auto w-full">
          <div id="youtube-player" className="w-full h-full rounded-xl pointer-events-none" />
          
          {/* Cover Overlay quando pausado */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/75 backdrop-filter backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <span className="text-xs font-bold text-secondary font-title uppercase tracking-widest mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Preparar para Soltar a Voz
              </span>
              <h2 className="text-3xl font-extrabold font-title mb-6">{song.title}</h2>
              <button
                onClick={togglePlay}
                className="btn btn-primary rounded-full w-20 h-20 p-0 flex items-center justify-center text-white scale-100 hover:scale-105"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
              <p className="text-xs text-color-text-muted mt-6">
                Lembre de cantar perto do dispositivo e plugar o som na caixa de som externa!
              </p>
            </div>
          )}
        </div>

        {/* Barra Visualizadora de Pitch (Guitar Hero Style) se houver notas mapeadas */}
        {hasTargetNotes && isPlaying && (
          <div className="relative">
            <div id="pitch-track" className="pitch-track-container">
              {/* Linhas de Grade de Tom de Fundo */}
              {[20, 40, 60, 80].map((top, idx) => (
                <div key={idx} className="pitch-grid-line" style={{ top: `${top}%` }} />
              ))}

              {/* Bloco Alvo (Target Note) da melodia da música no momento */}
              {activeNote && (
                <div
                  className="pitch-target-block"
                  style={{
                    top: `${getNoteYPosition(activeNote.pitch)}%`,
                    left: '25%',
                    width: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  {activeNote.text}
                </div>
              )}

              {/* Agulha de notas cantadas do Usuário */}
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

              {/* Tag de Nota Cantada no Canto Esquerdo */}
              <div className="absolute left-4 bottom-2 bg-black/60 px-2 py-0.5 rounded border border-white/5 text-[10px] font-bold font-title flex items-center gap-1.5 text-color-text-muted">
                <Mic className="w-3 h-3 text-primary" /> Cantando: {voiceData.noteName}
              </div>

              {/* Feedback Flutuante de Notas no Topo */}
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

      {/* Bloco de Letras Sincronizadas */}
      {isPlaying && (
        <div className="glass-panel px-6 py-4 mb-4 bg-black/45">
          {getLyricsMarkup()}
        </div>
      )}

      {/* Controles de Controle inferiores do Karaokê */}
      {isPlaying && (
        <div className="glass-panel p-4 flex items-center justify-between gap-4">
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
            {/* Botão de Painel de Ajuste Rápido de Calibração */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
              style={{ minHeight: 'auto' }}
            >
              <Settings className="w-4 h-4" /> Calibrar Microfone
            </button>
            
            <button
              onClick={handleFinish}
              className="btn btn-primary py-2 px-4 text-xs font-title font-bold"
              style={{ minHeight: 'auto' }}
            >
              Finalizar Performance
            </button>
          </div>
        </div>
      )}

      {/* Modal Popup de Calibração de Sensibilidade Rápida */}
      {showSettings && (
        <div className="absolute bottom-16 right-4 w-72 glass-panel p-4 z-50 bg-black/95">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold font-title text-white flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-primary" /> Sensibilidade do Mic
            </span>
            <button onClick={() => setShowSettings(false)} className="text-[10px] text-color-text-muted hover:text-white">Fechar</button>
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
          <div className="flex justify-between text-[9px] text-color-text-muted">
            <span>Sensível (Silêncio)</span>
            <span>Rígido (Caixa Barulhenta)</span>
          </div>
        </div>
      )}
    </div>
  );
}
