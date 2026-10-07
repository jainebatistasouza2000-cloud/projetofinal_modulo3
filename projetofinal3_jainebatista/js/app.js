/* ==========================================================
   SISTEMA GERENCIADOR DE TAREFAS - Módulo 3 (JavaScript)
   Persistência no navegador (localStorage), validações,
   navegação e notificações de sucesso/erro.
   ========================================================== */
(function () {
    'use strict';

    var CHAVE_TAREFAS = 'sgt_tarefas';
    var CHAVE_SESSAO = 'sgt_sessao';
    var CHAVE_FLASH = 'sgt_flash';
    var CHAVE_TEMA = 'sgt_tema';
    var ERRO_GENERICO = 'Não foi possível executar a ação. Tente novamente.';

    var STATUS = {
        'pendente': 'Pendente',
        'em-andamento': 'Em andamento',
        'concluida': 'Concluída'
    };

    var pagina = document.body.dataset.pagina;
    var ehLogin = pagina === 'login';
    var RAIZ = ehLogin ? '' : '../';
    var PAGINAS = ehLogin ? 'pages/' : '';

    /* ---------- Armazenamento ---------- */

    function ler(chave, padrao) {
        try {
            var valor = localStorage.getItem(chave);
            return valor === null ? padrao : JSON.parse(valor);
        } catch (e) {
            return padrao;
        }
    }

    function gravar(chave, valor) {
        try {
            localStorage.setItem(chave, JSON.stringify(valor));
            return true;
        } catch (e) {
            return false;
        }
    }

    function definirFlash(tipo, mensagem) {
        try {
            sessionStorage.setItem(CHAVE_FLASH, JSON.stringify({ tipo: tipo, mensagem: mensagem }));
        } catch (e) { /* sem armazenamento: a mensagem simplesmente não será exibida */ }
    }

    function exibirFlash() {
        try {
            var bruto = sessionStorage.getItem(CHAVE_FLASH);
            if (!bruto) { return; }
            sessionStorage.removeItem(CHAVE_FLASH);
            var flash = JSON.parse(bruto);
            notificar(flash.tipo, flash.mensagem);
        } catch (e) { /* ignora */ }
    }

    /* ---------- Tarefas ---------- */

    function tarefasExemplo() {
        var base = [
            ['Revisar proposta do cliente', 'Revisar a proposta enviada pelo cliente e verificar todas as informações antes de encaminhar a versão final.', 'pendente', '2025-08-24T09:00:00'],
            ['Preparar reunião semanal', 'Montar a pauta e reunir os indicadores da semana.', 'pendente', '2025-08-25T10:00:00'],
            ['Atualizar documentação', 'Registrar as últimas alterações do projeto na documentação técnica.', 'em-andamento', '2025-08-26T14:30:00'],
            ['Testar formulários', 'Validar campos obrigatórios e mensagens de erro.', 'em-andamento', '2025-08-27T08:15:00'],
            ['Corrigir layout mobile', 'Ajustar a grade de cartões para telas menores.', 'concluida', '2025-08-28T16:00:00'],
            ['Publicar no GitHub Pages', 'Gerar a versão final e publicar o projeto.', 'pendente', '2025-08-29T11:45:00']
        ];
        return base.map(function (t, i) {
            return { id: 'exemplo-' + (i + 1), titulo: t[0], descricao: t[1], status: t[2], criadaEm: t[3] };
        });
    }

    function obterTarefas() {
        var tarefas = ler(CHAVE_TAREFAS, null);
        if (!Array.isArray(tarefas)) {
            tarefas = tarefasExemplo();
            gravar(CHAVE_TAREFAS, tarefas);
        }
        return tarefas;
    }

    function buscarTarefa(id) {
        var tarefas = obterTarefas();
        for (var i = 0; i < tarefas.length; i++) {
            if (tarefas[i].id === id) { return tarefas[i]; }
        }
        return null;
    }

    function novoId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function formatarData(iso) {
        var data = new Date(iso);
        if (isNaN(data.getTime())) { return '—'; }
        return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function idDaUrl() {
        return new URLSearchParams(window.location.search).get('id');
    }

    /* ---------- Interface: notificações e erros ---------- */

    function areaNotificacoes() {
        var area = document.getElementById('area-notificacoes');
        if (!area) {
            area = document.createElement('div');
            area.id = 'area-notificacoes';
            area.className = 'area-notificacoes';
            area.setAttribute('role', 'status');
            area.setAttribute('aria-live', 'polite');
            document.body.appendChild(area);
        }
        return area;
    }

    function notificar(tipo, mensagem) {
        var aviso = document.createElement('p');
        aviso.className = 'notificacao notificacao-' + tipo;
        aviso.textContent = mensagem;
        aviso.title = 'Clique para fechar';
        function fechar() { if (aviso.parentNode) { aviso.parentNode.removeChild(aviso); } }
        aviso.addEventListener('click', fechar);
        areaNotificacoes().appendChild(aviso);
        setTimeout(fechar, 5000);
    }

    function limparErro(campo) {
        campo.removeAttribute('aria-invalid');
        campo.removeAttribute('aria-describedby');
        var erro = document.getElementById('erro-' + campo.id);
        if (erro) { erro.parentNode.removeChild(erro); }
    }

    function mostrarErro(campo, mensagem) {
        limparErro(campo);
        var erro = document.createElement('p');
        erro.className = 'erro-campo';
        erro.id = 'erro-' + campo.id;
        erro.textContent = mensagem;
        campo.setAttribute('aria-invalid', 'true');
        campo.setAttribute('aria-describedby', erro.id);
        campo.parentNode.appendChild(erro);
    }

    /* ---------- Validações ---------- */

    var validar = {
        emailObrigatorio: function (v) {
            return v.trim() ? '' : 'Informe o email.';
        },
        senhaObrigatoria: function (v) {
            return v ? '' : 'Informe a senha.';
        },
        nome: function (v) {
            var nome = v.trim();
            var ok = nome.length >= 5 && /^\S+\s+\S+/.test(nome);
            return ok ? '' : 'Informe nome e sobrenome separados por espaço (mínimo de 5 caracteres).';
        },
        email: function (v) {
            var ok = /^[^\s@]+@[^\s@]+\.com(\.br)?$/i.test(v.trim());
            return ok ? '' : 'Informe um email no formato nome@dominio.com ou nome@dominio.com.br.';
        },
        senha: function (v) {
            return v.length >= 8 ? '' : 'A senha deve ter pelo menos 8 caracteres.';
        },
        titulo: function (v) {
            return v.trim().length >= 5 ? '' : 'O título deve ter pelo menos 5 caracteres.';
        },
        descricao: function (v) {
            var texto = v.trim();
            return (texto === '' || texto.length >= 3) ? '' : 'A descrição, se preenchida, deve ter pelo menos 3 caracteres.';
        }
    };

    function configurarFormulario(form, regras, aoValido, mensagemErro) {
        form.setAttribute('novalidate', '');
        regras.forEach(function (regra) {
            var campo = form.elements[regra.campo];
            campo.addEventListener('input', function () { limparErro(campo); });
        });
        form.addEventListener('submit', function (evento) {
            evento.preventDefault();
            var primeiroInvalido = null;
            regras.forEach(function (regra) {
                var campo = form.elements[regra.campo];
                limparErro(campo);
                var mensagem = regra.validar(campo.value);
                if (mensagem) {
                    mostrarErro(campo, mensagem);
                    if (!primeiroInvalido) { primeiroInvalido = campo; }
                }
            });
            if (primeiroInvalido) {
                primeiroInvalido.focus();
                if (mensagemErro) { notificar('erro', mensagemErro); }
                return;
            }
            aoValido(form);
        });
    }

    /* ---------- Elementos reutilizáveis ---------- */

    function criar(tag, classe, texto) {
        var elemento = document.createElement(tag);
        if (classe) { elemento.className = classe; }
        if (texto !== undefined) { elemento.textContent = texto; }
        return elemento;
    }

    function rotuloStatus(status) {
        return criar('span', 'status status-' + status, STATUS[status] || STATUS.pendente);
    }

    /* ---------- Páginas ---------- */

    function paginaLogin() {
        var form = document.getElementById('form-login');
        configurarFormulario(form, [
            { campo: 'email', validar: validar.emailObrigatorio },
            { campo: 'senha', validar: validar.senhaObrigatoria }
        ], function (f) {
            if (!gravar(CHAVE_SESSAO, { email: f.elements.email.value.trim() })) {
                notificar('erro', ERRO_GENERICO);
                return;
            }
            window.location.href = PAGINAS + 'dashboard.html';
        });
    }

    function paginaCadastro() {
        var form = document.getElementById('form-cadastro');
        configurarFormulario(form, [
            { campo: 'nome', validar: validar.nome },
            { campo: 'email', validar: validar.email },
            { campo: 'senha', validar: validar.senha }
        ], function (f) {
            var sessao = { nome: f.elements.nome.value.trim(), email: f.elements.email.value.trim() };
            if (!gravar(CHAVE_SESSAO, sessao)) {
                notificar('erro', ERRO_GENERICO);
                return;
            }
            definirFlash('sucesso', 'Cadastro realizado com sucesso.');
            window.location.href = 'dashboard.html';
        });
    }

    function paginaDashboard() {
        var grade = document.getElementById('grade-tarefas');

        function desenhar() {
            grade.textContent = '';
            var tarefas = obterTarefas();
            if (!tarefas.length) {
                grade.appendChild(criar('p', 'estado-vazio', 'Nenhuma tarefa cadastrada. Use "Nova Tarefa" para começar.'));
                return;
            }
            tarefas.forEach(function (tarefa) {
                var cartao = criar('article', 'cartao cartao-tarefa');
                var cabecalho = criar('header', 'cabecalho-tarefa');

                var olho = criar('a', 'icone-olho', '👁');
                olho.href = 'detalhes.html?id=' + encodeURIComponent(tarefa.id);
                olho.setAttribute('aria-label', 'Ver detalhes da tarefa ' + tarefa.titulo);
                olho.title = 'Ver detalhes';

                cabecalho.appendChild(olho);
                cabecalho.appendChild(criar('h2', '', tarefa.titulo));
                cartao.appendChild(cabecalho);
                cartao.appendChild(criar('p', 'descricao-tarefa', tarefa.descricao || 'Sem descrição.'));
                cartao.appendChild(rotuloStatus(tarefa.status));

                var acoes = criar('div', 'acoes-tarefa');
                var editar = criar('a', 'botao botao-secundario', 'Editar');
                editar.href = 'editar-tarefa.html?id=' + encodeURIComponent(tarefa.id);
                editar.setAttribute('aria-label', 'Editar a tarefa ' + tarefa.titulo);

                var concluir = criar('button', 'botao botao-primario', tarefa.status === 'concluida' ? 'Concluída' : 'Concluir');
                concluir.type = 'button';
                if (tarefa.status === 'concluida') {
                    concluir.disabled = true;
                } else {
                    concluir.setAttribute('aria-label', 'Concluir a tarefa ' + tarefa.titulo);
                    concluir.addEventListener('click', function () { concluirTarefa(tarefa.id); });
                }
                acoes.appendChild(editar);
                acoes.appendChild(concluir);
                cartao.appendChild(acoes);
                grade.appendChild(cartao);
            });
        }

        function concluirTarefa(id) {
            var tarefas = obterTarefas();
            var encontrada = false;
            tarefas.forEach(function (t) {
                if (t.id === id) { t.status = 'concluida'; encontrada = true; }
            });
            if (!encontrada || !gravar(CHAVE_TAREFAS, tarefas)) {
                notificar('erro', ERRO_GENERICO);
                return;
            }
            notificar('sucesso', 'Tarefa concluída com sucesso.');
            desenhar();
        }

        desenhar();
    }

    function tarefaOuSair() {
        var tarefa = buscarTarefa(idDaUrl());
        if (!tarefa) {
            definirFlash('erro', 'Tarefa não encontrada. ' + ERRO_GENERICO);
            window.location.href = 'dashboard.html';
        }
        return tarefa;
    }

    function paginaDetalhes() {
        var tarefa = tarefaOuSair();
        if (!tarefa) { return; }

        document.getElementById('detalhe-titulo').textContent = tarefa.titulo;
        document.getElementById('detalhe-status').appendChild(rotuloStatus(tarefa.status));
        document.getElementById('detalhe-data').textContent = formatarData(tarefa.criadaEm);
        document.getElementById('detalhe-descricao').textContent = tarefa.descricao || 'Sem descrição.';
        document.getElementById('link-editar').href = 'editar-tarefa.html?id=' + encodeURIComponent(tarefa.id);

        document.getElementById('botao-excluir').addEventListener('click', function () {
            if (!window.confirm('Deseja realmente excluir a tarefa "' + tarefa.titulo + '"?')) { return; }
            var restantes = obterTarefas().filter(function (t) { return t.id !== tarefa.id; });
            if (!gravar(CHAVE_TAREFAS, restantes)) {
                notificar('erro', ERRO_GENERICO);
                return;
            }
            definirFlash('sucesso', 'Tarefa excluída com sucesso.');
            window.location.href = 'dashboard.html';
        });
    }

    var REGRAS_TAREFA = [
        { campo: 'titulo', validar: validar.titulo },
        { campo: 'descricao', validar: validar.descricao }
    ];

    function paginaCriarTarefa() {
        var form = document.getElementById('form-tarefa');
        configurarFormulario(form, REGRAS_TAREFA, function (f) {
            var tarefas = obterTarefas();
            tarefas.push({
                id: novoId(),
                titulo: f.elements.titulo.value.trim(),
                descricao: f.elements.descricao.value.trim(),
                status: 'pendente',
                criadaEm: new Date().toISOString()
            });
            if (!gravar(CHAVE_TAREFAS, tarefas)) {
                notificar('erro', ERRO_GENERICO);
                return;
            }
            definirFlash('sucesso', 'Tarefa criada com sucesso.');
            window.location.href = 'dashboard.html';
        }, 'Não foi possível criar a tarefa. Corrija os campos destacados.');
    }

    function paginaEditarTarefa() {
        var tarefa = tarefaOuSair();
        if (!tarefa) { return; }

        var form = document.getElementById('form-tarefa');
        form.elements.titulo.value = tarefa.titulo;
        form.elements.descricao.value = tarefa.descricao;
        form.elements.situacao.value = tarefa.status;
        document.getElementById('link-cancelar').href = 'detalhes.html?id=' + encodeURIComponent(tarefa.id);

        configurarFormulario(form, REGRAS_TAREFA, function (f) {
            var tarefas = obterTarefas();
            tarefas.forEach(function (t) {
                if (t.id === tarefa.id) {
                    t.titulo = f.elements.titulo.value.trim();
                    t.descricao = f.elements.descricao.value.trim();
                    t.status = f.elements.situacao.value;
                }
            });
            if (!gravar(CHAVE_TAREFAS, tarefas)) {
                notificar('erro', ERRO_GENERICO);
                return;
            }
            definirFlash('sucesso', 'Tarefa alterada com sucesso.');
            window.location.href = 'detalhes.html?id=' + encodeURIComponent(tarefa.id);
        }, 'Não foi possível alterar a tarefa. Corrija os campos destacados.');
    }

    function paginaConfiguracoes() {
        var sessao = ler(CHAVE_SESSAO, {});
        document.getElementById('config-email').textContent = sessao.email || '—';
        document.getElementById('restaurar-exemplos').addEventListener('click', function () {
            if (gravar(CHAVE_TAREFAS, tarefasExemplo())) {
                notificar('sucesso', 'Tarefas de exemplo restauradas.');
            } else {
                notificar('erro', ERRO_GENERICO);
            }
        });
    }

    /* ---------- Inicialização ---------- */

    function iniciarTema() {
        var controle = document.getElementById('tema');
        if (!controle) { return; }
        try {
            controle.checked = localStorage.getItem(CHAVE_TEMA) === 'escuro';
            controle.addEventListener('change', function () {
                localStorage.setItem(CHAVE_TEMA, controle.checked ? 'escuro' : 'claro');
            });
        } catch (e) { /* tema não persistido */ }
    }

    function iniciarSair() {
        var links = document.querySelectorAll('[data-acao="sair"]');
        Array.prototype.forEach.call(links, function (link) {
            link.addEventListener('click', function (evento) {
                evento.preventDefault();
                try { localStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* ignora */ }
                definirFlash('sucesso', 'Você saiu do sistema.');
                window.location.href = RAIZ + 'index.html';
            });
        });
    }

    function iniciar() {
        iniciarTema();
        areaNotificacoes();

        if (document.body.dataset.interna === 'sim' && !ler(CHAVE_SESSAO, null)) {
            definirFlash('erro', 'Faça login para acessar o sistema.');
            window.location.href = RAIZ + 'index.html';
            return;
        }

        iniciarSair();
        exibirFlash();

        var paginas = {
            'login': paginaLogin,
            'cadastro': paginaCadastro,
            'dashboard': paginaDashboard,
            'detalhes': paginaDetalhes,
            'criar-tarefa': paginaCriarTarefa,
            'editar-tarefa': paginaEditarTarefa,
            'configuracoes': paginaConfiguracoes
        };
        if (paginas[pagina]) { paginas[pagina](); }
    }

    iniciar();
})();
