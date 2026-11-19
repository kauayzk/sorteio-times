# Lacre e verificação

O objetivo é que ninguém — nem quem está sorteando — consiga mudar o resultado depois de começar,
e que qualquer pessoa consiga provar isso depois. O código está em `assets/js/core.js`
(`makeCode`, `readCode`, `planDraw`).

## Passo a passo

1. Ao iniciar, o navegador gera uma **semente secreta** de 256 bits com `crypto.getRandomValues`.
2. Monta o **código de verificação**: `WGG1.` + base64url de um JSON com a semente e os nomes.
3. Calcula o **código do sorteio** = SHA-256 do código de verificação e mostra para todos, antes
   de revelar qualquer nome (tela "sorteio lacrado" e o `#código` no topo do palco).
4. **Todo o resultado sai da semente.** Os números aleatórios são SHA-256(`"<semente>:<n>"`) para
   n = 0, 1, 2…, lidos como inteiros de 32 bits (big-endian). Cada escolha usa amostragem por
   rejeição, então não há viés de módulo.
5. A animação só revela o que já foi decidido.
6. No final o código de verificação é revelado. Em **Verificar sorteio**, a página confere se o
   SHA-256 dele bate com o código do sorteio e refaz o sorteio inteiro a partir da semente.

Mudar um único nome ou um caractere da semente muda o código do sorteio por completo, então não
dá para trocar nada sem que a conferência acuse.

## Formato do código

| Modo | Conteúdo do JSON |
|---|---|
| WEAK GG | `{seed, teams, caps, stars, players}` |
| Padrão | `{mode: "std", seed, teams, players}` |
| Confrontos | `{mode: "bracket", seed, title, teams, players}` — `teams` são os jogos da 1ª fase |

## Como o plano é sorteado

- **WEAK GG:** uma rodada por grupo (estrelas, depois jogadores); em cada rodada a ordem dos times
  é embaralhada (Fisher–Yates) e cada time recebe um nome sorteado do que sobrou.
- **Padrão e Confrontos:** a cada rodada a ordem dos times (ou dos jogos) é embaralhada e cada um
  recebe um nome; na última rodada, se faltarem nomes, o embaralhamento decide quem fica sem
  (o time com um jogador a menos, ou o jogo com folga).

Os resultados dos jogos do chaveamento (quem venceu) **não** fazem parte do lacre: são marcados
depois, à mão, e ficam salvos só no navegador.
