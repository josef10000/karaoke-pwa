import React, { useState, useEffect } from 'react';
import { Sliders, Mic, Volume2, Info } from 'lucide-react';
import { initAudioStream } from '../utils/audio';

export default function AudioControl({ threshold, setThreshold }) {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [audioStream, setAudioStream] = useState(null);

  // Inicializa o microfone localmente apenas para teste de nível de volume no painel
  useEffect(() => {
    let streamInstance = null;

    if (isCalibrating) {
      const startMonitor = async () => {
        try {
          streamInstance = await initAudioStream(
            (data) => {
              // Atualiza o nível de volume instantâneo (multiplicamos para melhorar a visualização na barra)
              setVolumeLevel(Math.min(data.rms * 180, 100));
            },
            () => threshold // Retorna o threshold atual
          );
          setAudioStream(streamInstance);
        } catch (err) {
          console.error("Falha ao monitorar volume: ", err);
          setIsCalibrating(false);
        }
      };

      startMonitor();
    } else {
      if (audioStream) {
        audioStream.stop();
        setAudioStream(null);
      }
      setVolumeLevel(0);
    }

    return () => {
      if (streamInstance) streamInstance.stop();
    };
  }, [isCalibrating]);

  return (
    <div className="glass-panel p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Sliders className="text-secondary w-6 h-6" />
        <h3 className="text-xl font-bold font-title">Calibração de Áudio & Sensibilidade</h3>
      </div>

      <p className="text-sm text-color-text-muted mb-4">
        Ideal para filtrar o som instrumental que sai da sua caixa de som para que o sistema capture apenas a sua voz no microfone do dispositivo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controle Deslizante */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" /> Limiar de Captação (Threshold)
            </span>
            <span className="text-sm font-bold text-primary font-title">{(threshold * 1000).toFixed(0)} mV</span>
          </div>
          <input
            type="range"
            min="0.005"
            max="0.1"
            step="0.002"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-rgba-white rounded-lg appearance-none cursor-pointer accent-purple-600"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${((threshold - 0.005) / (0.1 - 0.005)) * 100}%, rgba(255,255,255,0.1) 0%)`
            }}
          />
          <div className="flex justify-between text-xs text-color-text-muted mt-1">
            <span>Sensível (Voz Baixa)</span>
            <span>Rígido (Voz Forte)</span>
          </div>
        </div>

        {/* Nível do Microfone */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-secondary" /> Volume do Captador
            </span>
            <button
              onClick={() => setIsCalibrating(!isCalibrating)}
              className={`btn py-1 px-3 text-xs ${isCalibrating ? 'btn-danger' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', minHeight: 'auto' }}
            >
              {isCalibrating ? 'Parar Teste' : 'Testar Nível'}
            </button>
          </div>

          {/* Barra de Progresso do Volume */}
          <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
            <div
              className={`h-full transition-all duration-75 ${
                volumeLevel > threshold * 180 ? 'bg-gradient-to-r from-cyan-400 to-green-400' : 'bg-purple-600/60'
              }`}
              style={{
                width: `${volumeLevel}%`,
                background: volumeLevel > threshold * 180 
                  ? 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-perfect) 100%)' 
                  : 'rgba(147, 51, 234, 0.4)',
                boxShadow: volumeLevel > threshold * 180 ? '0 0 10px var(--color-perfect)' : 'none'
              }}
            />
            {/* Linha indicadora do Limiar atual na barra */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500"
              style={{ left: `${Math.min(threshold * 180, 100)}%` }}
              title="Ponto de corte (Threshold)"
            />
          </div>
          <span className="text-xs text-color-text-muted mt-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-secondary" />
            {volumeLevel > threshold * 180 
              ? "Voz detectada! (Sinal acima do limiar)" 
              : isCalibrating 
                ? "Sinal abaixo do limiar (Fale mais alto ou reduza o limiar)" 
                : "Clique em Testar Nível para ajustar em silêncio."
            }
          </span>
        </div>
      </div>
    </div>
  );
}
