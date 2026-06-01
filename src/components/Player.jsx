import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, LogOut, Sparkles, Mic, Settings, Link2, AlertTriangle } from 'lucide-react';
import { initAudioStream } from '../utils/audio';
import { findTargetNoteAtTime, evaluatePitch, getFeedbackStyle } from '../utils/scoring';
import { demoSongsNotes } from '../songs-catalog';
import { extractYouTubeId, parseUltraStar } from '../utils/ultrastar';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Parser simples e performático de arquivos de letras sincronizadas (.lrc)
function parseLrcLyrics(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d+):(\d+)\.(\d+)\]/;
  
  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const totalTime = minutes * 60 + seconds + (milliseconds / 100);
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time: totalTime, text });
      }
    }
  });
  
  return result.sort((a, b) => a.time - b.time);
}

// Cria uma partitura de melodia fluida e jogável a partir das letras sincronizadas do LRC
function generateMelodyFromLrc(lrcLines, songId, title, artist) {
  if (!lrcLines || lrcLines.length === 0) return null;
  
  const notes = [];
  
  lrcLines.forEach((line, lineIdx) => {
    const startTime = line.time;
    const nextLine = lrcLines[lineIdx + 1];
    const endTime = nextLine ? nextLine.time : startTime + 5.0;
    const duration = Math.min(endTime - startTime, 6.0);
    
    // Filtra e limpa as palavras da frase
    const words = line.text.split(' ').filter(w => w.trim());
    if (words.length === 0) return;
    
    const timePerWord = duration / words.length;
    
    words.forEach((word, wordIdx) => {
      const wordStartTime = startTime + (wordIdx * timePerWord);
      const wordDuration = Math.max(timePerWord * 0.85, 0.25); // Silêncio de respiração curto
      
      // Ondulação harmônica senoidal no pitch (C4 +/- 4 semitons) para uma sensação de melodia real e agradável
      const basePitch = 60; // Nota Dó central (C4)
      const wave = Math.sin((lineIdx * 2.2) + (wordIdx * 0.75));
      const pitchOffset = Math.round(wave * 4);
      const pitch = basePitch + pitchOffset;
      
      notes.push({
        time: parseFloat(wordStartTime.toFixed(3)),
        duration: parseFloat(wordDuration.toFixed(3)),
        pitch: pitch,
        text: (wordIdx === 0 ? "" : " ") + word,
        type: "normal"
      });
    });
  });
  
  return {
    songId,
    title,
    artist,
    bpm: 120,
    gap: 0,
    notes: notes.sort((a, b) => a.time - b.time),
    isGeneratedFallback: true,
    updatedAt: new Date().toISOString()
  };
}




