import React, { useState, useEffect, useRef } from 'react';
import { Mic, Settings, Volume2, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

export default function AudioCenter({ threshold, setThreshold, selectedAudioDevice, setSelectedAudioDevice }) {
  const [devicesList, setDevicesList] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [rmsValue, setRmsValue] = useState(0);
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Carrega a lista de captadores de áudio disponíveis
  const loadDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      setDevicesList(audioInputs);
    } catch (err) {
      console.warn("Falha ao enumerar dispositivos na Central: ", err);
    }
  };

  useEffect(() => {
    loadDevices();
    
    // Inicia a escuta automática para calibrar a captação
    startVisualizer();

    return () => {
      stopVisualizer();
    };
  }, [selectedAudioDevice]);

  // Inicializa o analisador Web Audio API para o osciloscópio visual
  const startVisualizer = async () => {
    stopVisualizer();
    
    try {
      const constraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      source.connect(analyser);
      setIsListening(true);
      
      // Loop de desenho no Canvas (Osciloscópio)
      drawOscilloscope();
    } catch (err) {
      console.warn("Permissão de áudio negada ou dispositivo indisponível para pré-visualização.", err);
      setIsListening(false);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    setIsListening(false);
  };

  // Renderiza as ondas de captação no Canvas em tempo real (Efeito Neon)
  const drawOscilloscope = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyser.getByteTimeDomainData(dataArray);
      
      // Limpa e estiliza o fundo do canvas
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grade técnica sutil
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      // Linha central
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      // Desenha a onda neon
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#a855f7'; // Roxo Neon de base
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(168, 85, 247, 0.7)';
      
      ctx.beginPath();
      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;
      
      let totalRms = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        // Calcula RMS para medidor de decibéis
        const diff = v - 1.0;
        totalRms += diff * diff;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      // Reseta sombra
      ctx.shadowBlur = 0;
      
      // Atualiza valor RMS aproximado no estado
      const rms = Math.sqrt(totalRms / bufferLength);
      setRmsValue(rms);
    };
    
    draw();
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto py-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h2 className="text-3xl font-black font-title text-white flex items-center gap-3">
          <Mic className="text-primary w-8 h-8 animate-pulse" /> Central de Engenharia Acústica
        </h2>
        <p className="text-color-text-muted text-sm mt-1">
          Gerencie os captadores físicos de som, calibre os limiares de sensibilidade do microfone e otimize seu ambiente para performances profissionais de alta fidelidade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1: Osciloscópio e Calibração de Áudio */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col">
            <h3 className="text-lg font-bold font-title text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Calibração Física do Captador
            </h3>

            {/* Canvas do Osciloscópio */}
            <div className="relative rounded-xl overflow-hidden bg-[#0a0b10] border border-white/5 aspect-[21/9] mb-4">
              <canvas ref={canvasRef} className="w-full h-full block" width="500" height="200" />
              {!isListening && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                  <ShieldAlert className="w-8 h-8 text-yellow-500 mb-2 animate-bounce" />
                  <p className="text-xs font-semibold text-white">Aguardando Captador de Áudio...</p>
                  <p className="text-[10px] text-color-text-muted mt-1 max-w-[240px]">Certifique-se de autorizar as permissões de acesso ao microfone no navegador.</p>
                </div>
              )}
              {isListening && (
                <div className="absolute top-3 right-3 bg-black/60 border border-purple-500/25 px-2 py-0.5 rounded text-[9px] font-bold text-secondary uppercase tracking-widest animate-pulse">
                  Osciloscópio Ativo
                </div>
              )}
            </div>

            {/* Seleção do Dispositivo */}
            <div className="flex flex-col gap-2 mb-5">
              <label className="text-xs font-bold text-color-text-muted uppercase tracking-wider">Captador Ativo (Microfone)</label>
              <select
                value={selectedAudioDevice}
                onChange={(e) => setSelectedAudioDevice(e.target.value)}
                className="select-field text-sm"
              >
                {devicesList.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Entrada de Áudio Externa ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Slider de Sensibilidade (Threshold) */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-color-text-muted uppercase tracking-wider">Limiar de Corte (Threshold)</span>
                <span className="text-primary font-title">{(threshold * 1000).toFixed(0)} mV</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.08"
                step="0.002"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-600 mb-1"
              />
              <div className="flex justify-between text-[10px] text-color-text-muted">
                <span>Alta Sensibilidade (Silêncio Absoluto / Fone)</span>
                <span>Baixa Sensibilidade (Caixa de Som Externa no Alto)</span>
              </div>
            </div>

            {/* Medidor Rápido */}
            <div className="mt-5 pt-4 border-t border-white/5">
              <div className="flex justify-between text-[10px] text-color-text-muted font-bold uppercase tracking-wider mb-2">
                <span>Nível de Sinal Captado</span>
                <span>{isListening ? `${(rmsValue * 1000).toFixed(0)} mV` : "Desconectado"}</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 to-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.min(rmsValue * 4000, 100)}%` }}
                />
                {/* Marcador de Linha de Threshold */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]"
                  style={{ left: `${Math.min(threshold * 1500, 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-color-text-muted mt-2">
                A barra colorida (sinal da sua voz) deve ultrapassar a agulha vermelha (limiar de corte) somente quando você estiver cantando, ignorando ruídos do ambiente.
              </p>
            </div>

          </div>
        </div>

        {/* Coluna 2: Manual de Engenharia Acústica e Recomendações */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col h-full bg-black/25">
            <h3 className="text-lg font-bold font-title text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <Volume2 className="w-5 h-5 text-secondary" /> Guia Acústico
            </h3>

            <div className="flex flex-col gap-5 text-xs text-color-text-muted">
              {/* Bluetooth Dica */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Caixas de Som Bluetooth</h4>
                  <p className="leading-relaxed">Dispositivos Bluetooth possuem latência nativa de transmissão. Para cantar no tempo ideal, utilize uma entrada de linha física P2/P10 da sua caixa ou cante com o foco voltado no ritmo.</p>
                </div>
              </div>

              {/* Feedback Dica */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Microfonia e Feedback</h4>
                  <p className="leading-relaxed">Evite posicionar o seu microfone de captação de voz diretamente na frente dos alto-falantes de saída de som. Isso evita picos de microfonia e vazamentos acústicos indesejados.</p>
                </div>
              </div>

              {/* Noise Dica */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Ambientes Ruidosos</h4>
                  <p className="leading-relaxed">Se o local estiver com muito barulho (conversas, música de fundo alta), arraste o limiar de corte para a direita, aumentando os mV necessários para ativar a pontuação por pitch.</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 flex items-center gap-2 text-xs text-primary font-bold">
              <HelpCircle className="w-4 h-4" /> Tem alguma dúvida técnica?
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
