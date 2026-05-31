import React, { useState, useEffect } from 'react';
import { Search, Music, Sparkles, Upload, Play, Award } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { songsCatalog } from '../songs-catalog';

export default function Home({ onSelectSong, onNavigateToImport }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dbSongs, setDbSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Busca músicas personalizadas salvas no Firebase Firestore
  useEffect(() => {
    const fetchDbSongs = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'songs'));
        const songsList = [];
        querySnapshot.forEach((doc) => {
          songsList.push({ id: doc.id, ...doc.data(), isUserUploaded: true });
        });
        setDbSongs(songsList);
      } catch (err) {
        console.error("Falha ao buscar músicas do Firebase: ", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDbSongs();
  }, []);

  // Une o catálogo estático com o catálogo dinâmico do Firebase
  const allSongs = [...songsCatalog, ...dbSongs];

  // Aplica filtros e termos de busca
  const filteredSongs = allSongs.filter((song) => {
    const matchesSearch = 
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'nacionais' && song.category === 'Nacional') ||
      (activeFilter === 'internacionais' && song.category === 'Internacional') ||
      (activeFilter === 'ultrastar' && song.hasDemo) ||
      (activeFilter === 'my-songs' && song.isUserUploaded);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto py-6">
      
      {/* Banner Principal Estilo Cyber-Neon */}
      <div className="glass-panel p-8 mb-8 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
        {/* Luzes difusas internas do banner */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-900/10 via-pink-900/10 to-cyan-900/10 pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-2 z-10">
          <Sparkles className="text-secondary w-5 h-5 animate-pulse" />
          <span className="text-xs font-bold tracking-[0.2em] text-secondary font-title uppercase">PWA de Karaokê com Pontuação</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold font-title mb-3 tracking-tight z-10">
          <span className="text-gradient-purple title-glow">SINFONIA</span>{' '}
          <span className="text-gradient-cyan">KARAOKE</span>
        </h1>
        
        <p className="text-color-text-muted text-sm md:text-base max-w-xl z-10">
          Cante no computador ou celular conectado na sua caixa de som! Sistema de pontos em tempo real por pitch e suporte ao formato UltraStar Deluxe.
        </p>
      </div>

      {/* Barra de Ações Rápidas (Pesquisa e Importar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Input de Busca */}
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Pesquise por música ou artista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-12 pr-4 py-3.5"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-color-text-muted w-5 h-5" />
        </div>

        {/* Botão de Importar UltraStar */}
        <button
          onClick={onNavigateToImport}
          className="btn btn-primary w-full py-3.5 gap-2 flex items-center justify-center"
        >
          <Upload className="w-5 h-5" />
          Importar UltraStar (.txt)
        </button>
      </div>

      {/* Filtros de Categoria */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {[
          { id: 'all', label: 'Todas as Músicas' },
          { id: 'nacionais', label: '🇧🇷 Nacionais' },
          { id: 'internacionais', label: '🌎 Internacionais' },
          { id: 'ultrastar', label: '✨ Mapeadas (Notas de Pitch)' },
          { id: 'my-songs', label: '📂 Minhas Importadas' }
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`btn py-2.5 px-4 text-sm font-semibold ${
              activeFilter === filter.id ? 'btn-primary' : 'btn-secondary'
            }`}
            style={{ minHeight: 'auto', padding: '10px 18px' }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Seção do Catálogo de Músicas */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold font-title flex items-center gap-2">
          <Music className="text-primary w-6 h-6" /> Músicas do Catálogo ({filteredSongs.length})
        </h2>
        {isLoading && <span className="text-sm text-secondary animate-pulse">Sincronizando Firebase...</span>}
      </div>

      {filteredSongs.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-color-text-muted mb-4">Nenhuma música encontrada com os filtros selecionados.</p>
          <button
            onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
            className="btn btn-secondary btn-sm"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              className="glass-panel glass-panel-hover p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold font-title truncate text-white">{song.title}</h3>
                <p className="text-sm text-color-text-muted truncate">{song.artist}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-color-text-muted">
                    {song.category || 'Personalizada'}
                  </span>
                  {song.hasDemo && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-900/25 border border-purple-500/30 text-purple-400 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" /> Tom Mapeado
                    </span>
                  )}
                  {song.isUserUploaded && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-900/25 border border-cyan-500/30 text-cyan-400">
                      Firestore
                    </span>
                  )}
                </div>
              </div>

              {/* Botão de Ação */}
              <button
                onClick={() => onSelectSong(song)}
                className="btn btn-primary rounded-full w-12 h-12 p-0 flex items-center justify-center shrink-0"
                title="Cantar Agora"
              >
                <Play className="w-5 h-5 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
