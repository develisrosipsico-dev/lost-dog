# Fase 1: mapas, progressão e gatos

A Fase 1 tem três níveis sequenciais. Chegar à casinha abre o botão do próximo nível; concluir 1-3 encerra a fase. Derrotar todos os gatos não é obrigatório. Cada nível começa com três vidas e melhorias básicas. Perder permite repetir o mesmo mapa e seed; terminar a fase permite começar uma nova campanha.

| Nível | Nome | Caixas | Gatos | Relógio | Barreiras na rota com menos caixas |
| --- | --- | --- | --- | --- | --- |
| 1-1 | O Portão do Quintal | 15 | 2 laranjas | 120 s | 3–4 |
| 1-2 | Beco dos Gatos | 28 | 2 laranjas, 1 preto e branco, 1 tricolor | 120 s | 6–8 |
| 1-3 | Noite na Vizinhança | 45 | 2 laranjas, 1 preto e branco, 1 tricolor, 2 siameses | 90 s | 10–13 |

## Grade e tempo

A matriz continua com 15 colunas e 13 linhas. As bordas e todos os pares `(coluna, linha)` par/par são indestrutíveis. O cão nasce em `(1,11)` e a casinha fica em `(13,1)`. O L formado por `(1,11)`, `(1,10)` e `(2,11)` fica livre de caixas e de spawns de inimigos.

A menor rota ortogonal no mapa sem caixas tem 22 passos. A velocidade básica é 3,5 tiles/s (168 px/s); a conta idealizada é `22 / 3,5 ≈ 6,3 s`. O corner-sliding e o movimento contínuo foram preservados. O pavio do osso dura 2 s e o efeito de explosão, 0,45 s.

As contagens de **15/28/45 caixas** foram priorizadas sobre as porcentagens aproximadas do texto de referência: a grade tem 113 células não sólidas, incluindo a casinha, e diferentes reservas de spawn e passagem. Espalhar caixas com probabilidade de 18/35/55% não produziria essas mesmas contagens, nem garantiria as rotas propostas.

O número de barreiras mede células com caixa atravessadas pela rota mais econômica, não o número de ossos necessários: uma explosão pode atingir mais de uma caixa e melhorias mudam o ritmo. As estimativas humanas de 25–35, 45–65 e 80–110 segundos do texto de referência continuam sendo hipóteses para playtesting; os relógios implementados não comprovam esses tempos de conclusão.

## Templates com variação por seed

`src/game/levels.ts` define as regras, spawns e recompensas. A base é fixa e os bloqueios secundários variam com uma PRNG semeada. Não há tentativas aleatórias até surgir um mapa válido.

Os gargalos principais usam faixas de progresso de Manhattan:

```text
progresso = (coluna - 1) + (11 - linha)
```

O spawn tem progresso 0; a casinha, 22. Cada passo ortogonal muda o progresso em 1. Uma faixa inteiramente bloqueada por caixas precisa ser atravessada para avançar. Os pilares fixos permanecem intactos.

- **1-1:** faixas 2, 4 e 6 ensinam a abrir caminho e recuar. Dois gatos laranjas patrulham longe do início; dois becos guardam alcance e velocidade.
- **1-2:** seis faixas principais e pedágios extras no perímetro tornam o caminho pelo centro mais vantajoso. Há três recompensas garantidas em becos: alcance, velocidade e capacidade de ossos.
- **1-3:** dez faixas, duas camadas próximas à casinha e bolsões que isolam os siameses. Abrir as caixas desses bolsões libera os gatos rápidos; há três recompensas garantidas.

Os becos de recompensa são posições com exatamente uma entrada livre antes da destruição da caixa `U`. As demais caixas mantêm a chance anterior de deixar uma melhoria. Uma caixa de recompensa entrega seu item uma única vez, independentemente do sorteio.

O gerador calcula a rota usando Dijkstra com prioridade para menos caixas e, em seguida, menos passos. Ele verifica o intervalo de barreiras antes de retornar o mapa. Isso assegura a topologia; não modela o risco dinâmico dos gatos como parte do custo.

## IA dos gatos

Os gatos andam entre centros de tiles. As decisões ocorrem no centro para evitar que uma mudança de direção os prenda nas quinas.

- **Laranja (`linear`):** segue na direção atual; quando bloqueado, inverte no mesmo eixo. Não escolhe uma esquina lateral.
- **Preto e branco / tricolor (`wander`):** escolhe uma saída livre nas interseções e evita voltar imediatamente quando existe outra saída.
- **Siamês (`hunter`):** é mais rápido e escolhe a direção do cão se ambos estiverem na mesma linha ou coluna, com visão livre. Caixas, pilares e ossos bloqueiam a visão. Sem visão, usa a navegação de esquinas. A perseguição não é um pathfinding global que enxerga através do labirinto.

Todos respeitam caixas, pilares, ossos e a casinha. As pelagens do renderizador correspondem ao tipo de gato; as regras não dependem da ordem no array de sprites.

## Validação e reprodução

```sh
npm test
npm run build
```

Os testes exercitam 250 seeds por nível (750 mapas), verificando contagens, pilares, spawn, becos, barreiras, reprodutibilidade e variação de mapas. Há testes de visão, navegação, gaiolas, transições e repetição da mesma seed após derrota.

Um teste de travessia por nível usa o movimento, colisões, pavio, explosões e dano reais da simulação: aproxima-se de uma caixa, solta um osso, procura abrigo fora da cruz de explosão e segue até a casinha sem perder vidas. Os gatos são removidos nesse teste para isolar a possibilidade de atravessar o mapa; a IA é coberta separadamente.

Para desenvolvimento, `GameModel.startNewGame('1-2', 42)` reproduz o mapa do nível e seed escolhidos. `restartLevel()` repete a mesma seed. `advanceLevel()` só avança depois da vitória e retorna `false` ao terminar 1-3. A seed reproduz o mapa, não uma gravação completa de inputs ou de todos os sorteios durante a partida.
