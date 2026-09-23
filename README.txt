BRUNA DIAS LP — V6

Rodar no Windows PowerShell:
1) cd "C:\Users\Gabri\Desktop\brunadias-lp"
2) npm.cmd install
3) npm.cmd run dev
4) abrir http://localhost:3000

Novidades V6:
- animação da capa ampliada em 80% com crescimento do avatar mais gradual
- popup de order bump ao clicar em qualquer assinatura
- popup de checkout em seguida
- preview de foto + vídeo no order bump
- total automático com/sem bump de R$ 6,90
- área final preparada para integração PIX Sharkbot

PAINEL ADMINISTRATIVO (V15)
---------------------------
URL local: http://localhost:3000/panel/
Login local padrão: admin
Senha local padrão: BrunaPanel2026!

As credenciais ficam em .env.local (servidor), NÃO em public/config.json.
.env.local está no .gitignore e não deve ser enviado ao GitHub.

No painel você pode editar perfil, bio, redes, planos, posts, visibilidade,
contadores, imagens, vídeos, avatares de curtida, post VIP, aba Mídias,
áudio e order bump.

MODO LOCAL:
- Salva public/config.json e uploads direto na pasta.
- Basta F5 na LP.

MODO GITHUB/VERCEL:
Configure na Vercel:
PANEL_USER
PANEL_PASSWORD
PANEL_SESSION_SECRET
GITHUB_TOKEN
GITHUB_OWNER=nfagenciahot
GITHUB_REPO=checkout_brunadcarv
GITHUB_BRANCH=main

Com GITHUB_TOKEN configurado, o painel grava config e uploads no repositório.
Cada alteração no GitHub dispara novo deploy na Vercel se o projeto estiver conectado.

OBS: vídeos grandes não devem ficar no GitHub a longo prazo. Para produção,
o ideal é migrar mídia pesada para R2/Vercel Blob e manter no GitHub só config/URLs.
