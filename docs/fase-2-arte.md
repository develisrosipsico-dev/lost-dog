# Arte da Fase 2 — Floresta Pré-Histórica

Esta entrega prepara a arte e a integração dos arquivos. Os desafios, a IA, o dano, as recompensas e a transição jogável depois da casinha da Fase 1 serão definidos posteriormente.

## Abrir o estúdio

Abra `arte_fase2_zelda.html` no navegador. O arquivo contém o CSS e o gerador Canvas em JavaScript, sem dependências externas. Também está disponível pelo servidor de desenvolvimento: execute `npm run dev` e abra o caminho `/arte_fase2_zelda.html` no endereço mostrado no terminal.

A página permite:

- Ver o cenário completo de 15×13 tiles, com portal em `(1,11)` e entrada da caverna em `(13,1)`.
- Alternar entre arbustos intactos e bases cortadas, mostrando o trilobita escondido na prévia.
- Alternar as duas poses dos personagens e do portal.
- Baixar a spritesheet PNG, o cenário PNG e os metadados JSON.

Os botões exportam o estado visível do cenário. Para atualizar os arquivos padrão do projeto, desmarque as duas opções antes de baixar. Salve os três downloads em `public/assets/phase2/`.

`npm run build` inclui a página do estúdio e copia os PNG/JSON para `dist/`. O build não redesenha nem exporta a arte: os arquivos prontos ficam versionados, como os da Fase 1.

## Arquivos prontos

| Arquivo | Conteúdo |
| --- | --- |
| `prehistoric_tileset.png` | 256×128 px: 8 colunas × 4 linhas, 32 frames de 32×32 px |
| `stage2_map_preview.png` | Cenário de 480×416 px, equivalente a 15×13 tiles |
| `prehistoric_tileset.json` | Índices, nove pares de poses, mapa, posições e legenda |

A folha tem transparência real ao redor dos objetos; o xadrez aparece apenas no CSS do estúdio. Os três tiles de chão são opacos. O cenário completo inclui o chão e também é opaco.

O código do texto enviado foi usado como base para esta arte procedural. Não é uma exportação de um projeto Aseprite. O atlas ilustrado e o `.aseprite` da Fase 1 continuam com seu próprio fluxo; `npm run assets:export` trata daquele atlas.

## Correções feitas no exemplo

A folha original declarava 512×256 px, mas ocupava apenas a metade superior esquerda. A nova folha usa 256×128 px, com as 32 células preenchidas, e a legenda informa os índices **globais** usados pelo Phaser.

A caverna agora tem de fato dois tiles horizontais: a metade esquerda ocupa `(12,1)` e a entrada fica na metade direita, em `(13,1)`. O fundo é desenhado antes dos objetos para que a grama não apague a primeira metade.

Os gatos e dinossauros têm dois frames distintos por animação, em vez de a legenda anunciar pares que não eram desenhados. O gato cinza ocupa as duas últimas células. O trilobita só aparece sobre o arbusto na prévia quando a opção de arbustos cortados é marcada.

O mapa mantém as clareiras e obstáculos assimétricos do texto de referência. O cão é mostrado ao lado do portal, em `(2,11)`, como na composição fornecida; isso não define uma nova regra de spawn para o jogo.

## Índices da folha

| Índices | Recurso |
| --- | --- |
| 0–7 | Grama, samambaia, terra, arbusto, base cortada, árvore, rocha, fóssil |
| 8–9 | Portal / buraco de minhoca |
| 10–11 | Caverna: metade esquerda e metade direita |
| 12–15 | Osso em âmbar, pernil, pena, folha para partículas |
| 16–17 | Cão parado e latindo |
| 18–19 | Gato sabre laranja |
| 20–21 | Gato sabre siamês |
| 22–23 | Gato sabre tricolor |
| 24–25 | Mini-raptor |
| 26–27 | Bebê triceratops |
| 28–29 | Trilobita / besouro |
| 30–31 | Gato sabre cinza |

As poses servem ao protótipo visual. Ainda não são ciclos completos de caminhada nas quatro direções, e o triceratops desenhado não tem uma regra de armadura implementada. Os itens representam as melhorias descritas no roteiro; suas regras na Fase 2 continuam pendentes.

## Usar os assets em uma futura cena Phaser

`src/art/phase2.ts` fornece índices tipados, validação do manifesto e helpers de carregamento. Ele não é importado pela cena jogável da Fase 1.

```ts
import {
  loadPhase2Art,
  registerPhase2Animations,
  PHASE2_TEXTURE,
} from '../art/phase2';

// Dentro de uma futura Phaser.Scene:
preload() {
  loadPhase2Art(this);
}

create() {
  const art = registerPhase2Animations(this);
  this.add.sprite(72, 552, PHASE2_TEXTURE, art.frames.wormhole0)
    .setScale(1.5)
    .play('phase2-wormhole');
  this.add.sprite(120, 552, PHASE2_TEXTURE, art.frames.dogIdle)
    .setScale(1.5);
}
```

Para carregar diretamente, a configuração equivalente é:

```ts
this.load.spritesheet('phase2-art', 'assets/phase2/prehistoric_tileset.png', {
  frameWidth: 32,
  frameHeight: 32,
  endFrame: 31,
});
```

As nove animações têm o prefixo `phase2-`, para evitar colisões com os nomes da Fase 1. O helper pode ser chamado novamente sem duplicar animações. A resolução de 32 px é da arte; o tamanho lógico dos tiles da futura cena ainda pode ser escolhido separadamente.

## Validação

```sh
npm test
npm run build
```

Os testes verificam a correspondência entre o manifesto embutido no HTML, o JSON exportado e os PNGs; dimensões, transparência, conteúdo em todos os frames, diferenças entre os pares de poses, união das duas metades da caverna e posições do mapa. A campanha jogável permanece com os três níveis da Fase 1.

Também foram verificados no navegador os três downloads, as duas opções de prévia, o layout em celular e desktop e o carregamento real das 32 imagens e nove animações no Phaser. Os PNG/JSON baixados pelo estúdio coincidem byte a byte com os arquivos versionados.
