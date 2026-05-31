# 🎤 Sinfonia Karaoke - PWA de Karaokê Online

Um Progressive Web App (PWA) de karaokê online premium com **pontuação por pitch em tempo real**, suporte ao formato open-source **UltraStar Deluxe (.txt)**, vídeos integrados do YouTube e integração de banco de dados e ranking no **Firebase Firestore**.

Este projeto foi construído utilizando **React**, **Vite** e **CSS Vanilla (Cyber-Neon)**. Ele foi especialmente arquitetado para ser desenvolvido **sem a necessidade de Node.js instalado localmente**, deixando toda a compilação e instalação de pacotes a cargo da nuvem da **Vercel** durante o deploy automático.

---

## ✨ Recursos Chave

*   **⚡ Pontuação por Pitch Octave Neutral**: O algoritmo de autocorrelação matemática analisa a onda sonora do microfone a cada 50ms para identificar a nota musical cantada. O sistema é neutro de oitava (Octave Neutral), permitindo que homens, mulheres e crianças pontuem perfeitamente de forma justa.
*   **📂 Interpretador UltraStar Deluxe (.txt)**: Uma funcionalidade incrível de arrastar e soltar (Drag & Drop) que permite fazer o upload de qualquer arquivo `.txt` da comunidade UltraStar. O app faz o parsing automático, sincroniza a melodia e as letras em segundos.
*   **🔥 Catálogo Híbrido de 100 Músicas**: Contém 50 músicas nacionais brasileiras (desde clássicos sertanejos como *Evidências* e *Boate Azul* até pop rock nacional) e 50 músicas internacionais (como *Bohemian Rhapsody* e *Creep*). As músicas de demonstração contam com mapeamento de pitch completo.
*   **🛠️ Calibração de Ruído Integrada (Noise Gate)**: Slider de sensibilidade em milivolts (mV) para calibrar a captação do microfone do celular ou computador. Isso impede que o som instrumental vindo da caixa de som externa seja interpretado como a voz do cantor.
*   **🌐 Mural de Melhores Cantores (Leaderboard)**: Sincronização em tempo real com o **Firebase Firestore** para listar o ranking das maiores pontuações por música e permitir que você grave o seu nome na história do karaokê.
*   **📱 Progressive Web App (PWA)**: Totalmente responsivo para telas cheias de computadores, TVs ou dispositivos móveis. Pode ser "Instalado" como aplicativo nativo na tela inicial do seu celular, com visual otimizado sem bordas de navegador.

---

## 🏗️ Estrutura do Projeto

```
/karaoke
├── package.json           # Scripts, dependências do Vite + React + Firebase
├── vite.config.js         # Configurações do compilador Vite
├── index.html             # Ponto de entrada do documento HTML
├── vercel.json            # Regras de SPA e caching para a Vercel
├── README.md              # Documentação do projeto
├── public/
│   ├── manifest.json      # Configuração do PWA
│   └── sw.js              # Service Worker de cache offline
└── src/
    ├── main.jsx           # Entrypoint do React
    ├── index.css          # Design System Cyber-Neon
    ├── App.jsx            # Orquestrador da Single Page Application (SPA)
    ├── firebase.js        # Configuração do Firebase Firestore
    ├── songs-catalog.js   # Catálogo estático das 100 músicas e demonstrações
    ├── components/
    │   ├── Home.jsx       # Tela inicial, categorias e catálogo
    │   ├── Import.jsx     # Drag & Drop de arquivos UltraStar .txt
    │   ├── Player.jsx     # Interface de canto (YT Player + Pitch Visualizer)
    │   └── Results.jsx    # Mural final e gravação de pontuações
    └── utils/
        ├── audio.js       # Captura de microfone e algoritmo de Pitch Detection
        ├── ultrastar.js   # Parser e interpretador de texto (.txt)
        └── scoring.js     # Lógica de validação de afinação e ranking
```

---

## 🚀 Guia de Deploy Rápido (GitHub + Vercel)

Como o projeto foi projetado para rodar o build na nuvem, você não precisa configurar nada no seu computador! Apenas siga estes passos simples:

### 1. Criar Repositório no GitHub
1. Acesse o seu [GitHub](https://github.com/) e clique em **New Repository**.
2. Dê o nome de `karaoke-pwa`, configure como Público ou Privado e clique em **Create Repository**.
3. No terminal da sua máquina, dentro da pasta do projeto, rode os comandos para subir as mudanças:
   ```bash
   git add .
   git commit -m "feat: estrutura PWA de Karaokê em React e Vite concluída"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/karaoke-pwa.git
   git push -u origin main
   ```

### 2. Configurar Hospedagem na Vercel
1. Acesse a [Vercel](https://vercel.com/) e crie ou faça login com sua conta do GitHub.
2. Clique no botão **Add New** > **Project**.
3. Importe o seu repositório `karaoke-pwa`.
4. Mantenha as configurações padrão (Vercel detectará automaticamente que é um projeto Vite + React).
5. Clique em **Deploy**. 
6. Pronto! A Vercel instalará as dependências e compilará o projeto na nuvem em menos de 1 minuto, gerando um link público acessível por qualquer computador ou celular.

---

## 🔥 Configuração Inicial do Firebase (Banco de Dados)

O banco de dados Firestore já está ativado no código do app com as suas credenciais fornecidas:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDyHaeThuIImtuzV44RRw9F1PxxOYRvZLI",
  authDomain: "karaoke-pwa-d7b4c.firebaseapp.com",
  projectId: "karaoke-pwa-d7b4c",
  storageBucket: "karaoke-pwa-d7b4c.firebasestorage.app",
  messagingSenderId: "482187604515",
  appId: "1:482187604515:web:2f0edbce7e3a11286fb796"
};
```

### Regras do Cloud Firestore
Para garantir que o aplicativo consiga gravar as pontuações e ler as músicas corretamente, acesse o painel do seu Firebase Console:
1. Vá em **Build** > **Firestore Database** > **Regras**.
2. Substitua o bloco de regras padrão por este modelo que permite leitura e escrita pública (ideal para desenvolvimento):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Clique em **Publicar**.

---

## 🎤 Como Utilizar o Karaokê

1. **Ajuste de Áudio**: Ao abrir o site, use o painel **Calibração de Áudio & Sensibilidade** no rodapé. Clique em "Testar Nível" e cante próximo ao seu dispositivo para ver a barra verde se mover. Ajuste o controle deslizante para que o ruído ambiente ou a música instrumental tocando de fundo não ultrapassem a barra vermelha de corte.
2. **Cantar**: Clique no ícone de "Play" de qualquer música do catálogo (Músicas com o marcador roxo *"Tom Mapeado"* possuem notas UltraStar de tom real!).
3. **Mural de Notas**: Ao cantar músicas mapeadas, você verá o bloco da melodia original se mover na tela. A agulha da sua voz deve coincidir com o bloco. Se coincidir perfeitamente, você acumula pontos na tela e a agulha brilha!
4. **Importar Novas Músicas**: Se você tiver arquivos `.txt` do UltraStar Deluxe, clique em "Importar UltraStar", arraste o arquivo na tela, cole a URL correspondente do Karaokê do YouTube e confirme. Ela estará gravada e disponível permanentemente para você cantar no site!
