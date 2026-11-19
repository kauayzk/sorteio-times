# Publicar na Vercel

Não há build: a Vercel só serve os arquivos como estão.

## Pelo GitHub (recomendado)

1. Em vercel.com → **Add New → Project** → importe este repositório.
2. Framework Preset: **Other**, sem build command → **Deploy**.
3. A partir daí, cada envio para a branch `main` atualiza o site sozinho.

## Pela linha de comando

```bash
npm i -g vercel
vercel --prod
```

Na primeira vez ele pede login e o nome do projeto; aceite os padrões. Para atualizar, rode
`vercel --prod` de novo.

## Prévia do link no Discord

O Discord só mostra a imagem de prévia com endereço completo. Depois do primeiro deploy, troque
nas linhas `og:image` e `twitter:image` do `index.html`:

```html
<meta property="og:image" content="/assets/img/og.png">
```

por, por exemplo:

```html
<meta property="og:image" content="https://SEU-PROJETO.vercel.app/assets/img/og.png">
```

## Domínio próprio (opcional)

Na Vercel: projeto → **Settings → Domains** → adicione o domínio (ex.: `sorteio.seudominio.com`)
e crie no seu provedor de DNS o registro que a Vercel mostrar (CNAME para `cname.vercel-dns.com`).
