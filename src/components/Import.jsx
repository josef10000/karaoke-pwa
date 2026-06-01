import React, { useState } from 'react';
import { ArrowLeft, Upload, FileText, Music, Link, Check, AlertCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { parseUltraStar, extractYouTubeId } from '../utils/ultrastar';

export default function Import({ onNavigateHome }) {
  const [fileContent, setFileContent] = useState('');
  const [parsedSong, setParsedSong] = useState(null);
  const [youtubeLink, setYoutubeLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Manipulador de upload de arquivo .txt
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setError('Por favor, faça upload apenas de arquivos .txt do UltraStar.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setFileContent(content);
      try {
        const songData = parseUltraStar(content);
        if (!songData.title || songData.notes.length === 0) {
          throw new Error('Formato UltraStar inválido ou sem notas musicais.');
        }
        setParsedSong(songData);
        setYoutubeLink(songData.youtubeId ? `https://www.youtube.com/watch?v=${songData.youtubeId}` : '');
        setError('');
      } catch (err) {
        setError('Erro ao ler arquivo UltraStar. Verifique a estrutura do arquivo.');
        setParsedSong(null);
      }
    };
    reader.readAsText(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange({ target: { files: [file] } });
    }
  };

  // Salva a música no Firebase Firestore
  const handleSaveToFirebase = async () => {
    if (!parsedSong) return;

    const ytId = extractYouTubeId(youtubeLink);
    if (!ytId) {
      setError('Por favor, informe um link do YouTube válido para o vídeo do Karaokê.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const docData = {
        title: parsedSong.title,
        artist: parsedSong.artist,
        bpm: parsedSong.bpm,
        gap: parsedSong.gap,
        youtubeId: ytId,
        notes: parsedSong.notes,
        category: 'Personalizada',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'songs'), docData);
      setSuccess(true);
      setTimeout(() => {
        onNavigateHome();
      }, 2000);
    } catch (err) {
      console.error("Falha ao salvar no Firestore: ", err);
      setError('Ocorreu um erro ao salvar a música no banco de dados do Firebase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto py-6">
      
      {/* Botão de Voltar */}
      <button
        onClick={onNavigateHome}
        className="btn btn-secondary self-start mb-6 py-2 px-4 gap-2 flex items-center"
        style={{ minHeight: 'auto' }}
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
      </button>

      <div className="glass-panel p-8">
        <h2 className="text-3xl font-bold font-title mb-2 text-white flex items-center gap-3">
          <Upload className="text-primary w-8 h-8" /> Importar Partitura UltraStar Deluxe
        </h2>
        <p className="text-color-text-muted text-sm mb-6">
          Faça upload de arquivos `.txt` no padrão UltraStar Deluxe. A plataforma interpretará as letras e notas de pitch e as salvará no banco de dados Cloud Firestore para sincronização imediata com pontuação em tempo real.
        </p>

        {/* Zona de Drop de Arquivo */}
        {!parsedSong ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/50 transition-all bg-black/20"
          >
            <input
              type="file"
              accept=".txt"
              id="file-upload"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <FileText className="w-16 h-16 text-color-text-muted mb-4 animate-pulse" />
              <span className="text-lg font-bold font-title text-white mb-2">Arraste seu arquivo .txt aqui</span>
              <span className="text-sm text-color-text-muted">ou clique para navegar no computador</span>
            </label>
          </div>
        ) : (
          /* Visualizador e Ajuste Fino da Importação */
          <div className="flex flex-col gap-6">
            
            {/* Box com Resultado do Parser */}
            <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-500/20 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-bold text-primary font-title uppercase tracking-widest mb-1">Música Detectada</h3>
                <p className="text-xl font-bold text-white flex items-center gap-1.5">
                  <Music className="w-5 h-5 text-secondary" /> {parsedSong.title}
                </p>
                <p className="text-sm text-color-text-muted pl-6">{parsedSong.artist}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/35 rounded-lg p-2.5">
                  <span className="text-[10px] text-color-text-muted block">BPM</span>
                  <span className="text-lg font-bold font-title text-white">{parsedSong.bpm}</span>
                </div>
                <div className="bg-black/35 rounded-lg p-2.5">
                  <span className="text-[10px] text-color-text-muted block">GAP</span>
                  <span className="text-lg font-bold font-title text-white">{(parsedSong.gap / 1000).toFixed(1)}s</span>
                </div>
                <div className="bg-black/35 rounded-lg p-2.5">
                  <span className="text-[10px] text-color-text-muted block">Notas</span>
                  <span className="text-lg font-bold font-title text-white">{parsedSong.notes.length}</span>
                </div>
              </div>
            </div>

            {/* Input para Colar o link do YouTube */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Link className="w-4 h-4 text-secondary" /> Link do Vídeo de Karaokê do YouTube
              </label>
              <input
                type="text"
                placeholder="Ex: https://www.youtube.com/watch?v=ePjtnSPFWK8"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                className="input-field"
              />
              <span className="text-xs text-color-text-muted mt-2">
                A partitura UltraStar necessita de um vídeo de playback do YouTube associado para execução na plataforma. Insira a URL correspondente no campo acima.
              </span>
            </div>

            {/* Botão de Salvar no Firebase */}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => setParsedSong(null)}
                className="btn btn-secondary w-1/3"
              >
                Escolher Outro
              </button>
              <button
                onClick={handleSaveToFirebase}
                disabled={isSaving}
                className="btn btn-primary flex-1 gap-2"
              >
                {isSaving ? 'Salvando no Firebase...' : 'Confirmar e Salvar no Catálogo'}
              </button>
            </div>
          </div>
        )}

        {/* Painéis de Feedback de Sucesso/Erro */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="mt-6 p-6 rounded-xl bg-green-950/20 border border-green-500/30 text-green-400 flex flex-col items-center gap-2 text-center animate-bounce">
            <Check className="w-10 h-10 text-green-400" />
            <h3 className="text-lg font-bold font-title">Música Importada com Sucesso!</h3>
            <p className="text-xs text-color-text-muted">Ela foi gravada no Cloud Firestore e já está disponível no catálogo!</p>
          </div>
        )}
      </div>
    </div>
  );
}
