# app-vivere

Telas do app da Vivere Imóveis Selecionados: login, criar e trocar senha, Acessos (gestor) e, nas próximas fatias, o painel do corretor e o A CAPTAR.

- **Sem dados aqui.** Nada de CPF, telefone, lead, imóvel, senha ou chave secreta neste repositório. Tudo fica no Supabase e só sai para quem está logado, pelas regras de cada corretor.
- A chave do Supabase em `app.js` é a **publicável** (feita para ficar no navegador). A chave secreta fica só nas funções do Supabase.
- Senhas: criadas por cada pessoa pelo link do e-mail; ficam cifradas no Supabase Auth. Ninguém as lê; o gestor só redefine (manda link novo) ou tira o acesso.
- Publicado pelo GitHub Pages em https://vivere-imoveis.github.io/app-vivere/
- Biblioteca `vendor/supabase-2.45.4.js` hospedada aqui (sem CDN), copiada do pacote oficial do npm (`@supabase/supabase-js@2.45.4`, sha256 8596965f…).
