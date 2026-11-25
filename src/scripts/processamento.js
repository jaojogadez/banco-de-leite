(() => {
    const PROC_KEY = 'blhm:processamentos';
    const COLETAS_KEY = 'blhm:coletas';
    const DONORS_KEY = 'blhm:doadoras';

    const ETAPAS = ['Seleção do leite', 'Descongelamento', 'Pasteurização', 'Controle de qualidade', 'Pronto para distribuição'];

    const TIPOS = {
        colostro:  { css: 'badge-colostro',  label: 'Colostro' },
        transicao: { css: 'badge-transicao', label: 'Transição' },
        maduro:    { css: 'badge-maduro',    label: 'Maduro' },
    };

    const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const ICON_EYE = svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>');
    const ICON_TRASH = svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>');
    const ICON_CHECK = svg('<polyline points="20 6 9 17 4 12"/>');
    const ICON_CLOCK = svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
    const ICON_FLASK = svg('<path d="M9 3h6"/><path d="M10 3v13a2 2 0 0 0 4 0V3"/><line x1="10" y1="8" x2="14" y2="8"/>');
    const ICON_TRUCK = svg('<rect x="1" y="5" width="14" height="12" rx="2"/><path d="M15 9h4l3 3v5h-7V9z"/><circle cx="5.5" cy="18.5" r="1.5"/><circle cx="18.5" cy="18.5" r="1.5"/>');
    const ICON_DOT = svg('<circle cx="12" cy="12" r="3"/>');
    const ICON_LOTE = svg('<path d="M8 3h8"/><path d="M7 7h10"/><path d="M7 7l2 14h6l2-14"/>');
    const PENDING_ICONS = [ICON_DOT, ICON_DOT, ICON_DOT, ICON_FLASK, ICON_TRUCK];

    const $ = (id) => document.getElementById(id);
    const el = {
        statFinalizados: $('statFinalizados'), statCadastrados: $('statCadastrados'),
        btnNovo: $('btnNovoProc'),
        listView: $('listView'), detailView: $('detailView'),
        empty: $('procEmpty'), tableCard: $('procTableCard'), body: $('procBody'),
        modal: $('procModal'), form: $('procForm'), btnCancelar: $('btnCancelarProc'), erroColeta: $('erroColeta'),
        delModal: $('deleteModal'), btnCancelDelete: $('btnCancelDelete'), btnConfirmDelete: $('btnConfirmDelete'),
    };

    /* ---------- Helpers ---------- */
    const escapeHtml = (s) =>
        String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function readList(key) {
        try {
            const list = JSON.parse(localStorage.getItem(key));
            return Array.isArray(list) ? list : [];
        } catch (_) { return []; }
    }

    const fmtDateTime = (iso) => {
        const d = new Date(iso);
        return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    /* Mesmas regras da tela de Coletas */
    const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    const todayISO = () => new Date().toLocaleDateString('sv-SE');

    function classify(c) {
        if (!c.nascimentoBebe) return null;
        const ref = c.inicioColeta || c.dataRecebimento || todayISO();
        const dias = Math.round((parseISO(ref) - parseISO(c.nascimentoBebe)) / 864e5);
        if (dias < 0) return null;
        if (dias <= 7) return 'colostro';
        if (dias <= 15) return 'transicao';
        return 'maduro';
    }

    const isAguardando = (c) => !c.identificacaoCorreta || c.materiaisEstranhos || c.condicao === 'Danificado';

    /* ---------- Dados ---------- */
    /* Compatibilidade com registros antigos (que usavam "etapasConcluidas"). */
    function normalize(p) {
        if (Array.isArray(p.datas)) return p;
        const n = Math.min(p.etapasConcluidas || 0, ETAPAS.length);
        return { ...p, datas: Array(n).fill(p.criadoEm) };
    }

    let procs = readList(PROC_KEY).map(normalize);
    const save = () => localStorage.setItem(PROC_KEY, JSON.stringify(procs));

    const loteCodigo = (p) => `L-${p.coletaCodigo}`;
    const isFinalizado = (p) => p.datas.length >= ETAPAS.length;
    const etapaAtual = (p) => ETAPAS[Math.min(p.datas.length, ETAPAS.length - 1)];

    /* Doadora, tipo do leite, volume e frascos vêm das coletas/doadoras (com fallback no que foi salvo). */
    function info(p, coletas, donors) {
        const c = coletas.find((x) => x.id === p.coletaId);
        const d = c && donors.find((x) => x.id === c.doadoraId);
        const cls = c ? classify(c) : null;
        return {
            doadora: (d && d.nome) || (c && c.doadoraNome) || p.doadoraNome || '—',
            tipo: cls ? TIPOS[cls] : null,
            volume: c ? c.volume : p.volume,
            frascos: c ? c.frascos : p.frascos,
        };
    }

    const tipoBadge = (t) => t
        ? `<span class="badge ${t.css}">${t.label}</span>`
        : '<span class="badge badge-neutro">—</span>';

    /* Coletas conferidas e que ainda não viraram processamento. */
    function availableColetas() {
        const usadas = new Set(procs.map((p) => p.coletaId));
        return readList(COLETAS_KEY).filter((c) => !usadas.has(c.id) && !isAguardando(c));
    }

    /* ---------- Dropdown (mesmo padrão visual da tela de Coletas) ---------- */
    function createSelect(root, { emptyText }) {
        const trigger = root.querySelector('.select-trigger');
        const label = root.querySelector('.select-value');
        const menu = root.querySelector('.select-menu');
        const placeholder = root.dataset.placeholder;
        let items = [];
        let value = '';

        const close = () => { menu.hidden = true; root.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
        const open = () => { menu.hidden = false; root.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); };

        function paint() {
            menu.innerHTML = items.length
                ? items.map((i) => `
                    <li class="select-option${i.value === value ? ' selected' : ''}" role="option" tabindex="0"
                        data-value="${escapeHtml(i.value)}" aria-selected="${i.value === value}">
                        <span class="dot"></span><span>${escapeHtml(i.label)}</span>
                    </li>`).join('')
                : `<li class="select-empty">${emptyText}</li>`;
        }

        function setValue(v) {
            value = v || '';
            const item = items.find((i) => i.value === value);
            label.textContent = item ? item.label : placeholder;
            root.classList.toggle('has-value', Boolean(item));
            paint();
        }

        function choose(li) {
            if (!li || !li.dataset.value) return;
            setValue(li.dataset.value);
            trigger.classList.remove('invalid');
            close();
            trigger.focus();
        }

        trigger.addEventListener('click', () => (menu.hidden ? open() : close()));
        menu.addEventListener('click', (e) => choose(e.target.closest('.select-option')));
        menu.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(e.target.closest('.select-option')); }
        });
        root.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && root.classList.contains('open')) { e.stopPropagation(); close(); trigger.focus(); }
        });
        document.addEventListener('click', (e) => { if (!root.contains(e.target)) close(); });

        return { trigger, close, setValue, getValue: () => value, setItems(list) { items = list; setValue(''); } };
    }

    const selColeta = createSelect($('selColeta'), { emptyText: 'Nenhuma coleta disponível' });

    /* ---------- Render: lista ---------- */
    function renderList() {
        const coletas = readList(COLETAS_KEY);
        const donors = readList(DONORS_KEY);

        el.statCadastrados.textContent = procs.length;
        el.statFinalizados.textContent = procs.filter(isFinalizado).length;
        el.empty.hidden = procs.length > 0;
        el.tableCard.hidden = procs.length === 0;

        el.body.innerHTML = procs.map((p) => {
            const i = info(p, coletas, donors);
            return `
            <tr data-id="${p.id}">
                <td>${escapeHtml(loteCodigo(p))}</td>
                <td>${escapeHtml(i.doadora)}</td>
                <td>${escapeHtml(etapaAtual(p))}</td>
                <td>${tipoBadge(i.tipo)}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="view" aria-label="Ver andamento do lote ${escapeHtml(loteCodigo(p))}" title="Ver andamento">${ICON_EYE}</button>
                        <button class="icon-btn danger" data-action="delete" aria-label="Excluir processamento ${escapeHtml(loteCodigo(p))}" title="Excluir">${ICON_TRASH}</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    /* ---------- Render: andamento do lote ---------- */
    function renderDetail(p, anim = {}) {
        const i = info(p, readList(COLETAS_KEY), readList(DONORS_KEY));
        const done = p.datas.length;
        const fin = isFinalizado(p);

        const last = ETAPAS.length - 1;
        const sfx = (anim.done === last || anim.undone === last) ? ' status-anim' : '';
        const status = fin
            ? `<span class="badge badge-maduro${sfx}">Pronto</span>`
            : `<span class="badge badge-transicao${sfx}">Em andamento</span>`;

        const etapas = ETAPAS.map((nome, idx) => {
            let cls, icon, tag, check = '';
            if (idx < done) {
                cls = 'done'; icon = ICON_CHECK;
                tag = `<span class="badge badge-maduro">Concluído em ${fmtDateTime(p.datas[idx])}</span>`;
                /* Só a última etapa concluída pode ser desmarcada (mantém a ordem do fluxo). */
                if (idx === done - 1) {
                    check = `<button type="button" class="etapa-check checked" data-action="undo" title="Desmarcar etapa" aria-label="Desmarcar etapa: ${escapeHtml(nome)}">${ICON_CHECK}</button>`;
                }
            } else if (idx === done) {
                cls = 'current'; icon = ICON_CLOCK;
                tag = '<span class="badge badge-transicao">Em andamento</span>';
                check = `<button type="button" class="etapa-check" data-action="advance" title="Concluir etapa" aria-label="Concluir etapa: ${escapeHtml(nome)}">${ICON_CHECK}</button>`;
            } else {
                cls = 'pending'; icon = PENDING_ICONS[idx];
                tag = '<span class="badge badge-neutro">Pendente</span>';
            }
            const fx = [anim.done === idx && 'just-done', anim.current === idx && 'just-current', anim.undone === idx && 'just-undone', anim.pending === idx && 'just-pending']
                .filter(Boolean).join(' ');
            return `
            <li class="etapa-item ${cls} ${fx}">
                <span class="etapa-icon">${icon}</span>
                <div class="etapa-body"><strong class="etapa-title">${idx + 1}. ${nome}</strong>${tag}</div>
                ${check}
            </li>`;
        }).join('');

        el.detailView.innerHTML = `
            <button type="button" class="btn-ghost detail-back" id="btnVoltar">&larr; Voltar para a lista</button>
            <div class="andamento">
                <aside class="lote-card">
                    <div class="lote-top">
                        <span class="lote-icon">${ICON_LOTE}</span>
                        <div>
                            <span class="lote-label">${fin ? 'Lote finalizado' : 'Lote em andamento'}</span>
                            <strong class="lote-code">${escapeHtml(loteCodigo(p))}</strong>
                        </div>
                    </div>
                    ${status}
                    <dl class="lote-data">
                        <dt>Doadora</dt><dd>${escapeHtml(i.doadora)}</dd>
                        <dt>Tipo do leite</dt><dd>${i.tipo ? i.tipo.label : '—'}</dd>
                        <dt>Volume total selecionado</dt><dd>${escapeHtml(i.volume)} ml</dd>
                        <dt>Quantidade de frascos</dt><dd>${escapeHtml(i.frascos)}</dd>
                    </dl>
                </aside>
                <ol class="etapas">${etapas}</ol>
            </div>`;
    }

    /* ---------- Navegação entre lista e andamento (#lote-<id>) ---------- */
    function currentProc() {
        const m = location.hash.match(/^#lote-(.+)$/);
        return m ? procs.find((p) => p.id === m[1]) : null;
    }

    function route() {
        const p = currentProc();
        el.listView.hidden = Boolean(p);
        el.detailView.hidden = !p;
        if (p) renderDetail(p); else renderList();
    }

    window.addEventListener('hashchange', route);

    /* ---------- Modal de cadastro ---------- */
    function openModal() {
        selColeta.setItems(availableColetas().map((c) => ({ value: c.id, label: c.codigo })));
        el.erroColeta.textContent = '';
        selColeta.trigger.classList.remove('invalid');
        el.modal.hidden = false;
        document.body.style.overflow = 'hidden';
        selColeta.trigger.focus();
    }

    function closeModal() {
        selColeta.close();
        el.modal.hidden = true;
        document.body.style.overflow = '';
    }

    el.btnNovo.addEventListener('click', openModal);
    el.btnCancelar.addEventListener('click', closeModal);
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

    el.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const coleta = availableColetas().find((c) => c.id === selColeta.getValue());
        if (!coleta) {
            el.erroColeta.textContent = 'Selecione uma coleta.';
            selColeta.trigger.classList.add('invalid');
            return;
        }

        procs.unshift({
            id: crypto.randomUUID(),
            coletaId: coleta.id,
            coletaCodigo: coleta.codigo,
            doadoraNome: coleta.doadoraNome,
            volume: coleta.volume,
            frascos: coleta.frascos,
            datas: [],
            criadoEm: new Date().toISOString(),
        });

        save();
        closeModal();
        renderList();
    });

    /* ---------- Exclusão ---------- */
    let deletingId = null;
    const closeDelete = () => { deletingId = null; el.delModal.hidden = true; };

    el.btnCancelDelete.addEventListener('click', closeDelete);
    el.delModal.addEventListener('click', (e) => { if (e.target === el.delModal) closeDelete(); });
    el.btnConfirmDelete.addEventListener('click', () => {
        procs = procs.filter((p) => p.id !== deletingId);
        save();
        closeDelete();
        renderList();
    });

    /* ---------- Ações da lista e do andamento ---------- */
    el.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.closest('tr').dataset.id;

        if (btn.dataset.action === 'view') {
            location.hash = `lote-${id}`;
        } else {
            deletingId = id;
            el.delModal.hidden = false;
            el.btnCancelDelete.focus();
        }
    });

    /* Concluir / desmarcar etapa (com uma pequena animação antes de atualizar). */
    let busy = false;
    el.detailView.addEventListener('click', (e) => {
        if (e.target.closest('#btnVoltar')) { location.hash = ''; return; }
        const btn = e.target.closest('[data-action="advance"], [data-action="undo"]');
        if (!btn || busy) return;

        const p = currentProc();
        const undo = btn.dataset.action === 'undo';
        if (!p || (undo ? !p.datas.length : isFinalizado(p))) return;

        busy = true;
        btn.classList.toggle('checked', !undo);
        btn.classList.add('pop');

        setTimeout(() => {
            const idx = p.datas.length;
            if (undo) {
                p.datas.pop();
                save();
                renderDetail(p, { undone: idx - 1, pending: idx });
            } else {
                p.datas.push(new Date().toISOString());
                save();
                renderDetail(p, { done: idx, current: idx + 1 });
            }
            busy = false;
        }, 380);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!el.delModal.hidden) closeDelete();
        else if (!el.modal.hidden) closeModal();
    });

    route();
})();