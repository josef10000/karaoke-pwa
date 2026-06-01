import React, { useState, useEffect } from 'react';
import { Search, Music, Sparkles, Upload, Play, Plus, X, AlertCircle } from 'lucide-react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { songsCatalog } from '../songs-catalog';
import { extractYouTubeId } from '../utils/ultrastar';

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


export default function Home({ onSelectSong }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dbSongs, setDbSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Formulário de Cadastro Rápido
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newYoutubeLink, setNewYoutubeLink] = useState('');
  const [newCategory, setNewCategory] = useState('Nacional');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Busca músicas personalizadas salvas no Firebase Firestore
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

  useEffect(() => {
    fetchDbSongs();
  }, []);

  const handleSaveToFirebase = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArtist.trim() || !newYoutubeLink.trim()) {
      setRegisterError("Por favor, preencha todos os campos.");
      return;
    }

    const ytId = extractYouTubeId(newYoutubeLink);
    if (!ytId) {
      setRegisterError("Por favor, informe um link do YouTube válido.");
      return;
    }

    setIsRegistering(true);
    setRegisterError('');

    try {
      const docData = {
        title: newTitle.trim(),
        artist: newArtist.trim(),
        bpm: 120,
        gap: 0,
        youtubeId: ytId,
        notes: [], // partitura de notas inicia vazia (fallback automático do Player)
        category: newCategory,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'songs'), docData);
      setRegisterSuccess(true);
      
      // Limpa os campos
      setNewTitle('');
      setNewArtist('');
      setNewYoutubeLink('');
      setNewCategory('Nacional');

      // Atualiza o catálogo
      await fetchDbSongs();

      setTimeout(() => {
        setRegisterSuccess(false);
        setShowRegisterForm(false);
      }, 1500);
    } catch (err) {
      console.error("Falha ao cadastrar música no Firebase: ", err);
      setRegisterError("Ocorreu um erro ao gravar no banco de dados. Tente novamente.");
    } finally {
      setIsRegistering(false);
    }
  };

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
        <button
          onClick={() => {
            if (searchTerm.trim()) {
              setNewTitle(searchTerm);
            }
            setShowRegisterForm(true);
          }}
          className="btn btn-primary flex items-center gap-1.5 text-xs py-2.5 px-4 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ minHeight: 'auto' }}
        >
          <Plus className="w-4 h-4" /> Cadastrar Música
        </button>
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
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center gap-4">
          <p className="text-color-text-muted">Nenhuma música encontrada com os termos ou filtros selecionados.</p>
          <div className="flex gap-4">
            <button
              onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
              className="btn btn-secondary text-xs py-2 px-4 rounded-xl"
              style={{ minHeight: 'auto' }}
            >
              Limpar Filtros
            </button>
            <button
              onClick={() => {
                if (searchTerm.trim()) {
                  setNewTitle(searchTerm);
                }
                setShowRegisterForm(true);
              }}
              className="btn btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
              style={{ minHeight: 'auto' }}
            >
              <Plus className="w-4 h-4" /> Cadastrar Faixa
            </button>
          </div>
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

      {/* Modal Premium Glassmorphic para Cadastrar Nova Música */}
      {showRegisterForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-filter backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel max-w-md w-full p-6 border border-purple-500/30 shadow-[0_0_40px_rgba(147,51,234,0.25)] relative animate-fade-in">
            {/* Botão Fechar */}
            <button 
              onClick={() => {
                setShowRegisterForm(false);
                setRegisterError('');
              }}
              className="absolute top-4 right-4 text-color-text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold font-title text-white mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Cadastrar Nova Faixa
            </h3>
            <p className="text-xs text-color-text-muted mb-5 leading-relaxed">
              Adicione qualquer vídeo de Karaokê do YouTube. O sistema gerará a partitura de pitch e letras sincronizadas automaticamente ao dar Play!
            </p>

            {registerSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/35 flex items-center justify-center text-primary mb-2 shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-bold text-white">Música Cadastrada com Sucesso!</h4>
                <p className="text-[10px] text-color-text-muted">A faixa está pronta no catálogo. Prepare sua voz!</p>
              </div>
            ) : (
              <form onSubmit={handleSaveToFirebase} className="flex flex-col gap-4">
                {/* Nome da Música */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-color-text-muted uppercase tracking-wider">Título da Música</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Quem Sabe um Dia, Bohemian Rhapsody"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input-field py-2.5 px-3.5 text-sm"
                  />
                </div>

                {/* Nome do Artista */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-color-text-muted uppercase tracking-wider">Artista</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Catedral, Queen"
                    value={newArtist}
                    onChange={(e) => setNewArtist(e.target.value)}
                    className="input-field py-2.5 px-3.5 text-sm"
                  />
                </div>

                {/* Link do YouTube */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-color-text-muted uppercase tracking-wider">Link do Vídeo do YouTube (Karaokê)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: https://www.youtube.com/watch?v=..."
                    value={newYoutubeLink}
                    onChange={(e) => setNewYoutubeLink(e.target.value)}
                    className="input-field py-2.5 px-3.5 text-sm"
                  />
                </div>

                {/* Categoria/Gênero */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-color-text-muted uppercase tracking-wider">Categoria / Idioma</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="select-field py-2 px-3 text-xs"
                  >
                    <option value="Nacional">🇧🇷 Nacional (Música Brasileira)</option>
                    <option value="Internacional">🌎 Internacional (Inglês, Espanhol, etc.)</option>
                  </select>
                </div>

                {/* Mensagem de Erro */}
                {registerError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/20 border border-red-500/35 text-red-400 text-xs mt-1">
                    <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
                    <span>{registerError}</span>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegisterForm(false);
                      setRegisterError('');
                    }}
                    className="btn btn-secondary flex-1 py-2 px-4 rounded-xl text-xs"
                    disabled={isRegistering}
                    style={{ minHeight: 'auto' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5"
                    disabled={isRegistering}
                    style={{ minHeight: 'auto' }}
                  >
                    {isRegistering ? "Gravando..." : "Cadastrar Faixa"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
