# Deploy TV no Vercel

Esta pasta contem apenas a versao web das TVs.

## Arquivos principais

- `index.html`: player da TV
- `admin.html`: painel de gestao online com upload de video/imagem
- `tv-config.json`: fallback local
- `api/`: funcoes serverless do Vercel

## Antes de publicar

1. Suba esta pasta para um repositorio no GitHub.
2. Conecte o repositorio ao Vercel.
3. No projeto do Vercel, adicione um Blob store.
4. Crie a variavel de ambiente `TV_ADMIN_PASSWORD`.
5. Faça o deploy.

## Como usar

- Painel: `/admin.html`
- Player de uma TV: `/index.html?device=tv-sala`

Na primeira abertura, a TV guarda esse ID no navegador.

## Offline

- O player tenta baixar a midia e guardar no navegador da TV.
- Se a internet cair, ele tenta usar a copia local.
- Para esse cache funcionar bem, a midia deve estar no mesmo projeto do Vercel ou em uma origem com CORS liberado.

## Upload de arquivos

- O painel envia video e imagem direto para o Vercel Blob.
- Depois do upload, a configuracao da TV e salva online automaticamente.
