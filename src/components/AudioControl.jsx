import React, { useState, useEffect } from 'react';
import { Sliders, Mic, Volume2, Info } from 'lucide-react';
import { initAudioStream } from '../utils/audio';

export default function AudioControl({ threshold, setThreshold, selectedAudioDevice, setSelectedAudioDevice }) {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [audioStream, setAudioStream] = useState(null);
  const [devicesList, setDevicesList] = useState([]);

  // Busca lista de dispositivos de entrada de áudio (microfones)
  const loadAudioDevices = async () => {
    try {
      // Pede permissão temporária se necessário para poder listar os nomes reais dos microfones
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      setDevicesList(audioInputs);
      
      // Define o primeiro dispositivo encontrado como ativo, se nenhum estiver selecionado
      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.warn("Permissão de microfone negada ao listar dispositivos: ", err);
    }
  };

  useEffect(() => {
    loadAudioDevices();
    
    // Escuta quando novos dispositivos são conectados (ex: plugar microfone USB ou Bluetooth)
    navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
    };
  }, []);

  // Monitora e atualiza o stream de áudio ativo para o teste de calibração
  useEffect(() => {
    let streamInstance = null;

    if (isCalibrating) {
      const startMonitor = async () => {
        if (audioStream) {
          audioStream.stop();
        }

        try {
          streamInstance = await initAudioStream(
            (data) => {
              // Atualiza o nível de volume instantâneo
              setVolumeLevel(Math.min(data.rms * 180, 100));
            },
            () => threshold,
            selectedAudioDevice // Passa o ID do microfone selecionado!
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
  }, [isCalibrating, selectedAudioDevice]);

  return (
    <div className="glass-panel p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Sliders className="text-secondary w-6 h-6" />
        <h3 className="text-xl font-bold font-title text-white">Calibração de Áudio & Sensibilidade</h3>
      </div>

      <p className="text-sm text-color-text-muted mb-4">
        Configure se deseja usar o <strong>microfone integrado do celular</strong> ou os <strong>microfones da sua caixa de som Bluetooth/auxiliar</strong>. Ajuste o limiar para filtrar o instrumental e captar apenas a sua voz.
      </p>

      {/* Seletor de Microfone */}
      <div className="device-select-container mb-6">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" /> Selecione o Microfone Ativo
        </label>
        <select
          value={selectedAudioDevice}
          onChange={(e) => setSelectedAudioDevice(e.target.value)}
          className="select-field"
        >
          {devicesList.length === 0 ? (
            <option value="">Permita o microfone para listar dispositivos...</option>
          ) : (
            devicesList.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microfone Externo ${idx + 1}`}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="calibration-grid">
        {/* Controle Deslizante */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-white">Limiar de Captação (Threshold)</span>
            <span className="text-sm font-bold text-primary font-title">{(threshold * 1000).toFixed(0)} mV</span>
          </div>
          <input
            type="range"
            min="0.005"
            max="0.1"
            step="0.002"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-600"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${((threshold - 0.005) / (0.1 - 0.005)) * 100}%, rgba(255,255,255,0.1) 0%)`
            }}
          />
          <div className="flex justify-between text-xs text-color-text-muted mt-1">
            <span>Sensível (Cantar Baixo)</span>
            <span>Rígido (Caixa no Alto)</span>
          </div>
        </div>

        {/* Nível do Microfone */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
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
              className="h-full transition-all duration-75"
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
            />
          </div>
          <span className="text-xs text-color-text-muted mt-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-secondary animate-pulse" />
            {volumeLevel > threshold * 180 
              ? "Voz detectada com sucesso!" 
              : isCalibrating 
                ? "Sinal muito baixo. Cante mais perto ou reduza o limiar." 
                : "Clique em Testar Nível para calibrar a barra vermelha."
            }
          </span>
        </div>
      </div>
    </div>
  );
}
