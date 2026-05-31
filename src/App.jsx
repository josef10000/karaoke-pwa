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
    <div className="flex-1 flex flex-col min-h-screen">
      
      {/* Header Global */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            onClick={handleNavigateHome} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-all">
              <Mic2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black font-title text-base tracking-tight text-white block">
                SINFONIA
              </span>
              <span className="text-[9px] font-bold text-color-text-muted tracking-widest leading-none block">
                KARAOKE ONLINE
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-secondary font-bold font-title">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span>PWA Instalável</span>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 flex flex-col px-4 md:px-6 py-4">
        {currentScreen === 'home' && (
          <>
            <Home
              onSelectSong={handleSelectSong}
              onNavigateToImport={() => setCurrentScreen('import')}
            />
            {/* Painel de Calibração visível de forma conveniente no rodapé da Home */}
            <div className="max-w-6xl w-full mx-auto mt-6">
              <AudioControl threshold={threshold} setThreshold={setThreshold} />
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
