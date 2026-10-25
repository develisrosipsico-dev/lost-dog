# Arte editável no Aseprite

A arte foi refinada a partir da referência enviada: cão branco e caramelo com coleira vermelha, gatos preto e branco, laranja, siamês e tricolor, gramado com flores, pilares com musgo, caixas de madeira e casinha de telhado vermelho.

`world.aseprite` contém **64 frames RGBA de 192×192 px e 37 tags**. A resolução da arte é independente dos tiles de 48×48 px e da matriz 15×13. A referência recebida era uma captura de tela; a arte aplicada é uma adaptação gerada a partir dela, não uma extração do projeto original do artista. O PNG foi organizado em frames e empacotado em um documento nativo editável, sem redimensionar os pixels durante o empacotamento. O editor/CLI do Aseprite não foi executado nesta máquina.

## Editar e exportar

1. Abra `art/world.aseprite` no Aseprite.
2. Edite os pixels e os frames, preservando o tamanho 192×192 e os nomes das tags abaixo.
3. Salve o documento.
4. Com o executável `aseprite` disponível no PATH, execute na raiz do projeto:

   ```sh
   npm run assets:export
   npm test
   npm run build
   ```

Se o executável não estiver no PATH, informe seu caminho, por exemplo em Bash:

```sh
ASEPRITE_BIN='/caminho/para/aseprite' npm run assets:export
```

Ou, no PowerShell:

```powershell
$env:ASEPRITE_BIN = 'C:\Program Files\Aseprite\Aseprite.exe'
npm run assets:export
```

O comando salva `public/assets/world.png` e `public/assets/world.json`, e atualiza os limites visuais dos tiles e as direções espelhadas. Versione os dois arquivos junto com o `.aseprite`, para que outras pessoas possam rodar o jogo sem instalar o editor. O exportador não é executado por `npm ci`, `dev` ou `build`.

## Exportar pela interface do Aseprite

Em **File → Export Sprite Sheet**:

- Todos os frames e camadas visíveis.
- Sheet type: **Horizontal Strip**; sem Trim, rotação ou Merge Duplicates.
- Output: `public/assets/world.png`.
- JSON Data: `public/assets/world.json`, formato **Array**, com **Tags** habilitado.
- Item Filename: **`{frame}`**, começando em 0, sem extensão ou prefixo.

Depois de exportar pela interface, execute `npm run assets:prepare` para recalcular os limites visuais, seguido de `npm test` e `npm run build`.

O Phaser usa os índices numéricos para `createFromAseprite`. A cena cria aliases semânticos, como `dog-down-0`, a partir das tags; não existe mais o gerador `SpriteAtlas16Bit`. As animações de caminhada são repetidas pelo Phaser, e as durações são lidas do JSON.

| Tags | Conteúdo |
| --- | --- |
| `dog-down`, `dog-up`, `dog-left`, `dog-right` | Cão nas quatro direções; quatro frames iniciais por direção |
| `cat-down`, `cat-up`, `cat-left`, `cat-right` | Gato preto e branco: quatro frames por direção |
| `cat-orange-*`, `cat-siamese-*`, `cat-calico-*` | Outras pelagens: uma pose inicial por direção (`down`, `up`, `left`, `right`) |
| `grass-flowers`, `fence`, `brick`, `bush` | Gramado florido e elementos extras; cerca, tijolos e arbusto ficam disponíveis no atlas |
| `grass`, `wall`, `crate`, `house` | Piso, pilar, caixa e casinha |
| `bone`, `range`, `bomb`, `speed` | Osso e melhorias de alcance, capacidade e velocidade |
| `spark`, `dust`, `note`, `shadow` | Partículas e sombra |
| `blast` | Quatro frames da explosão sônica (mínimo de quatro) |

Para substituir a arte, mantenha essas tags. Os intervalos e posições dos frames podem mudar: o código lê os metadados. Os tiles e itens estáticos usam o primeiro frame da tag; as caminhadas usam todos os frames e durações.

## Origem e alinhamento

- `reference-sheet.png`: folha de arte refinada a partir da referência visual enviada.
- `reference-layout.json`: recortes da folha, tamanho dos frames, substituição de uma pose lateral e tags que o Phaser espelha horizontalmente.
- `world.aseprite`: documento que pode ser editado diretamente no Aseprite.
- `public/assets/world.png` e `world.json`: arquivos carregados pelo jogo.

Os gatos usam pelagens diferentes apenas na apresentação; IA, velocidade, colisões e regras continuam iguais. As variantes laranja, siamês e tricolor têm poses direcionais iniciais; novos ciclos de caminhada podem ser desenhados depois. Para algumas direções laterais, o renderizador espelha o sprite conforme `mirrorXTags` em `reference-layout.json`. Se desenhar poses próprias para essas direções, remova suas tags dessa lista e reexporte.

Os limites opacos dos tiles são registrados em `meta.contentBounds`, para preencher os tiles sem esticar as margens transparentes. Os personagens são alinhados pela base das patas e usam a escala derivada do tamanho do frame.

`npm run assets:import` reempacota a folha de referência e **sobrescreve** o `.aseprite` e os PNG/JSON com essa versão. Use-o apenas para atualizar os recortes da referência; não o execute sobre edições manuais sem preservá-las. A edição normal é feita no Aseprite, seguida de `npm run assets:export`.

O antigo `scripts/create-starter-art.py` é apenas o gerador histórico da arte provisória anterior; não faz parte do fluxo atual e sobrescreveria a arte nova se fosse executado.
