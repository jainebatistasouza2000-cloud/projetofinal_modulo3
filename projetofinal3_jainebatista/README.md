# sgt-modulo3
Entrega módulo 3 do curso de programador Web

Sistema Gerenciador de Tarefas (SGT) com HTML5, CSS3 e JavaScript.

## Estrutura
- `index.html` — login
- `pages/` — cadastro, dashboard (minhas tarefas), detalhes, criar/editar tarefa, configurações e termos
- `css/style.css` — estilos compartilhados
- `js/app.js` — navegação, validações, notificações e persistência (localStorage)

## Regras implementadas
- Notificação de sucesso/erro ao criar, alterar, concluir e excluir tarefas
- Login: email e senha obrigatórios
- Cadastro: nome (mín. 5 caracteres com nome e sobrenome), email `x@y.com[.br]`, senha (mín. 8)
- Tarefa: título (mín. 5) e descrição opcional (mín. 3, se preenchida)

Para testar, abra `index.html` no navegador (ou publique no GitHub Pages).
