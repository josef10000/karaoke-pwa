# 🎤 Sinfonia Karaoke - Plataforma Profissional de Karaokê Online Premium

Sinfonia Karaoke é a plataforma definitiva de karaokê online de alta fidelidade, projetada para oferecer uma experiência de estúdio em computadores, televisores e dispositivos móveis. Desenvolvido com **tecnologia de processamento de áudio em tempo real**, o sistema oferece **pontuação profissional por pitch (afinação)**, suporte nativo ao padrão aberto **UltraStar Deluxe (.txt)**, fallback inteligente de melodia via **LRCLIB** e integração colaborativa persistente com o banco de dados **Cloud Firestore**.

Construído sobre uma arquitetura estática e moderna com **React**, **Vite** e **CSS Vanilla (Cyber-Neon)**, o projeto foi especialmente otimizado para deploy contínuo em nuvem, garantindo desempenho absoluto, tempos de resposta ultrarrápidos e integridade visual de alto padrão.

---

## ⚡ Recursos de Engenharia e Tecnologia

*   **🎙️ Seletor Dinâmico de Captadores (Microfone Físico):** Módulo de controle integrado que detecta, lista e permite a comutação instantânea entre múltiplos captadores de áudio (microfones internos, headsets profissionais, interfaces de áudio ou entradas auxiliares conectadas a caixas Bluetooth), mantendo o fluxo de execução inalterado.
*   **📐 Algoritmo de Pitch Octave Neutral (Afinação Neutra de Oitava):** O mecanismo de detecção matemática de pitch por autocorrelação analisa a onda de voz a cada 50ms. A pontuação é projetada de forma neutra em relação à oitava (Octave Neutral Scoring), permitindo que vozes masculinas, femininas e infantis pontuem de forma justa e uniforme.
*   **🧩 Mecanismo Inteligente de Fallback de Melodia:** Se uma música cadastrada não dispuser de partitura UltraStar Deluxe `.txt` pública, o Sinfonia Karaoke analisa a métrica temporal das letras no LRCLIB em segundo plano, gerando uma onda melódica harmônica confortável e estruturada na barra de pitch, tornando 100% do catálogo jogável e interativo imediatamente de forma transparente.
*   **🔗 Auto-Link e Correção Proativa de Playback (YouTube Live Swap):** Sistema inteligente de fácil acesso que resolve vídeos indisponíveis por direitos autorais ou links quebrados. Inclui um botão dinâmico de troca rápida ("Vídeo Quebrado? Trocar Link") visível a qualquer momento no player de performance, permitindo que qualquer usuário informe um link ou ID de vídeo alternativo do YouTube, que é persistido de forma colaborativa no Cloud Firestore.
*   **🎨 Deezer API & Neon Design System:** O catálogo premium é alimentado pela API do Deezer para puxar capas de álbuns de alta resolução, com fallback em placeholders geométricos neon gerados em SVG inline para garantir visual sempre premium e sem placeholders estáticos.
*   **🏆 Mural e Leaderboard Corporativo:** Sincronização em tempo real com o Cloud Firestore para armazenar o ranking das maiores pontuações por faixa musical de forma integrada e auditada.

---

## 🏗️ Arquitetura do Sistema

```
/karaoke
├── package.json           # Dependências e scripts do ecossistema React + Vite
├── vite.config.js         # Configurações do compilador e otimizador Vite
├── index.html             # Ponto de entrada do documento HTML5 SEO-optimized
├── vercel.json            # Configuração avançada de SPA, Headers e caching da Vercel
├── README.md              # Documentação técnica profissional do ecossistema
├── public/
│   ├── manifest.json      # Manifesto de aplicação corporativa
│   └── sw.js              # Service Worker para caching offline e integridade
└── src/
    ├── main.jsx           # Ponto de partida do React
    ├── index.css          # Design System Cyber-Neon de Alta Fidelidade (Vanilla CSS)
    ├── App.jsx            # Orquestrador da Single Page Application (SPA)
    ├── firebase.js        # Configuração e inicialização das credenciais Firestore
    ├── songs-catalog.js   # Catálogo geral de faixas e demos estáticas
    ├── components/
    │   ├── Home.jsx       # Painel de controle, categorias e portfólio de faixas
    │   ├── Import.jsx     # Importação de partituras e playbacks UltraStar
    │   ├── Player.jsx     # Core de canto (YT Player + Pitch Visualizer em tempo real)
    │   └── Results.jsx    # Análise de desempenho e mural de pontuações
    └── utils/
        ├── audio.js       # Captura de fluxo de áudio e Pitch Detection (autocorrelação)
        ├── ultrastar.js   # Parser e interpretador sintático de arquivos .txt do UltraStar
        └── scoring.js     # Lógica de cálculo de afinação e avaliação final
```

---

## 🚀 Implantação e Deploy Contínuo (Vercel)

A plataforma Sinfonia Karaoke foi arquitetada para compilação automatizada na nuvem (CI/CD). Siga os procedimentos padrões de deploy corporativo:

### 1. Versionamento no GitHub
No diretório raiz da plataforma, execute os comandos git para inicializar e versionar o código na branch principal:
```bash
git add .
git commit -m "feat: plataforma profissional Sinfonia Karaoke concluída"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/karaoke-pwa.git
git push -u origin main
```

### 2. Vinculação na Vercel
1. Acesse o console da [Vercel](https://vercel.com/) e crie ou faça login na sua conta vinculada ao GitHub.
2. Selecione **Add New** > **Project** e importe o repositório `karaoke-pwa`.
3. Mantenha as configurações padrão (a Vercel aplicará as otimizações de build do Vite automaticamente).
4. Clique em **Deploy**. O pipeline compilará o código e gerará o endpoint de produção em menos de um minuto.

---

## 🎤 Operação e Ajustes de Performance

1. **Calibração Rápida de Captação:** Ao iniciar a plataforma, utilize o módulo de **Calibração de Áudio & Sensibilidade** no rodapé. Cante a uma distância confortável do seu dispositivo para ver o medidor gráfico de decibéis oscilar. Ajuste o limiar de sensibilidade para que o ruído ambiente do instrumental não ultrapasse o ponto de corte do microfone.
2. **Execução de Faixas:** Clique em **Cantar Agora** sobre qualquer faixa do catálogo. O sistema carregará a melhor versão de playback disponível e buscará dinamicamente a partitura UltraStar ou gerará o fallback inteligente.
3. **Mural de Classificação:** Ao finalizar a performance, insira o seu nome de forma auditada no banco de dados Cloud Firestore para registrar sua marca no Mural de Pontuações global.
