import React, { useState, useEffect } from 'react';
import { Trophy, Music, Sparkles, User, RefreshCw } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export default function GlobalLeaderboard() {
  const [topScores, setTopScores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGlobalLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Puxa as 10 maiores pontuações globais do banco de dados Cloud Firestore
      const q = query(
        collection(db, 'scores'),
        orderBy('score', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const scoresList = [];
      querySnapshot.forEach((doc) => {
        scoresList.push({ id: doc.id, ...doc.data() });
      });
      setTopScores(scoresList);
    } catch (err) {
      console.error("Falha ao buscar ranking global do Firebase: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto py-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex-row-between mb-6">
        <div>
          <h2 className="text-3xl font-black font-title text-white flex items-center gap-3">
            <Trophy className="text-accent w-8 h-8 animate-pulse" /> Classificação Global Sinfonia
          </h2>
          <p className="text-sm text-color-text-muted mt-1">
            Mural de honra das 10 maiores pontuações e performances vocais de alto nível registradas na plataforma.
          </p>
        </div>
        <button
          onClick={fetchGlobalLeaderboard}
          disabled={isLoading}
          className="btn btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg"
          style={{ minHeight: 'auto' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="glass-panel p-6 flex-1 flex flex-col">
        {isLoading ? (
          <div className="text-center py-20 text-sm text-color-text-muted animate-pulse flex-1 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span>Consultando banco de dados Cloud Firestore...</span>
          </div>
        ) : topScores.length === 0 ? (
          <div className="text-center py-20 text-sm text-color-text-muted border border-dashed border-white/5 rounded-2xl flex-1 flex flex-col items-center justify-center min-h-[280px]">
            <Trophy className="w-12 h-12 text-white/10 mb-3" />
            <p className="font-bold text-white mb-1">Mural Global Vazio</p>
            <p className="text-xs max-w-xs leading-normal">Seja o primeiro cantor a atingir notas perfeitas e gravar sua performance histórica!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topScores.map((item, index) => {
              // Neon de destaque para os 3 primeiros lugares
              const isPodium = index < 3;
              const podiumColors = [
                'border-yellow-500/35 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.08)]', // 1º Ouro
                'border-slate-300/35 bg-slate-300/5', // 2º Prata
                'border-amber-600/35 bg-amber-600/5'  // 3º Bronze
              ];
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                    isPodium ? podiumColors[index] : 'bg-black/25 border border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Medalha / Ranking */}
                    <div className={`font-title font-black text-lg w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_#eab308]' :
                      index === 1 ? 'bg-slate-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-white/5 text-color-text-muted'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div>
                      {/* Nome do Cantor */}
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-color-text-muted" /> {item.singerName}
                        {index === 0 && <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />}
                      </span>
                      {/* Detalhes da Música */}
                      <span className="text-[10px] text-color-text-muted block mt-0.5 flex items-center gap-1">
                        <Music className="w-3 h-3" /> {item.songTitle} — <span className="font-semibold">{item.songArtist}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {/* Pontuação */}
                    <span className={`font-title font-black text-lg block leading-none ${
                      index === 0 ? 'text-yellow-400 title-glow' : 'text-secondary'
                    }`}>
                      {item.score}
                    </span>
                    {/* Porcentagem de Afinação */}
                    <span className="text-[10px] text-color-text-muted block mt-1">{item.scorePercent}% de afinação</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
