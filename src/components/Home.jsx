import React, { useState, useEffect } from 'react';
import { Search, Music, Sparkles, Upload, Play } from 'lucide-react';
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
    <div className="flex-1 flex flex-col w-full">
      
      {/* Banner Principal Estilo Cyber-Neon */}
      <div className="glass-panel hero-banner">
        <div className="hero-tag">
          <Sparkles className="w-4 h-4" />
          <span>PWA de Karaokê com Pontuação</span>
        </div>
        
        <h1 className="hero-title">
          <span className="text-gradient title-glow font-black">SINFONIA</span>{' '}
          <span className="text-white">KARAOKE</span>
        </h1>
        
        <p className="hero-desc">
          Cante no computador ou celular conectado na sua caixa de som! Sistema de pontos em tempo real por pitch e suporte ao formato UltraStar Deluxe.
        </p>
      </div>

      {/* Barra de Ações Rápidas (Pesquisa e Importar) */}
      <div className="actions-wrapper">
        {/* Input de Busca */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Pesquise por música ou artista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <Search className="search-icon w-5 h-5" />
        </div>

        {/* Botão de Importar UltraStar */}
        <button
          onClick={onNavigateToImport}
          className="btn btn-primary"
        >
          <Upload className="w-5 h-5" />
          Importar UltraStar (.txt)
        </button>
      </div>

      {/* Filtros de Categoria */}
      <div className="filter-bar">
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
            className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Seção do Catálogo de Músicas */}
      <div className="catalog-header">
        <h2 className="catalog-title">
          <Music className="text-primary w-6 h-6" /> Músicas do Catálogo ({filteredSongs.length})
        </h2>
        {isLoading && <span className="text-sm text-secondary animate-pulse">Sincronizando Firebase...</span>}
      </div>

      {filteredSongs.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-color-text-muted mb-4">Nenhuma música encontrada com os filtros selecionados.</p>
          <button
            onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
            className="btn btn-secondary"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="song-grid">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              className="glass-panel glass-panel-hover song-card"
            >
              <div className="song-card-details">
                <h3 className="song-card-title">{song.title}</h3>
                <p className="song-card-artist">{song.artist}</p>
                <div className="badge-row">
                  <span className={`badge ${
                    song.category === 'Nacional' ? 'badge-nacional' : 'badge-internacional'
                  }`}>
                    {song.category || 'Personalizada'}
                  </span>
                  {song.hasDemo && (
                    <span className="badge badge-mapped flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3 text-purple-400" /> Tom Mapeado
                    </span>
                  )}
                  {song.isUserUploaded && (
                    <span className="badge badge-user">
                      Firestore
                    </span>
                  )}
                </div>
              </div>

              {/* Botão de Ação */}
              <button
                onClick={() => onSelectSong(song)}
                className="btn-play-round"
                title="Cantar Agora"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
