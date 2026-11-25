(() => {
    const STORAGE_KEY = 'blhm:coletas';
    const DONORS_KEY = 'blhm:doadoras';
    const CONDICOES = ['Novo', 'Esterilizado', 'Reutilizado', 'Danificado'];

    const $ = (id) => document.getElementById(id);

    const ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    const ICON_SAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';

    const ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

    const BADGES = {
        colostro:  { css: 'badge-colostro',  label: 'Colostro' },
        transicao: { css: 'badge-transicao', label: 'Transição' },
        maduro:    { css: 'badge-maduro',    label: 'Maduro' },
    };

    const el = {
        statTotal: $('statTotal'), statRealizadas: $('statRealizadas'), statAguardando: $('statAguardando'),
        search: $('searchInput'), btnNova: $('btnNovaColeta'),
        body: $('coletasBody'), empty: $('emptyState'),
        modal: $('coletaModal'), modalTitle: $('modalTitle'), form: $('coletaForm'),
        btnFechar: $('btnFecharModal'), btnCancelar: $('btnCancelar'), btnCancelarLabel: $('btnCancelarLabel'),
        btnSalvar: $('btnSalvar'), btnSalvarIcon: $('btnSalvarIcon'), btnSalvarLabel: $('btnSalvarLabel'),
        nascimento: $('inputNascimento'), inicio: $('inputInicio'), recebimento: $('inputRecebimento'),
        volume: $('inputVolume'), frascos: $('inputFrascos'), obs: $('inputObs'),
        erroDoadora: $('erroDoadora'), erroInicio: $('erroInicio'), erroRecebimento: $('erroRecebimento'),
        erroVolume: $('erroVolume'), erroFrascos: $('erroFrascos'),
        delModal: $('deleteModal'), btnCancelDelete: $('btnCancelDelete'), btnConfirmDelete: $('btnConfirmDelete'),
    };

    /* ---------- Helpers ---------- */
    const escapeHtml = (s) =>
        String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    const fmtDate = (s) => (s ? s.split('-').reverse().join('/') : '—');
    const todayISO = () => new Date().toLocaleDateString('sv-SE');
    const daysAgoISO = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv-SE'); };

    /* Classificação pelo tempo de vida do bebê no início da coleta:
       até 7 dias = colostro, 8 a 15 dias = transição, acima disso = leite maduro. */
    /* Tipo escolhido no cadastro; se não houver, usa o cálculo automático pela data. */
    function classify(c) {
        if (c.tipoLeite && BADGES[c.tipoLeite]) return c.tipoLeite;
        return autoTipo(c);
    }

    function autoTipo(c) {
        if (!c.nascimentoBebe) return null;
        const ref = c.inicioColeta || c.dataRecebimento || todayISO();
        const dias = Math.round((parseISO(ref) - parseISO(c.nascimentoBebe)) / 864e5);
        if (dias < 0) return null;
        if (dias <= 7) return 'colostro';
        if (dias <= 15) return 'transicao';
        return 'maduro';
    }

    /* Coleta com alguma inconformidade fica aguardando conferência. */
    const isAguardando = (c) => !c.identificacaoCorreta || c.materiaisEstranhos || c.condicao === 'Danificado';

    /* ---------- Persistência ---------- */
    function readDonors() {
        try {
            const list = JSON.parse(localStorage.getItem(DONORS_KEY));
            return Array.isArray(list) ? list : [];
        } catch (_) { return []; }
    }

    const donorIdByName = (nome) =>
        (readDonors().find((d) => d.nome === nome) || {}).id || `ext-${nome.toLowerCase().replace(/\s+/g, '-')}`;

    function seed() {
        const mk = (codigo, nome, nasc, volume, frascos, extra = {}) => ({
            id: crypto.randomUUID(), codigo, doadoraNome: nome, doadoraId: donorIdByName(nome),
            nascimentoBebe: nasc, inicioColeta: daysAgoISO(2), dataRecebimento: daysAgoISO(1),
            volume, frascos, identificacaoCorreta: true, materiaisEstranhos: false,
            condicao: 'Novo', observacoes: '', ...extra,
        });
        return [
            mk('C-0870', 'Larissa Souza',    '2025-09-30',    90, 1),
            mk('C-0321', 'Clarisse Vicente', daysAgoISO(6),   90, 1),
            mk('C-0464', 'Sara Valdenebre',  daysAgoISO(13),  90, 1),
            mk('C-0487', 'Ana Souza',        '2025-08-15',   180, 2),
            mk('C-0486', 'Juliana Lima',     daysAgoISO(11), 120, 1, { materiaisEstranhos: true }),
            mk('C-0465', 'Carla Mendes',     daysAgoISO(5),   90, 1, { identificacaoCorreta: false }),
        ];
    }

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(saved)) return saved;
        } catch (_) { /* ignora */ }
        const initial = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }
    const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(coletas));

    function nextCode() {
        const max = coletas.reduce((m, c) => Math.max(m, parseInt(c.codigo.replace(/\D/g, ''), 10) || 0), 0);
        return `C-${String(max + 1).padStart(4, '0')}`;
    }

    let coletas = load();
    const state = { mode: 'create', editingId: null, tipoManual: false };
    let deletingId = null;

    /* ---------- Dropdown customizado ---------- */
    function createSelect(root, { pill = false, onChange } = {}) {
        const trigger = root.querySelector('.select-trigger');
        const label = root.querySelector('.select-value');
        const menu = root.querySelector('.select-menu');
        const placeholder = root.dataset.placeholder;
        let items = [];
        let value = '';

        function close() {
            menu.hidden = true;
            root.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        function open() {
            menu.hidden = false;
            root.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function renderMenu() {
            if (!items.length) {
                menu.innerHTML = '<li class="select-empty">Nenhuma doadora cadastrada</li>';
                return;
            }
            menu.innerHTML = items.map((i) => `
                <li class="select-option${i.value === value ? ' selected' : ''}" role="option"
                    tabindex="0" data-value="${escapeHtml(i.value)}" aria-selected="${i.value === value}">
                    <span class="dot"></span>
                    <span class="${pill ? 'opt-pill' : ''}">${escapeHtml(i.label)}</span>
                </li>`).join('');
        }

        function setValue(v) {
            value = v || '';
            const item = items.find((i) => i.value === value);
            label.textContent = item ? item.label : placeholder;
            root.classList.toggle('has-value', Boolean(item));
            renderMenu();
        }

        function choose(li) {
            if (!li || !li.dataset.value) return;
            setValue(li.dataset.value);
            if (onChange) onChange(li.dataset.value);
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
            if (e.key === 'Escape' && root.classList.contains('open')) {
                e.stopPropagation();
                close();
                trigger.focus();
            }
        });
        document.addEventListener('click', (e) => { if (!root.contains(e.target)) close(); });

        return {
            trigger,
            setItems(list) { items = list; setValue(value); },
            setValue,
            getValue: () => value,
            getLabel: () => (items.find((i) => i.value === value) || {}).label || '',
            setDisabled(flag) { trigger.disabled = flag; if (flag) close(); },
            close,
        };
    }

    const selDoadora = createSelect($('selDoadora'));
    const selCondicao = createSelect($('selCondicao'), { pill: true });
    selCondicao.setItems(CONDICOES.map((c) => ({ value: c, label: c })));
    const selTipo = createSelect($('selTipo'), { onChange: () => { state.tipoManual = true; } });
    selTipo.setItems(Object.entries(BADGES).map(([value, b]) => ({ value, label: b.label })));

    /* ---------- Render ---------- */
    function render() {
        const term = el.search.value.trim().toLowerCase();

        const rows = coletas.filter((c) => {
            if (!term) return true;
            const cls = classify(c);
            const haystack = `${c.codigo} ${c.doadoraNome} ${cls ? BADGES[cls].label : ''}`.toLowerCase();
            return haystack.includes(term);
        });

        el.body.innerHTML = rows.map((c) => {
            const cls = classify(c);
            const badge = cls
                ? `<span class="badge ${BADGES[cls].css}">${BADGES[cls].label}</span>`
                : '<span class="badge badge-neutro">—</span>';
            return `
            <tr data-id="${c.id}">
                <td>${escapeHtml(c.codigo)}</td>
                <td>${escapeHtml(c.doadoraNome)}</td>
                <td>${fmtDate(c.nascimentoBebe)}</td>
                <td>${c.volume} ml</td>
                <td>${badge}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="view" aria-label="Ver coleta ${escapeHtml(c.codigo)}" title="Visualizar">${ICON_EYE}</button>
                        <button class="icon-btn" data-action="edit" aria-label="Editar coleta ${escapeHtml(c.codigo)}" title="Editar">${ICON_EDIT}</button>
                        <button class="icon-btn danger" data-action="delete" aria-label="Excluir coleta ${escapeHtml(c.codigo)}" title="Excluir">${ICON_TRASH}</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        el.empty.textContent = coletas.length ? 'Nenhuma coleta encontrada.' : 'Nenhuma coleta registrada ainda.';
        el.empty.hidden = rows.length > 0;

        const aguardando = coletas.filter(isAguardando).length;
        el.statTotal.textContent = coletas.length;
        el.statAguardando.textContent = aguardando;
        el.statRealizadas.textContent = coletas.length - aguardando;
    }

    /* ---------- Modal ---------- */
    const getRadio = (name) => el.form.querySelector(`input[name="${name}"]:checked`).value === 'sim';
    const setRadio = (name, yes) => { el.form.querySelector(`input[name="${name}"][value="${yes ? 'sim' : 'nao'}"]`).checked = true; };

    function donorOptions() {
        return readDonors().map((d) => ({ value: d.id, label: d.nome }));
    }

    function fillForm(c) {
        const options = donorOptions();
        if (c && !options.some((o) => o.value === c.doadoraId)) {
            options.push({ value: c.doadoraId, label: c.doadoraNome });
        }
        selDoadora.setItems(options);
        selDoadora.setValue(c ? c.doadoraId : '');
        selCondicao.setValue(c ? c.condicao : '');
        selTipo.setValue(c ? (c.tipoLeite || classify(c) || '') : '');
        state.tipoManual = Boolean(c && c.tipoLeite);

        el.nascimento.value = c ? c.nascimentoBebe : '';
        el.inicio.value = c ? c.inicioColeta : '';
        el.recebimento.value = c ? c.dataRecebimento : '';
        el.volume.value = c ? c.volume : '';
        el.frascos.value = c ? c.frascos : 1;
        setRadio('identificacao', c ? c.identificacaoCorreta : true);
        setRadio('materiais', c ? c.materiaisEstranhos : false);
        el.obs.value = c ? c.observacoes : '';
    }

    function setReadOnly(flag) {
        el.form.querySelectorAll('input').forEach((i) => { i.disabled = flag; });
        selDoadora.setDisabled(flag);
        selCondicao.setDisabled(flag);
        selTipo.setDisabled(flag);
    }

    function clearErrors() {
        [el.erroDoadora, el.erroInicio, el.erroRecebimento, el.erroVolume, el.erroFrascos].forEach((s) => { s.textContent = ''; });
        el.form.querySelectorAll('.invalid').forEach((n) => n.classList.remove('invalid'));
    }

    function openModal(mode, coleta = null) {
        state.mode = mode;
        state.editingId = coleta ? coleta.id : null;

        const titles = { create: 'Registrar nova coleta', edit: 'Editar coleta', view: 'Detalhes da coleta' };
        el.modalTitle.textContent = titles[mode];
        el.btnSalvarLabel.textContent = mode === 'edit' ? 'Editar' : 'Salvar coleta';
        el.btnSalvarIcon.innerHTML = mode === 'edit' ? ICON_EDIT : ICON_SAVE;
        el.btnCancelarLabel.textContent = mode === 'view' ? 'Fechar' : 'Cancelar';
        el.btnSalvar.hidden = mode === 'view';

        fillForm(coleta);
        setReadOnly(mode === 'view');
        clearErrors();

        el.modal.hidden = false;
        document.body.style.overflow = 'hidden';
        (mode === 'view' ? el.btnCancelar : selDoadora.trigger).focus();
    }

    function closeModal() {
        selDoadora.close();
        selCondicao.close();
        selTipo.close();
        el.modal.hidden = true;
        document.body.style.overflow = '';
        state.editingId = null;
    }

    /* ---------- Validação e salvamento ---------- */
    function validate() {
        clearErrors();
        let ok = true;

        if (!selDoadora.getValue()) {
            el.erroDoadora.textContent = 'Selecione a doadora.';
            selDoadora.trigger.classList.add('invalid');
            ok = false;
        }
        if (!(Number(el.volume.value) > 0)) {
            el.erroVolume.textContent = 'Informe o volume.';
            el.volume.classList.add('invalid');
            ok = false;
        }
        if (!(Number(el.frascos.value) >= 1)) {
            el.erroFrascos.textContent = 'Mínimo 1 frasco.';
            el.frascos.classList.add('invalid');
            ok = false;
        }
        if (el.nascimento.value && el.inicio.value && el.inicio.value < el.nascimento.value) {
            el.erroInicio.textContent = 'Anterior ao nascimento do bebê.';
            el.inicio.classList.add('invalid');
            ok = false;
        }
        if (el.inicio.value && el.recebimento.value && el.recebimento.value < el.inicio.value) {
            el.erroRecebimento.textContent = 'Anterior ao início da coleta.';
            el.recebimento.classList.add('invalid');
            ok = false;
        }
        return ok;
    }

    el.form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.mode === 'view' || !validate()) return;

        const data = {
            doadoraId: selDoadora.getValue(),
            doadoraNome: selDoadora.getLabel(),
            nascimentoBebe: el.nascimento.value,
            inicioColeta: el.inicio.value,
            dataRecebimento: el.recebimento.value,
            volume: Number(el.volume.value),
            frascos: Number(el.frascos.value),
            identificacaoCorreta: getRadio('identificacao'),
            materiaisEstranhos: getRadio('materiais'),
            condicao: selCondicao.getValue(),
            tipoLeite: selTipo.getValue(),
            observacoes: el.obs.value.trim(),
        };

        if (state.mode === 'edit') {
            coletas = coletas.map((c) => (c.id === state.editingId ? { ...c, ...data } : c));
        } else {
            coletas.unshift({ id: crypto.randomUUID(), codigo: nextCode(), ...data });
        }

        save();
        render();
        closeModal();
    });

    /* ---------- Eventos ---------- */
    el.btnNova.addEventListener('click', () => openModal('create'));
    el.search.addEventListener('input', render);

    el.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const coleta = coletas.find((c) => c.id === btn.closest('tr').dataset.id);
        if (!coleta) return;
        if (btn.dataset.action === 'delete') {
            deletingId = coleta.id;
            el.delModal.hidden = false;
            el.btnCancelDelete.focus();
            return;
        }
        openModal(btn.dataset.action === 'edit' ? 'edit' : 'view', coleta);
    });

    el.btnFechar.addEventListener('click', closeModal);
    el.btnCancelar.addEventListener('click', closeModal);
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });
    /* Sugere o tipo de leite pelas datas, enquanto a pessoa não escolher manualmente. */
    function suggestTipo() {
        if (state.mode === 'view' || state.tipoManual) return;
        selTipo.setValue(autoTipo({
            nascimentoBebe: el.nascimento.value, inicioColeta: el.inicio.value, dataRecebimento: el.recebimento.value,
        }) || '');
    }
    [el.nascimento, el.inicio, el.recebimento].forEach((i) => i.addEventListener('change', suggestTipo));

    /* Exclusão */
    const closeDelete = () => { deletingId = null; el.delModal.hidden = true; };
    el.btnCancelDelete.addEventListener('click', closeDelete);
    el.delModal.addEventListener('click', (e) => { if (e.target === el.delModal) closeDelete(); });
    el.btnConfirmDelete.addEventListener('click', () => {
        coletas = coletas.filter((c) => c.id !== deletingId);
        save();
        render();
        closeDelete();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!el.delModal.hidden) closeDelete();
        else if (!el.modal.hidden) closeModal();
    });

    render();
})();