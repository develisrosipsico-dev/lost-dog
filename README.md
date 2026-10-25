# 🐶 Caminho de Volta — AU-BERMAN 16-BIT

Um jogo 2D de labirinto inspirado nos jogos de 16 bits. Ajude o cãozinho a sair do canto inferior esquerdo e chegar à casinha no canto superior direito, usando ossos apitadores para quebrar caixas e espantar os gatos.

Esta é a versão inicial enviada em HTML, preparada para desenvolvimento local com Vite. Os desenhos são feitos em Canvas e a música e os efeitos são gerados com Web Audio. Os estilos e as fontes são servidos pelo próprio projeto, sem CDN. Não exige servidor de aplicação, banco de dados ou credenciais.

## Rodar no computador

Instale o **Node.js 24 LTS**, que inclui o npm. Depois, no terminal:

```sh
git clone https://github.com/develisrosipsico-dev/lost-dog.git
cd lost-dog
npm ci
npm run dev
```

Abra no navegador o endereço exibido pelo Vite no terminal. Deixe o terminal aberto enquanto joga; para parar, pressione `Ctrl+C`. Se já tiver clonado o projeto, entre na pasta e execute os dois últimos comandos.

`npm start` também inicia o servidor de desenvolvimento. Com nvm instalado, `nvm install` e `nvm use` selecionam a versão indicada em `.nvmrc`.

## Controles

| Ação | Controle |
| --- | --- |
| Mover o cão | Setas, WASD ou direcional na tela |
| Soltar osso apitador | Espaço ou botão LATIR! |
| Música e efeitos | Botões BGM e SFX no topo |
| Filtro de TV de tubo | Botão CRT |
| Abrir o manual | Botão ? |

Clique em **INICIAR AVENTURA** para começar e ativar o áudio. Você tem três vidas e 180 segundos. Afaste-se dos ossos antes de eles estourarem: o latido também pode atingir o cãozinho. Colete os itens para aumentar alcance, velocidade e quantidade de ossos simultâneos.

## Gerar a versão para hospedagem

```sh
npm run build
npm run preview
```

Abra o endereço mostrado pelo comando de prévia. A pasta `dist/` contém a página pronta para qualquer hospedagem estática, inclusive GitHub Pages. Os caminhos são relativos para permitir publicação em um subdiretório. O servidor de prévia serve apenas para conferir a versão gerada; a publicação não é automática.

## Arquivos principais

- `index.html`: página, desenhos, áudio e lógica original do jogo.
- `src/styles.css`: estilos Tailwind e fontes locais.
- `tailwind.config.js`: classes usadas pela página e extensões de estilo.
- `vite.config.js`: configuração de desenvolvimento e build.
- `package-lock.json`: versões das dependências para instalações reproduzíveis com `npm ci`.

As fontes Press Start 2P e Fredoka são distribuídas pelos pacotes Fontsource com suas respectivas licenças OFL em `node_modules/@fontsource/`.
