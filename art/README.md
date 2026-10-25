# Arte editável no Aseprite

`world.aseprite` contém a arte inicial original em pixel art: **48 frames RGBA de 24×24 px**, com uma camada e 21 tags de animação. O jogo exibe os pixels em escala 2×, nos mesmos tiles de 48×48 px da versão inicial.

A arte inicial foi construída em pixels pelo script `scripts/create-starter-art.py`, que grava um documento nativo `.aseprite` e as exportações correspondentes. Ela é uma base editável para o artista; não é uma exportação executada pelo editor Aseprite nesta máquina. O documento foi validado por um leitor independente de Aseprite e pelos testes de estrutura/cels do projeto. O editor/CLI do Aseprite não está instalado neste ambiente.

## Editar e exportar

1. Abra `art/world.aseprite` no Aseprite.
2. Edite os pixels e os frames, preservando o tamanho 24×24 e os nomes das tags abaixo.
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

O comando salva `public/assets/world.png` e `public/assets/world.json`. Versione os dois arquivos junto com o `.aseprite`, para que outras pessoas possam rodar o jogo sem instalar o editor. O exportador não é executado por `npm ci`, `dev` ou `build`.

## Exportar pela interface do Aseprite

Em **File → Export Sprite Sheet**:

- Todos os frames e camadas visíveis.
- Sheet type: **Horizontal Strip**; sem Trim, rotação ou Merge Duplicates.
- Output: `public/assets/world.png`.
- JSON Data: `public/assets/world.json`, formato **Array**, com **Tags** habilitado.
- Item Filename: **`{frame}`**, começando em 0, sem extensão ou prefixo.

O Phaser usa os índices numéricos para `createFromAseprite`. A cena cria aliases semânticos, como `dog-down-0`, a partir das tags; não existe mais o gerador `SpriteAtlas16Bit`. As animações de caminhada são repetidas pelo Phaser, e as durações são lidas do JSON.

| Tags | Conteúdo |
| --- | --- |
| `dog-down`, `dog-up`, `dog-left`, `dog-right` | Cão nas quatro direções; quatro frames iniciais por direção |
| `cat-down`, `cat-up`, `cat-left`, `cat-right` | Gato nas quatro direções; quatro frames iniciais por direção |
| `grass`, `wall`, `crate`, `house` | Piso, pilar, caixa e casinha |
| `bone`, `range`, `bomb`, `speed` | Osso e melhorias de alcance, capacidade e velocidade |
| `spark`, `dust`, `note`, `shadow` | Partículas e sombra |
| `blast` | Quatro frames da explosão sônica (mínimo de quatro) |

Para substituir a arte, mantenha essas tags. Os intervalos e posições dos frames podem mudar: o código lê os metadados. Os tiles e itens estáticos usam o primeiro frame da tag; as caminhadas usam todos os frames e durações.

## Recriar a arte inicial

O script Python requer Pillow e **sobrescreve** o documento e as exportações com a arte inicial. Não o use para exportar um desenho já editado. O fluxo normal do artista é `npm run assets:export`.
