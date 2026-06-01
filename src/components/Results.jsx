import React, { useState, useEffect } from 'react';
import { Award, RotateCcw, Home, Sparkles, User, Save, List } from 'lucide-react';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { getFinalFeedback } from '../utils/scoring';

export default function Results({ song, scoreData, onRestartSong, onNavigateHome }) {
  const [singerName, setSingerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const feedback = getFinalFeedback(scoreData.scorePercent);

  // Carrega o ranking dos melhores cantores para esta música do Firebase
  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const q = query(
        collection(db, 'scores'),
        where('songId', '==', song.id),
        orderBy('score', 'desc'),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      const scoresList = [];
      querySnapshot.forEach((doc) => {
        scoresList.push({ id: doc.id, ...doc.data() });
      });
      setLeaderboard(scoresList);
    } catch (err) {
      console.error("Falha ao buscar ranking do Firebase: ", err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [song.id]);

  // Grava o placar do cantor no Firestore
  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!singerName.trim()) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'scores'), {
        singerName: singerName.trim(),
        songId: song.id,
        songTitle: song.title,
        songArtist: song.artist,
        score: scoreData.score,
        scorePercent: scoreData.scorePercent,
        createdAt: new Date().toISOString()
      });

      setIsSaved(true);
      // Atualiza o ranking para listar a pontuação recém-gravada
      fetchLeaderboard();
    } catch (err) {
      console.error("Falha ao gravar pontuação: ", err);
      alert("Não foi possível gravar sua pontuação no Firebase.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto py-6">
      
      {/* Título Superior e Resumo Geral */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 mb-3 bg-purple-900/30 border border-purple-500/35 px-4 py-1.5 rounded-full">
          <Award className="text-accent w-5 h-5 animate-pulse" />
          <span className="text-xs font-bold tracking-wider text-accent font-title uppercase">Performance Concluída!</span>
        </div>
        <h2 className="text-3xl font-black font-title text-white">{song.title}</h2>
        <p className="text-sm text-color-text-muted mt-1">por {song.artist}</p>
      </div>

      {/* Grid de Organização Premium em Duas Colunas no PC */}
      <div className="results-workspace-grid">
        
        {/* Coluna 1: O Seu Placar de Canto e Ações */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-8 text-center relative overflow-hidden flex flex-col items-center justify-center flex-1 min-h-[340px]">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />
            
            <span className="text-[10px] text-color-text-muted uppercase tracking-widest font-bold mb-1">Seu Desempenho</span>
            
            {/* Selo Rank Neon Circular */}
            <div className="rank-badge-neon">
              {feedback.rank}
            </div>

            {/* Círculo de Pontuação e Porcentagem */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-6 mt-2">
              <div className="bg-black/35 rounded-xl p-3.5 border border-white/5">
                <span className="text-[10px] text-color-text-muted block uppercase tracking-widest mb-1">Pontos</span>
                <span className="text-2xl font-black font-title text-white">{scoreData.score}</span>
              </div>
              <div className="bg-black/35 rounded-xl p-3.5 border border-white/5">
                <span className="text-[10px] text-color-text-muted block uppercase tracking-widest mb-1">Afinação</span>
                <span className="text-2xl font-black font-title text-secondary">{scoreData.scorePercent}%</span>
              </div>
            </div>

            {/* Frase Motivacional */}
            <p className="text-sm text-white max-w-md font-medium leading-relaxed bg-white/5 border border-white/5 py-3 px-5 rounded-xl">
              {feedback.emoji} {feedback.message}
            </p>
          </div>

          {/* Botões de Ação Finais de Rodapé */}
          <div className="flex gap-4">
            <button
              onClick={onNavigateHome}
              className="btn btn-secondary flex-1 py-3.5 gap-2"
            >
              <Home className="w-5 h-5" /> Voltar ao Catálogo
            </button>
            <button
              onClick={onRestartSong}
              className="btn btn-primary flex-1 py-3.5 gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Cantar Novamente
            </button>
          </div>
        </div>

        {/* Coluna 2: Ranking Global do Firebase e Formulário de Nome */}
        <div className="flex flex-col gap-6">
          
          {/* Formulário de Gravar Pontuação */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold font-title mb-2.5 text-white flex items-center gap-2">
              <User className="text-primary w-5 h-5" /> Gravar sua Pontuação
            </h3>
            <p className="text-xs text-color-text-muted mb-4">
              Registre seu nome no mural de afinação desta música para disputar o topo do ranking global.
            </p>

            {!isSaved ? (
              <form onSubmit={handleSaveScore} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Seu Nome ou Apelido"
                  value={singerName}
                  onChange={(e) => setSingerName(e.target.value)}
                  maxLength={20}
                  required
                  className="input-field"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary w-full py-3.5 gap-2"
                >
                  <Save className="w-5 h-5" /> {isSaving ? 'Gravando no Firebase...' : 'Salvar no Mural'}
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-green-950/20 border border-green-500/30 text-green-400 text-center font-bold text-sm">
                ✨ Pontuação gravada no mural com sucesso!
              </div>
            )}
          </div>

          {/* Leaderboard (Mural de Pontuação) do Firebase */}
          <div className="glass-panel p-6 flex-1 flex flex-col">
            <h3 className="text-lg font-bold font-title mb-4 text-white flex items-center gap-2">
              <List className="text-secondary w-5 h-5" /> Mural dos Melhores Cantores
            </h3>

            {isLoadingLeaderboard ? (
              <div className="text-center py-8 text-sm text-color-text-muted animate-pulse flex-1 flex items-center justify-center">
                Carregando mural...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-xs text-color-text-muted border border-dashed border-white/5 rounded-xl flex-1 flex items-center justify-center min-h-[120px]">
                Nenhuma pontuação gravada neste mural ainda. Seja o primeiro!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {leaderboard.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/25 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-title font-black text-sm w-5 text-center text-primary">
                        #{index + 1}
                      </span>
                      <span className="font-semibold text-sm text-white">{item.singerName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-title font-black text-sm text-secondary block leading-none">{item.score}</span>
                      <span className="text-[10px] text-color-text-muted">{item.scorePercent}% afinação</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
