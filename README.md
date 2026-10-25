# 🐶 Caminho de Volta — AU-BERMAN 16-BIT

Jogo 2D de labirinto em **Phaser 3 + TypeScript**, inspirado em Bomberman. O cão começa no canto inferior esquerdo e precisa chegar à casinha no canto superior direito.

A migração preserva a matriz **15×13**, tiles de **48 px**, resolução lógica **720×624**, corner-sliding, ossos com explosão em cruz e reação em cadeia, caixas, gatos, powerups, três vidas e 180 segundos. As partículas mantêm velocidade, gravidade e duração da versão original; agora são sprites do Phaser. A música e os efeitos continuam usando Web Audio.

O antigo gerador de texturas foi substituído por **PNG + JSON de spritesheet Aseprite**, com animações direcionais, cão branco e caramelo, quatro pelagens de gatos e arte editável em `art/world.aseprite`. As fontes e imagens são locais; o jogo não usa CDN, backend, banco de dados ou credenciais.

## Rodar no computador

Instale **Node.js 24 LTS** e execute:

```sh
git clone https://github.com/develisrosipsico-dev/lost-dog.git
cd lost-dog
npm ci
npm run dev
```

Se já tiver o repositório, atualize sua cópia, entre na pasta e execute `npm ci` e `npm run dev`. Abra no navegador o endereço mostrado pelo Vite. Deixe o terminal aberto; `Ctrl+C` encerra o servidor. `npm start` também inicia o desenvolvimento.

Com nvm instalado, `nvm install` e `nvm use` selecionam a versão de `.nvmrc`.

## Controles

| Ação | Controle |
| --- | --- |
| Mover | Setas, WASD ou direcional na tela |
| Soltar osso | Espaço ou botão LATIR! |
| Música e efeitos | BGM e SFX no topo |
| Filtro de TV de tubo | CRT |
| Manual / pausa | ? e CONTINUAR |

Clique em **INICIAR AVENTURA** para ativar o áudio e começar. Afaste-se do osso antes da explosão, que também pode atingir o cão. O cão consegue sair do próprio osso, mas não atravessá-lo novamente. As melhorias aumentam alcance, velocidade e quantidade de ossos simultâneos.

O manual e a perda de foco pausam a simulação. Ao voltar, as teclas são liberadas para evitar movimento preso. A cena usa passos fixos de 1/60 s para manter as colisões e a assistência nas quinas estáveis em diferentes taxas de renderização.

## Validar e gerar para hospedagem

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

Os testes cobrem matriz e spawn, colisões, corner-sliding nos dois eixos, saída e bloqueio dos ossos, explosões, reação em cadeia, caixas, partículas, melhorias, vitória, reinício, tempo, pausa e o contrato dos arquivos de arte. `build` também verifica os tipos antes de gerar a pasta `dist/`.

Abra o endereço mostrado pela prévia para conferir o build. A pasta `dist/` pode ser publicada em hospedagem estática, inclusive GitHub Pages. Os caminhos relativos permitem hospedar em subdiretórios. A publicação não é automática.

O bundle inclui o motor Phaser completo; o Vite pode emitir um aviso de tamanho de chunk. Isso não impede o build ou a execução.

## Trabalhar com a arte

Veja [art/README.md](art/README.md) para editar o documento, os nomes das tags, o contrato de exportação e as instruções para Aseprite. Com o editor/CLI instalado:

```sh
npm run assets:export
```

Os PNG/JSON prontos estão versionados. **Aseprite é opcional para jogar e desenvolver**; só é necessário para exportar edições pelo editor. A arte atual é uma adaptação da referência visual enviada, com fonte PNG e documento nativo editável. As variantes de gatos ainda usam uma pose por direção; os ciclos de caminhada do cão e do gato preto e branco têm quatro frames por direção.

## Estrutura

- `index.html`: HUD, menus e controles de toque.
- `src/main.ts`: inicialização e configuração do Phaser.
- `src/scenes/GameScene.ts`: carregamento Aseprite, sprites/animações, input, renderização, pausa e passos fixos.
- `src/game/GameModel.ts`: matriz, corner-sliding, colisões, inimigos, ossos e partículas, sem dependência de DOM ou Phaser.
- `src/game/Audio.ts`: sintetizador e trilha Web Audio da versão original.
- `src/game/atlas.ts`: validação dos frames e tags da arte.
- `art/world.aseprite`: fonte editável dos sprites.
- `public/assets/world.png` e `world.json`: spritesheet e metadados carregados pelo Phaser.
- `tests/`: testes da simulação e dos arquivos Aseprite/exportados.

As fontes Press Start 2P e Fredoka são distribuídas pelos pacotes Fontsource com suas respectivas licenças OFL em `node_modules/@fontsource/`.
