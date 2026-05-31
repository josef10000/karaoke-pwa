import React, { useState, useEffect } from 'react';
import { Sparkles, Mic2 } from 'lucide-react';
import Home from './components/Home';
import Player from './components/Player';
import Import from './components/Import';
import Results from './components/Results';
import AudioControl from './components/AudioControl';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedSong, setSelectedSong] = useState(null);
  const [scoreData, setScoreData] = useState({ score: 0, scorePercent: 0 });
  
  // Limiar global de sensibilidade do microfone (Threshold)
  // 0.015 é um valor padrão excelente para ambientes normais
  const [threshold, setThreshold] = useState(0.015);

  // Dispositivo de entrada de áudio selecionado (microfone)
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  // Registra o Service Worker do PWA nativamente
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registrado com sucesso: ', registration.scope);
          })
          .catch((err) => {
            console.log('Falha ao registrar o Service Worker: ', err);
          });
      });
    }
  }, []);

  // Navegações rápidas
  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setCurrentScreen('player');
  };

  const handleFinishSong = (data) => {
    setScoreData(data);
    setCurrentScreen('results');
  };

  const handleRestartSong = () => {
    setScoreData({ score: 0, scorePercent: 0 });
    setCurrentScreen('player');
  };

  const handleNavigateHome = () => {
    setSelectedSong(null);
    setScoreData({ score: 0, scorePercent: 0 });
    setCurrentScreen('home');
  };

  return (
    <div className="app-container">
      
      {/* Header Global */}
      <header className="app-header">
        <div className="header-content">
          <div 
            onClick={handleNavigateHome} 
            className="brand-container"
          >
            <div className="logo-badge">
              <Mic2 className="w-5 h-5" />
            </div>
            <div>
              <span className="brand-name">SINFONIA</span>
              <span className="brand-subtitle block">KARAOKE ONLINE</span>
            </div>
          </div>
          
          <div className="pwa-badge">
            <Sparkles className="w-4 h-4" />
            <span>PWA Instalável</span>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="screen-container">
        {currentScreen === 'home' && (
          <>
            <Home
              onSelectSong={handleSelectSong}
              onNavigateToImport={() => setCurrentScreen('import')}
            />
            {/* Painel de Calibração visível de forma conveniente no rodapé da Home */}
            <div className="max-w-6xl w-full mx-auto mt-6">
              <AudioControl 
                threshold={threshold} 
                setThreshold={setThreshold} 
                selectedAudioDevice={selectedAudioDevice}
                setSelectedAudioDevice={setSelectedAudioDevice}
              />
            </div>
          </>
        )}

        {currentScreen === 'import' && (
          <Import onNavigateHome={handleNavigateHome} />
        )}

        {currentScreen === 'player' && selectedSong && (
          <Player
            song={selectedSong}
            threshold={threshold}
            setThreshold={setThreshold}
            selectedAudioDevice={selectedAudioDevice}
            setSelectedAudioDevice={setSelectedAudioDevice}
            onFinishSong={handleFinishSong}
            onNavigateHome={handleNavigateHome}
          />
        )}

        {currentScreen === 'results' && selectedSong && (
          <Results
            song={selectedSong}
            scoreData={scoreData}
            onRestartSong={handleRestartSong}
            onNavigateHome={handleNavigateHome}
          />
        )}
      </main>

      {/* Rodapé Global */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-color-text-muted bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          Sinfonia Karaoke &copy; {new Date().getFullYear()} - Feito com 💜 para performances espetaculares.
        </div>
      </footer>
    </div>
  );
}
