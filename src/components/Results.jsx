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
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto py-6">
      
      {/* Bloco de Parabéns (Placar Neon) */}
      <div className="glass-panel p-8 text-center mb-8 relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-1.5 mb-3 bg-purple-900/30 border border-purple-500/35 px-4 py-1.5 rounded-full z-10 animate-bounce">
          <Award className="text-accent w-5 h-5" />
          <span className="text-xs font-bold tracking-wider text-accent font-title uppercase">Performance Concluída!</span>
        </div>

        <h2 className="text-xl text-color-text-muted mb-1 z-10">{song.title}</h2>
        <p className="text-xs text-color-text-muted mb-6 z-10">de {song.artist}</p>

        {/* Nível Rank (ex: SS, S, A) */}
        <div className="text-7xl font-black font-title text-gradient-purple title-glow mb-4 z-10">
          {feedback.rank}
        </div>

        {/* Círculo de Pontuação e Porcentagem */}
        <div className="grid grid-cols-2 gap-8 max-w-xs w-full mb-6 z-10">
          <div className="bg-black/35 rounded-xl p-4 border border-white/5">
            <span className="text-[10px] text-color-text-muted block uppercase tracking-widest mb-1">Pontos</span>
            <span className="text-2xl font-black font-title text-white">{scoreData.score}</span>
          </div>
          <div className="bg-black/35 rounded-xl p-4 border border-white/5">
            <span className="text-[10px] text-color-text-muted block uppercase tracking-widest mb-1">Afinação</span>
            <span className="text-2xl font-black font-title text-secondary">{scoreData.scorePercent}%</span>
          </div>
        </div>

        {/* Frase Motivacional */}
        <p className="text-base text-white max-w-md font-medium leading-relaxed z-10">
          {feedback.emoji} {feedback.message}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Formuário de Gravar Pontuação */}
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold font-title mb-3 text-white flex items-center gap-2">
            <User className="text-primary w-5 h-5" /> Gravar sua Pontuação
          </h3>
          <p className="text-sm text-color-text-muted mb-4">
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
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold font-title mb-4 text-white flex items-center gap-2">
            <List className="text-secondary w-5 h-5" /> Mural dos Melhores Cantores
          </h3>

          {isLoadingLeaderboard ? (
            <div className="text-center py-8 text-sm text-color-text-muted animate-pulse">
              Carregando mural...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-sm text-color-text-muted border border-dashed border-white/5 rounded-xl">
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

      {/* Botões de Ação Finais de Rodapé */}
      <div className="flex gap-4 mt-8">
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
  );
}