export default function Player({ song, threshold, setThreshold, selectedAudioDevice, setSelectedAudioDevice, onFinishSong, onNavigateHome }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [activeNote, setActiveNote] = useState(null);
  
  // ID ativo do YouTube e controle do link alternativo
  const [activeYoutubeId, setActiveYoutubeId] = useState(song.youtubeId);
  const [tempYoutubeLink, setTempYoutubeLink] = useState('');
  const [youtubeError, setYoutubeError] = useState('');

  // Controle opcional de letras sincronizadas LRCLIB
  const showLyrics = false; // Forçado como false conforme solicitado
  const [lrcLines, setLrcLines] = useState([]);
  const [activeLrcLine, setActiveLrcLine] = useState(null);
  const [nextLrcLine, setNextLrcLine] = useState(null);

  // Busca e sincroniza legendas da API pública do LRCLIB no carregamento da música
  useEffect(() => {
    let isMounted = true;
    const fetchLrcLyrics = async () => {
      try {
        const url = `https://lrclib.net/api/search?q=artist:"${encodeURIComponent(song.artist)}" track:"${encodeURIComponent(song.title)}"`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        
        const data = await res.json();
        // Filtra para achar o primeiro hit que possui letras sincronizadas
        const hitWithLyrics = data.find(item => item.syncedLyrics);
        if (hitWithLyrics && isMounted) {
          const parsed = parseLrcLyrics(hitWithLyrics.syncedLyrics);
          setLrcLines(parsed);
          console.log(`📡 Letras sincronizadas da LRCLIB carregadas para ${song.title} (${parsed.length} linhas)`);
        } else if (isMounted) {
          // Fallback para letra comum não sincronizada (simula tempos estáticos)
          const hitWithPlain = data.find(item => item.plainLyrics);
          if (hitWithPlain) {
            const lines = hitWithPlain.plainLyrics.split('\n').filter(l => l.trim());
            const staticLrc = lines.map((text, idx) => ({ time: idx * 8 + 10, text }));
            setLrcLines(staticLrc);
          }
        }
      } catch (err) {
        console.warn("Nenhuma legenda sincronizada disponível na LRCLIB.");
      }
    };
    fetchLrcLyrics();
    return () => { isMounted = false; };
  }, [song.artist, song.title]);


  // Busca se existe algum link customizado e ativo gravado no Firebase para esta música
  useEffect(() => {
    const fetchCustomYoutubeLink = async () => {
      try {
        const docRef = doc(db, 'song_links', song.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().youtubeId) {
          console.log(`📡 Carregado link alternativo persistente do Firebase para a música ${song.title}: ${docSnap.data().youtubeId}`);
          setActiveYoutubeId(docSnap.data().youtubeId);
        } else {
          setActiveYoutubeId(song.youtubeId);
        }
      } catch (err) {
        console.warn("Erro ao buscar link customizado no Firebase: ", err);
      }
    };
    fetchCustomYoutubeLink();
  }, [song.id]);

  // Grava e persiste o novo link correto do YouTube no Firebase Firestore
  const handleUpdateVideoId = async (linkToParse) => {
    const id = extractYouTubeId(linkToParse);
    if (!id) {
      setYoutubeError('Link do YouTube inválido!');
      alert('Link do YouTube inválido! Por favor, insira uma URL ou ID de vídeo correto.');
      return;
    }

    setActiveYoutubeId(id);
    setTempYoutubeLink('');
    setYoutubeError('');

    try {
      const docRef = doc(db, 'song_links', song.id);
      await setDoc(docRef, {
        songId: song.id,
        youtubeId: id,
        songTitle: song.title,
        songArtist: song.artist,
        updatedAt: new Date().toISOString()
      });
      console.log(`💾 Sucesso! Link correto persistido no Firebase para a música ${song.title}`);
      alert(`O playback de "${song.title}" foi atualizado e salvo com sucesso na plataforma!`);
    } catch (err) {
      console.error("Falha ao gravar link correto no Firebase: ", err);
      alert("Não foi possível salvar o link no banco de dados. Por favor, tente novamente.");
    }
  };



  
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

  // Notas musicais customizadas carregadas do Firebase (colaborativas)
  const [customSongNotes, setCustomSongNotes] = useState(null);

  // Notas musicais da música ativa (seja da demo, customizada do Firebase ou USDB)
  const songData = customSongNotes || (song.hasDemo ? demoSongsNotes[song.id] : song);
  const hasTargetNotes = songData && songData.notes && songData.notes.length > 0;

  // Busca se existe mapeamento de notas musicais (USDB/UltraStar) no Firebase ou em bases públicas de UltraStar
  useEffect(() => {
    let isMounted = true;
    const fetchUltraStarNotes = async () => {
      try {
        // 1. Tenta buscar no Firebase Firestore (cache colaborativo rápido)
        const docRef = doc(db, 'usdb_notes', song.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().notes) {
          console.log(`📡 Notas UltraStar carregadas do Firebase para a música ${song.title} (${docSnap.data().notes.length} notas)`);
          if (isMounted) setCustomSongNotes(docSnap.data());
          return;
        }

        // Se for demo original, usa o catálogo estático interno e não faz requisição
        if (song.hasDemo) return;

        // 2. Auto-Busca em bases de notas UltraStar abertas da comunidade no GitHub (ex: repositórios de melodias de UltraStar)
        console.log(`🔍 Buscando partitura UltraStar (.txt) na comunidade de forma automatizada para: ${song.title}...`);
        const querySearch = `${song.artist} - ${song.title}`;
        
        // Buscamos em repositórios conhecidos de arquivos de texto de UltraStar estruturados no GitHub
        const githubSearchUrl = `https://api.github.com/search/code?q=filename:.txt+extension:txt+path:songs+path:Músicas+"${encodeURIComponent(song.title)}"`;
        const ghRes = await fetch(githubSearchUrl);
        
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData.items && ghData.items.length > 0) {
            // Baixa o conteúdo do arquivo bruto (.txt)
            const rawUrl = ghData.items[0].html_url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            const fileRes = await fetch(rawUrl);
            if (fileRes.ok) {
              const txt = await fileRes.text();
              const parsed = parseUltraStar(txt);
              
              if (parsed && parsed.notes && parsed.notes.length > 0) {
                console.log(`🎉 Melodia UltraStar encontrada e convertida! Salva colaborativamente no Firebase para ${song.title}.`);
                const saveData = {
                  songId: song.id,
                  title: song.title,
                  artist: song.artist,
                  bpm: parsed.bpm,
                  gap: parsed.gap,
                  notes: parsed.notes,
                  updatedAt: new Date().toISOString()
                };

                // Grava de forma aberta no Firebase Firestore para todos os usuários do site usufruírem
                await setDoc(docRef, saveData);
                if (isMounted) setCustomSongNotes(saveData);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Nenhum mapeamento de notas UltraStar disponível na comunidade para essa música.");
      }
    };
    fetchUltraStarNotes();
    return () => { isMounted = false; };
  }, [song.id, song.artist, song.title, song.hasDemo]);

  // Backup inteligente: Se a música cadastrada não possui notas e a busca no GitHub/Firebase falhou,
  // mas as letras sincronizadas LRCLIB foram obtidas, geramos notas e partitura fluida de fallback na hora!
  useEffect(() => {
    let isMounted = true;
    if (!song.hasDemo && !customSongNotes && lrcLines.length > 0) {
      console.log(`✨ Inicializando fallback inteligente de melodia harmônica a partir do LRC para: ${song.title}`);
      const generated = generateMelodyFromLrc(lrcLines, song.id, song.title, song.artist);
      if (generated && isMounted) {
        setCustomSongNotes(generated);
        // Persiste colaborativamente no Firebase para todos os usuários usufruírem
        const docRef = doc(db, 'usdb_notes', song.id);
        setDoc(docRef, generated)
          .then(() => console.log(`💾 Melodia fallback gerada do LRC e gravada com sucesso no Firebase para ${song.title}`))
          .catch(err => console.warn("Erro ao persistir fallback no Firebase: ", err));
      }
    }
    return () => { isMounted = false; };
  }, [song.id, song.hasDemo, customSongNotes, lrcLines, song.title, song.artist]);


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
          },
          onError: (event) => {
            console.warn(`⚠️ Erro detectado no player do YouTube (Código: ${event.data}).`);
            setYoutubeError('error');
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
  }, [song]);

  // Sincroniza dinamicamente o link/ID do YouTube sem reconstruir o player do zero (ultra-estável!)
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.cueVideoById === 'function') {
      try {
        console.log(`📡 Sincronizando playback no player ativo: ${activeYoutubeId}`);
        ytPlayerRef.current.cueVideoById(activeYoutubeId);
      } catch (e) {
        console.warn("Falha ao usar cueVideoById no player ativo, recriando o player.");
      }
    }
  }, [activeYoutubeId]);



  // Loop de atualização de tempo sincronizado do YouTube e atualização de Pitch/Lyrics
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

          // Sincronização de Letras da LRCLIB em Tempo Real
          if (lrcLines.length > 0) {
            const currentIndex = lrcLines.findIndex((line, idx) => {
              const nextLine = lrcLines[idx + 1];
              return time >= line.time && (!nextLine || time < nextLine.time);
            });
            
            if (currentIndex !== -1) {
              setActiveLrcLine(lrcLines[currentIndex]);
              setNextLrcLine(lrcLines[currentIndex + 1] || null);
            } else if (lrcLines[0] && time < lrcLines[0].time) {
              setActiveLrcLine({ text: "🎵 Prepara..." });
              setNextLrcLine(lrcLines[0]);
            }
          }
        }
      }, 50);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, hasTargetNotes, songData, lrcLines]);


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
      
      <div className="glass-panel p-4 mb-4 flex-row-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-bold font-title text-base truncate max-w-[180px] md:max-w-md text-white">{song.title}</h3>
            <p className="text-xs text-color-text-muted leading-none mt-0.5">{song.artist}</p>
            <button
              onClick={() => {
                setTempYoutubeLink('');
                setYoutubeError('setup');
              }}
              className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 mt-1.5 underline decoration-dotted transition-colors"
              style={{ minHeight: 'auto', background: 'none', border: 'none', padding: 0 }}
            >
              <Link2 className="w-3 h-3" /> Vídeo Quebrado? Trocar Link
            </button>
          </div>
        </div>

        {/* Pontuação Neon */}
        <div className="text-right">
          <span className="text-[10px] text-color-text-muted font-bold block uppercase tracking-wider">Pontos Neon</span>
          <span className="text-3xl font-black font-title text-gradient title-glow leading-none">{score}</span>
        </div>
      </div>

      {/* Grid de Vídeo e Barra de Pitch - Premium Lado a Lado no PC */}
      <div className="player-workspace-grid flex-1 mb-6">
        
        {/* YouTube Container */}
        <div className="glass-panel p-1 aspect-video relative overflow-hidden rounded-2xl bg-black w-full h-full min-h-[240px]">
          <div id="youtube-player" className="w-full h-full rounded-xl pointer-events-none" />
          


          {/* Overlay Glassmorphic de Recuperação/Substituição de Link do YouTube */}
          {youtubeError && (
            <div className="player-overlay">
              <div className="player-overlay-card">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3 animate-pulse" />
                <h3 className="text-base font-bold font-title text-white mb-1">Vídeo Indisponível?</h3>
                <p className="text-[11px] text-color-text-muted mb-4 leading-relaxed">
                  {youtubeError === 'setup'
                    ? "Atualize o link do playback do YouTube antes de iniciar sua performance vocal."
                    : "Este playback do YouTube está bloqueado por direitos autorais, restrição de domínio ou foi removido."}
                  <br />
                  Insira uma URL ou ID alternativo do YouTube para corrigir:
                </p>
                
                <div className="flex flex-col gap-2.5 w-full">
                  <input
                    type="text"
                    placeholder="Cole o link correto do YouTube aqui..."
                    value={tempYoutubeLink}
                    onChange={(e) => setTempYoutubeLink(e.target.value)}
                    className="select-field text-xs py-2.5 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-center placeholder-white/20 focus:border-purple-500 transition-all outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setYoutubeError('');
                        setTempYoutubeLink('');
                      }}
                      className="btn btn-secondary flex-1 py-1.5 text-xs rounded-xl"
                      style={{ minHeight: 'auto' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!tempYoutubeLink.trim()) {
                          alert("Por favor, digite ou cole um link válido do YouTube.");
                          return;
                        }
                        const id = extractYouTubeId(tempYoutubeLink);
                        if (id) {
                          await handleUpdateVideoId(tempYoutubeLink);
                        } else {
                          alert("Link do YouTube inválido.");
                        }
                      }}
                      className="btn btn-primary flex-1 py-1.5 text-xs rounded-xl text-white font-semibold"
                      style={{ minHeight: 'auto' }}
                    >
                      Salvar e Atualizar
                    </button>
                  </div>
                </div>
                
                <p className="text-[9px] text-color-text-muted mt-3">
                  O link correto será salvo permanentemente para esta música na plataforma.
                </p>
              </div>
            </div>
          )}

          {/* Overlay de Canto Inicial */}
          {!isPlaying && (
            <div className="player-overlay">
              <span className="hero-tag mb-3">
                <Mic className="w-4 h-4 text-primary animate-pulse" /> Estúdio de Performance Vocal
              </span>
              <h2 className="text-3xl font-extrabold font-title mb-6 text-white">{song.title}</h2>
              <button
                onClick={togglePlay}
                className="btn btn-primary rounded-full w-20 h-20 p-0 flex items-center justify-center text-white scale-100 hover:scale-105 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.6)]"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>

              {/* Botão de Sair no Overlay de Preparação para o cantor poder voltar se quiser */}
              <button
                onClick={() => { stopAudioCapture(); onNavigateHome(); }}
                className="btn btn-secondary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 mb-3"
                style={{ minHeight: 'auto' }}
              >
                <LogOut className="w-3.5 h-3.5" /> Cancelar e Voltar ao Catálogo
              </button>

              {/* Botão de alteração de vídeo preventiva */}
              <button
                onClick={() => {
                  setTempYoutubeLink('');
                  setYoutubeError('setup');
                }}
                className="text-xs text-color-text-muted hover:text-white transition flex items-center gap-1.5 mb-6 underline decoration-dotted opacity-80 hover:opacity-100"
                style={{ minHeight: 'auto' }}
              >
                <Link2 className="w-3.5 h-3.5 text-primary" /> Vídeo indisponível? Alterar Link
              </button>

              <p className="text-[11px] text-color-text-muted max-w-xs leading-normal">
                Calibre o ganho do seu microfone e posicione o dispositivo de captação de áudio adequadamente antes de iniciar.
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
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="btn btn-secondary rounded-full w-10 h-10 p-0 flex items-center justify-center animate-fade-in"
            >
              <Pause className="w-5 h-5" />
            </button>



            <span className="text-xs text-color-text-muted font-bold font-title hidden md:inline">
              Tempo: {Math.floor(currentTime / 60)}:{(currentTime % 60 < 10 ? '0' : '')}{Math.floor(currentTime % 60)}
            </span>
          </div>


          <div className="flex items-center gap-2">
            <button
              onClick={() => { stopAudioCapture(); onNavigateHome(); }}
              className="btn btn-secondary flex items-center gap-1.5"
              style={{ padding: '8px 16px', borderRadius: '10px' }}
            >
              <LogOut className="w-4 h-4 text-red-400" /> Sair
            </button>

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
                onClick={async () => {
                  const id = extractYouTubeId(tempYoutubeLink);
                  if (id) {
                    await handleUpdateVideoId(tempYoutubeLink);
                    alert("Vídeo atualizado e gravado no Firebase!");
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
