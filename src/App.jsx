import React, { useState, useEffect } from 'react';
import { Mic2, Music, Mic, Upload, Trophy } from 'lucide-react';
import Home from './components/Home';
import Player from './components/Player';
import Import from './components/Import';
import Results from './components/Results';
import AudioCenter from './components/AudioCenter';
import GlobalLeaderboard from './components/GlobalLeaderboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('catalog');
  const [selectedSong, setSelectedSong] = useState(null);
  const [scoreData, setScoreData] = useState({ score: 0, scorePercent: 0 });
  
  // Limiar global de sensibilidade do microfone (Threshold)
  const [threshold, setThreshold] = useState(0.015);

  // Dispositivo de entrada de áudio selecionado (microfone)
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  // Registra o Service Worker do PWA nativamente para cache local
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

  // Navegações e Fluxos de Canto
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
    setActiveTab('catalog'); // Ao voltar do player, foca no catálogo
  };

  // Verifica se o estúdio de canto (Player) está ativo para ocultar menus e focar 100% na música
  const isPerformanceMode = currentScreen === 'player' || currentScreen === 'results';

  return (
    <div className="app-container">
      
      {/* Header Global Otimizado */}
      <header className="app-header">
        <div className="header-content">
          <div 
            onClick={handleNavigateHome} 
            className="brand-container cursor-pointer"
          >
            <div className="logo-badge">
              <Mic2 className="w-5 h-5" />
            </div>
            <div>
              <span className="brand-name">SINFONIA</span>
              <span className="brand-subtitle block">KARAOKE ONLINE</span>
            </div>
          </div>
          
          {/* Navegação por Abas Premium no Desktop (oculta em modo performance/canto) */}
          {!isPerformanceMode && currentScreen === 'home' && (
            <nav className="desktop-tabs-nav hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`tab-link-btn ${activeTab === 'catalog' ? 'active' : ''}`}
              >
                <Music className="w-4 h-4" /> Catálogo
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`tab-link-btn ${activeTab === 'audio' ? 'active' : ''}`}
              >
                <Mic className="w-4 h-4" /> Central de Som
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`tab-link-btn ${activeTab === 'import' ? 'active' : ''}`}
              >
                <Upload className="w-4 h-4" /> Importar
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`tab-link-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              >
                <Trophy className="w-4 h-4" /> Ranking Geral
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Main View Container */}
      <main className="screen-container">
        {currentScreen === 'home' && (
          <div className="w-full flex-1 flex flex-col">
            {activeTab === 'catalog' && (
              <Home
                onSelectSong={handleSelectSong}
                onNavigateToImport={() => setActiveTab('import')}
              />
            )}
            
            {activeTab === 'audio' && (
              <AudioCenter
                threshold={threshold}
                setThreshold={setThreshold}
                selectedAudioDevice={selectedAudioDevice}
                setSelectedAudioDevice={setSelectedAudioDevice}
              />
            )}
            
            {activeTab === 'import' && (
              <Import onNavigateHome={handleNavigateHome} />
            )}
            
            {activeTab === 'leaderboard' && (
              <GlobalLeaderboard />
            )}
          </div>
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

      {/* Navegação de Rodapé responsiva em Mobile (oculta em modo performance/canto) */}
      {!isPerformanceMode && currentScreen === 'home' && (
        <nav className="mobile-tabs-nav md:hidden flex justify-around items-center border-t border-white/5 py-2 px-4 fixed bottom-0 left-0 right-0 z-50 glass-panel bg-black/95">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`mobile-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          >
            <Music className="w-5 h-5 mx-auto" />
            <span className="block text-[9px] mt-0.5 font-bold">Catálogo</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`mobile-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
          >
            <Mic className="w-5 h-5 mx-auto" />
            <span className="block text-[9px] mt-0.5 font-bold">Som</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`mobile-tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          >
            <Upload className="w-5 h-5 mx-auto" />
            <span className="block text-[9px] mt-0.5 font-bold">Importar</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`mobile-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          >
            <Trophy className="w-5 h-5 mx-auto" />
            <span className="block text-[9px] mt-0.5 font-bold">Ranking</span>
          </button>
        </nav>
      )}

      {/* Rodapé Global Otimizado */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-color-text-muted bg-black/20 mb-14 md:mb-0">
        <div className="max-w-6xl mx-auto px-6">
          Sinfonia Karaoke &copy; {new Date().getFullYear()} - Plataforma de Alta Fidelidade para Performance e Análise Acústica Profissional.
        </div>
      </footer>
    </div>
  );
}
