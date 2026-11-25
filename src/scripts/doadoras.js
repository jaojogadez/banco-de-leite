(() => {
    const STORAGE_KEY = 'blhm:doadoras';
    const EDITED_KEY = 'blhm:doadoras:editadas';

    const ICON_SAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
    const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    const ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

    const $ = (id) => document.getElementById(id);
    const els = {
        statEditadas: $('statEditadas'), statTotal: $('statTotal'),
        btnNova: $('btnNovaDoadora'),
        modal: $('donorModal'), modalTitle: $('donorModalTitle'), form: $('donorForm'),
        nome: $('inputNome'), cpf: $('inputCpf'), telefone: $('inputTelefone'),
        btnFechar: $('btnFecharModal'), btnCancelarForm: $('btnCancelarForm'),
        btnSubmitIcon: $('btnSubmitIcon'), btnSubmitLabel: $('btnSubmitLabel'),
        body: $('donorsBody'), empty: $('emptyState'),
        delModal: $('deleteModal'), btnCancelDelete: $('btnCancelDelete'), btnConfirmDelete: $('btnConfirmDelete'),
    };
    const ERROS = { nome: 'erroNome', cpf: 'erroCpf', telefone: 'erroTelefone' };

    let donors = load();
    let editingId = null;
    let deletingId = null;

    /* ---------- Persistência ---------- */
    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(saved)) return saved;
        } catch (_) { /* ignora */ }
        const now = Date.now();
        const seed = [
            { id: crypto.randomUUID(), nome: 'Larissa Souza',    cpf: '529.982.247-25', telefone: '(14) 99767-3464', criadoEm: new Date(now - 1 * 36e5).toISOString() },
            { id: crypto.randomUUID(), nome: 'Clarisse Vicente', cpf: '111.444.777-35', telefone: '(14) 99767-3464', criadoEm: new Date(now - 7 * 36e5).toISOString() },
            { id: crypto.randomUUID(), nome: 'Sara Valdenebre',  cpf: '123.456.789-09', telefone: '(14) 99767-3464', criadoEm: new Date(now - 26 * 36e5).toISOString() },
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }
    const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
    const getEdited = () => Number(localStorage.getItem(EDITED_KEY) || 0);

    /* ---------- Máscaras e validações ---------- */
    const onlyDigits = (v) => v.replace(/\D/g, '');

    function maskCpf(v) {
        const d = onlyDigits(v).slice(0, 11);
        return d.replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    function maskPhone(v) {
        const d = onlyDigits(v).slice(0, 11);
        if (d.length <= 2) return d ? `(${d}` : '';
        if (d.length <= 6) return d.replace(/(\d{2})(\d+)/, '($1) $2');
        if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
        return d.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
    }

    /* CPF: 11 dígitos, não repetidos, com os 2 dígitos verificadores corretos. */
    function isValidCpf(value) {
        const d = onlyDigits(value);
        if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
        const dv = (len) => {
            let sum = 0;
            for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
            const r = (sum * 10) % 11;
            return r === 10 ? 0 : r;
        };
        return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
    }

    /* Telefone: DDD válido (11–99) + 8 dígitos (fixo) ou 9 dígitos começando em 9 (celular). */
    function isValidPhone(value) {
        const d = onlyDigits(value);
        if (d.length !== 10 && d.length !== 11) return false;
        if (Number(d.slice(0, 2)) < 11) return false;
        return d.length === 10 || d[2] === '9';
    }

    function formatDate(iso) {
        const date = new Date(iso);
        const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 864e5);
        if (diffDays === 0) return `Hoje, ${time}`;
        if (diffDays === 1) return `Ontem, ${time}`;
        return `${date.toLocaleDateString('pt-BR')}, ${time}`;
    }

    const escapeHtml = (s) =>
        s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- Render ---------- */
    function render() {
        els.body.innerHTML = donors.map((d) => `
            <tr data-id="${d.id}">
                <td><div class="activity-cell"><span class="activity-bullet"></span><span>${escapeHtml(d.nome)}</span></div></td>
                <td>${escapeHtml(d.cpf)}</td>
                <td>${escapeHtml(d.telefone)}</td>
                <td>${formatDate(d.criadoEm)}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="edit" aria-label="Editar ${escapeHtml(d.nome)}" title="Editar">${ICON_EDIT}</button>
                        <button class="icon-btn danger" data-action="delete" aria-label="Excluir ${escapeHtml(d.nome)}" title="Excluir">${ICON_TRASH}</button>
                    </div>
                </td>
            </tr>`).join('');

        els.empty.hidden = donors.length > 0;
        els.statTotal.textContent = donors.length;
        els.statEditadas.textContent = getEdited();
    }

    /* ---------- Modal de cadastro / edição ---------- */
    function openForm(donor = null) {
        editingId = donor ? donor.id : null;
        els.modalTitle.textContent = donor ? 'Editar doadora' : 'Cadastrar doadora';
        els.btnSubmitLabel.textContent = donor ? 'Salvar alterações' : 'Cadastrar';
        els.btnSubmitIcon.innerHTML = donor ? ICON_EDIT : ICON_SAVE;
        els.nome.value = donor?.nome ?? '';
        els.cpf.value = donor?.cpf ?? '';
        els.telefone.value = donor?.telefone ?? '';
        clearErrors();
        els.modal.hidden = false;
        document.body.style.overflow = 'hidden';
        els.nome.focus();
    }

    function closeForm() {
        editingId = null;
        els.form.reset();
        clearErrors();
        els.modal.hidden = true;
        document.body.style.overflow = '';
    }

    function clearFieldError(field) {
        els[field].classList.remove('invalid');
        $(ERROS[field]).textContent = '';
    }
    const clearErrors = () => Object.keys(ERROS).forEach(clearFieldError);

    function setError(field, msg) {
        els[field].classList.add('invalid');
        $(ERROS[field]).textContent = msg;
    }

    function validate() {
        clearErrors();
        let ok = true;

        if (els.nome.value.trim().length < 3) { setError('nome', 'Informe o nome completo.'); ok = false; }

        if (onlyDigits(els.cpf.value).length !== 11) { setError('cpf', 'CPF deve ter 11 dígitos.'); ok = false; }
        else if (!isValidCpf(els.cpf.value)) { setError('cpf', 'CPF inválido.'); ok = false; }
        else if (donors.some((d) => d.cpf === els.cpf.value && d.id !== editingId)) { setError('cpf', 'CPF já cadastrado.'); ok = false; }

        if (!isValidPhone(els.telefone.value)) { setError('telefone', 'Telefone inválido. Ex.: (14) 99999-9999'); ok = false; }

        return ok;
    }

    /* ---------- Eventos ---------- */
    els.nome.addEventListener('input', () => clearFieldError('nome'));
    els.cpf.addEventListener('input', () => { els.cpf.value = maskCpf(els.cpf.value); clearFieldError('cpf'); });
    els.telefone.addEventListener('input', () => { els.telefone.value = maskPhone(els.telefone.value); clearFieldError('telefone'); });

    els.btnNova.addEventListener('click', () => openForm());
    els.btnFechar.addEventListener('click', closeForm);
    els.btnCancelarForm.addEventListener('click', closeForm);
    els.modal.addEventListener('click', (e) => { if (e.target === els.modal) closeForm(); });

    els.form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validate()) return;

        const data = { nome: els.nome.value.trim(), cpf: els.cpf.value, telefone: els.telefone.value };

        if (editingId) {
            donors = donors.map((d) => (d.id === editingId ? { ...d, ...data } : d));
            localStorage.setItem(EDITED_KEY, getEdited() + 1);
        } else {
            donors.unshift({ id: crypto.randomUUID(), ...data, criadoEm: new Date().toISOString() });
        }

        save();
        render();
        closeForm();
    });

    els.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.closest('tr').dataset.id;

        if (btn.dataset.action === 'edit') {
            openForm(donors.find((d) => d.id === id));
        } else {
            deletingId = id;
            els.delModal.hidden = false;
            els.btnCancelDelete.focus();
        }
    });

    function closeDelete() { deletingId = null; els.delModal.hidden = true; }

    els.btnCancelDelete.addEventListener('click', closeDelete);
    els.delModal.addEventListener('click', (e) => { if (e.target === els.delModal) closeDelete(); });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!els.delModal.hidden) closeDelete();
        else if (!els.modal.hidden) closeForm();
    });

    els.btnConfirmDelete.addEventListener('click', () => {
        donors = donors.filter((d) => d.id !== deletingId);
        save();
        render();
        closeDelete();
    });

    render();
})();
