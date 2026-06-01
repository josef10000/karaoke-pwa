import React, { useState, useEffect } from 'react';
import { Search, Music, Sparkles, Upload, Play } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { songsCatalog } from '../songs-catalog';

// Cache global em memória para as capas de álbuns para evitar limites de taxa de chamadas
const albumCoversCache = {};

// Função auxiliar para gerar um gradiente neon em SVG caso o Deezer falhe ou dê CORS
function generateNeonPlaceholder(title, artist) {
  const initials = ((title?.[0] || '') + (artist?.[0] || '')).toUpperCase();
  const hash = [...(title + artist)].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Cores neon vibrantes de acordo com o Design System Cyber-Neon
  const colors = [
    { start: '#9333ea', end: '#06b6d4' }, // Roxo -> Azul Glacial
    { start: '#ec4899', end: '#9333ea' }, // Magenta -> Roxo
    { start: '#06b6d4', end: '#10b981' }, // Azul -> Verde Neon
    { start: '#f59e0b', end: '#ec4899' }  // Amarelo -> Rosa Accent
  ];
  
  const gradient = colors[hash % colors.length];
  
  // Retorna o SVG embutido como data-uri
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${encodeURIComponent(gradient.start)}"/><stop offset="100%" stop-color="${encodeURIComponent(gradient.end)}"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="50" r="30" fill="black" fill-opacity="0.15"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-weight="900" font-size="28" fill="white" fill-opacity="0.95">${initials}</text></svg>`;
}

// Componente para renderizar capas inteligentes de alta resolução do iTunes da Apple Music (CORS-friendly)
function AlbumCover({ title, artist }) {
  const cacheKey = `${artist}-${title}`;
  const [coverUrl, setCoverUrl] = useState(albumCoversCache[cacheKey] || null);

  useEffect(() => {
    if (coverUrl) return;

    let isMounted = true;
    const fetchCover = async () => {
      try {
        // API pública do iTunes com suporte nativo a CORS e alta disponibilidade
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&limit=1&entity=song`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
          // Obtém a capa em altíssima resolução (500x500px) substituindo o tamanho padrão da URL
          const imgUrl = data.results[0].artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg');
          albumCoversCache[cacheKey] = imgUrl;
          if (isMounted) setCoverUrl(imgUrl);
        } else {
          throw new Error('iTunes vazio');
        }
      } catch (err) {
        // Fallback robusto e elegante em SVG com Design System Cyber-Neon
        const fallback = generateNeonPlaceholder(title, artist);
        albumCoversCache[cacheKey] = fallback;
        if (isMounted) setCoverUrl(fallback);
      }
    };

    fetchCover();
    return () => { isMounted = false; };
  }, [title, artist, coverUrl, cacheKey]);

  return (
    <img 
      src={coverUrl || generateNeonPlaceholder(title, artist)} 
      alt="Capa" 
      className="song-card-album"
      loading="lazy"
    />
  );
}


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
      
      {/* Cabeçalho Compacto e Sofisticado */}
      <div className="mb-6 flex-row-between">
        <div>
          <h2 className="text-3xl font-black font-title text-white">Catálogo de Faixas</h2>
          <p className="text-xs text-color-text-muted mt-0.5">Explore as melodias mapeadas ou busque suas faixas favoritas para performance.</p>
        </div>
      </div>

      {/* Barra de Busca (Largura Total Premium) */}
      <div className="actions-wrapper mb-6" style={{ gridTemplateColumns: '1fr' }}>
        <div className="search-container" style={{ maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="Pesquise por faixa, artista ou gênero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <Search className="search-icon w-5 h-5" />
        </div>
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
              {/* Capa de Álbum Premium Deezer/Neon */}
              <AlbumCover title={song.title} artist={song.artist} />
              
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
