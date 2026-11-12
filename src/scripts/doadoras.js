(() => {
    const STORAGE_KEY = 'blhm:doadoras';
    const EDITED_KEY = 'blhm:doadoras:editadas';

    const $ = (id) => document.getElementById(id);
    const els = {
        statsRow: $('statsRow'), statEditadas: $('statEditadas'), statTotal: $('statTotal'),
        btnNova: $('btnNovaDoadora'),
        formCard: $('formCard'), formTitle: $('formTitle'), form: $('donorForm'),
        nome: $('inputNome'), cpf: $('inputCpf'), telefone: $('inputTelefone'),
        btnSubmit: $('btnSubmit'), btnCancelarForm: $('btnCancelarForm'),
        body: $('donorsBody'), empty: $('emptyState'),
        modal: $('deleteModal'), btnCancelDelete: $('btnCancelDelete'), btnConfirmDelete: $('btnConfirmDelete'),
    };

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
            { id: crypto.randomUUID(), nome: 'Larissa Souza',    cpf: '455.678.987-00', telefone: '(14) 99767-3464', criadoEm: new Date(now - 1 * 36e5).toISOString() },
            { id: crypto.randomUUID(), nome: 'Clarisse Vicente', cpf: '334.667.879-07', telefone: '(14) 99767-3464', criadoEm: new Date(now - 7 * 36e5).toISOString() },
            { id: crypto.randomUUID(), nome: 'Sara Valdenebre',  cpf: '212.567.436-98', telefone: '(14) 99767-3464', criadoEm: new Date(now - 26 * 36e5).toISOString() },
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }
    const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
    const getEdited = () => Number(localStorage.getItem(EDITED_KEY) || 0);

    /* ---------- Helpers ---------- */
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
    const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    const ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

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

    /* ---------- Formulário ---------- */
    function openForm(donor = null) {
        editingId = donor ? donor.id : null;
        els.formTitle.textContent = donor ? 'Editar doadora' : 'Cadastrar doadora';
        els.btnSubmit.textContent = donor ? 'EDITAR +' : 'CADASTRAR +';
        els.nome.value = donor?.nome ?? '';
        els.cpf.value = donor?.cpf ?? '';
        els.telefone.value = donor?.telefone ?? '';
        clearErrors();
        els.statsRow.hidden = true;
        els.formCard.hidden = false;
        els.nome.focus();
        els.formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeForm() {
        editingId = null;
        els.form.reset();
        clearErrors();
        els.formCard.hidden = true;
        els.statsRow.hidden = false;
    }

    function clearErrors() {
        [['nome', 'erroNome'], ['cpf', 'erroCpf'], ['telefone', 'erroTelefone']].forEach(([field, err]) => {
            els[field].classList.remove('invalid');
            $(err).textContent = '';
        });
    }

    function setError(field, errId, msg) {
        els[field].classList.add('invalid');
        $(errId).textContent = msg;
    }

    function validate() {
        clearErrors();
        let ok = true;
        if (els.nome.value.trim().length < 3) { setError('nome', 'erroNome', 'Informe o nome completo.'); ok = false; }
        if (onlyDigits(els.cpf.value).length !== 11) { setError('cpf', 'erroCpf', 'CPF deve ter 11 dígitos.'); ok = false; }
        else if (donors.some((d) => d.cpf === els.cpf.value && d.id !== editingId)) { setError('cpf', 'erroCpf', 'CPF já cadastrado.'); ok = false; }
        if (onlyDigits(els.telefone.value).length < 10) { setError('telefone', 'erroTelefone', 'Telefone inválido.'); ok = false; }
        return ok;
    }

    /* ---------- Eventos ---------- */
    els.cpf.addEventListener('input', () => { els.cpf.value = maskCpf(els.cpf.value); });
    els.telefone.addEventListener('input', () => { els.telefone.value = maskPhone(els.telefone.value); });

    els.btnNova.addEventListener('click', () => openForm());
    els.btnCancelarForm.addEventListener('click', closeForm);

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
            els.modal.hidden = false;
            els.btnCancelDelete.focus();
        }
    });

    function closeModal() { deletingId = null; els.modal.hidden = true; }

    els.btnCancelDelete.addEventListener('click', closeModal);
    els.modal.addEventListener('click', (e) => { if (e.target === els.modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!els.modal.hidden) closeModal();
        else if (!els.formCard.hidden) closeForm();
    });

    els.btnConfirmDelete.addEventListener('click', () => {
        donors = donors.filter((d) => d.id !== deletingId);
        save();
        render();
        closeModal();
    });

    render();
})();