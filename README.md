# Sorteios WEAK GG

Página estática (`index.html` + `og.png`) — Creation of KZK.

## Subir na Vercel

**Opção 1 — CLI (mais rápido)**

```bash
npm i -g vercel
cd weak-gg-sorteio
vercel --prod
```

Na primeira vez ele pede login e o nome do projeto; aceite os padrões
(não há build, é só HTML). Para atualizar depois, rode `vercel --prod` de novo.

**Opção 2 — GitHub**

1. Crie um repositório e envie esta pasta.
2. Em vercel.com → *Add New → Project* → importe o repositório.
3. Framework Preset: **Other**, sem build command. Deploy.

### Depois do primeiro deploy (prévia do link no Discord)

O Discord só mostra a imagem de prévia com endereço completo. Troque nas duas linhas
`og:image` e `twitter:image` do `index.html`:

```html
<meta property="og:image" content="/og.png">
```

por, por exemplo:

```html
<meta property="og:image" content="https://SEU-PROJETO.vercel.app/og.png">
```

e rode `vercel --prod` de novo.

### Domínio próprio (opcional)

Na Vercel: projeto → *Settings → Domains* → adicione o domínio (ex: `sorteio.seudominio.com`)
e crie no seu provedor de DNS o registro que a Vercel mostrar (CNAME para `cname.vercel-dns.com`).

## Como funciona o sorteio

- Cabeças de chave ficam fixos em cada time.
- Rodada 1: as 4 estrelas (1 por time). Rodadas 2 e 3: os 8 jogadores (1 por time em cada).
- A ordem dos times é sorteada a cada rodada.

### Lacre e verificação

1. Ao iniciar, o navegador gera uma semente secreta de 256 bits (`crypto.getRandomValues`).
2. Monta o **código de verificação**: `WGG1.` + base64url do JSON `{seed, teams, caps, stars, players}`.
3. Mostra para todos o **código do sorteio** = SHA-256 desse código, antes de qualquer revelação.
4. Todo o resultado vem da semente: números = SHA-256(`"<seed>:<n>"`), n = 0, 1, 2…, lidos como uint32
   big-endian, com amostragem por rejeição (sem viés).
5. No final o código de verificação é revelado. Em **Verificar sorteio** qualquer um cola os dois
   códigos: a página confere o SHA-256 e refaz o sorteio inteiro.

## Recursos

- **Colar lista**: botão no formulário, ou cole uma lista (linhas ou vírgulas) direto em qualquer campo.
  Para times, use `Time - Cabeça de chave` por linha.
- Os últimos nomes ficam salvos **só neste navegador** (Limpar tudo apaga).
- Resultado: copiar texto, **baixar imagem** ou **copiar imagem** (para colar no Discord).
- Palco: **Espaço/Enter** revela, **F** tela cheia (controles somem sozinhos), **Esc** sai.
  Botões **Auto** e **Som** no topo; clicar no `#código` copia o código do sorteio.
