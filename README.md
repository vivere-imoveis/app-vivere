# app-vivere

Telas do app da Vivere Imóveis Selecionados: login, criar e trocar senha, Acessos (gestor) e, nas próximas fatias, o painel do corretor e o A CAPTAR.

- **Sem dados aqui.** Nada de CPF, telefone, lead, imóvel, senha ou chave secreta neste repositório. Tudo fica no Supabase e só sai para quem está logado, pelas regras de cada corretor.
- A chave do Supabase em `app.js` é a **publicável** (feita para ficar no navegador). A chave secreta fica só nas funções do Supabase.
- Senhas: criadas por cada pessoa pelo link do e-mail; ficam cifradas no Supabase Auth. Ninguém as lê; o gestor só redefine (manda link novo) ou tira o acesso.
- Publicado pelo GitHub Pages em https://vivere-imoveis.github.io/app-vivere/
- Biblioteca `vendor/supabase-2.45.4.js` hospedada aqui (sem CDN), copiada do pacote oficial do npm (`@supabase/supabase-js@2.45.4`, sha256 8596965f…).

## HUB na web (diretoria) — pasta `hub/`

- Cópia do HUB VIVERE publicado no claude.ai, montada por `montar_hub_web.py` (fica nos docs do projeto, `claude/app-vivere/ferramentas/`): os scripts inline viram `hub/nucleo/nucleo-N.js` (o CSP não aceita script inline) e `hub/modulos/` é cópia byte a byte. `hub/versao.json` diz de qual versão do HUB veio.
- `hub/hub-web.js` troca o `window.claude` do claude.ai pelo login do app: lê pelas funções `public.hub_web_colecoes()` e `public.hub_web_ler()`. **Só leitura**: toda gravação é recusada.
- Quem abre: gestor e quem tem `acessos.hub = true` (por pessoa). Diretor não vê o nível mestre. Coleções com `so_hub` só aparecem a quem tem a marca.
- Cada publicação nova do HUB no claude.ai precisa ser copiada para cá (rodar o `montar_hub_web.py` com a versão nova).
