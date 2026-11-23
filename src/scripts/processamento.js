(() => {
    const PROC_KEY = 'blhm:processamentos';
    const COLETAS_KEY = 'blhm:coletas';

    const ETAPAS = ['Seleção e classificação', 'Pasteurização', 'Controle de qualidade', 'Armazenamento'];

    const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    const $ = (id) => document.getElementById(id);
    const el = {
        statFinalizados: $('statFinalizados'), statCadastrados: $('statCadastrados'),
        btnNovo: $('btnNovoProc'),
        empty: $('procEmpty'), tableCard: $('procTableCard'), body: $('procBody'),
        modal: $('procModal'), form: $('procForm'), btnCancelar: $('btnCancelarProc'),
        erroColeta: $('erroColeta'),
    };

    const selColeta = createSelect($('selColeta'), { emptyText: 'Nenhuma coleta disponível' });

    /* ---------- Helpers ---------- */
    const escapeHtml = (s) =>
        String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function readList(key) {
        try {
            const list = JSON.parse(localStorage.getItem(key));
            return Array.isArray(list) ? list : [];
        } catch (_) { return []; }
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

    /* Mesma regra da tela de Coletas: coleta com inconformidade ainda não pode ser processada. */
    const isAguardando = (c) => !c.identificacaoCorreta || c.materiaisEstranhos || c.condicao === 'Danificado';

    /* ---------- Dados ---------- */
    let processamentos = readList(PROC_KEY);
    const save = () => localStorage.setItem(PROC_KEY, JSON.stringify(processamentos));

    function nextLote() {
        const max = processamentos.reduce((m, p) => Math.max(m, parseInt(p.lote.replace(/\D/g, ''), 10) || 0), 0);
        return `L-${String(max + 1).padStart(3, '0')}`;
    }

    /* Coletas conferidas e que ainda não viraram processamento. */
    function availableColetas() {
        const usadas = new Set(processamentos.map((p) => p.coletaId));
        return readList(COLETAS_KEY).filter((c) => !usadas.has(c.id) && !isAguardando(c));
    }

    /* ---------- Render ---------- */
    function render() {
        const total = processamentos.length;
        const finalizados = processamentos.filter((p) => p.etapasConcluidas >= ETAPAS.length).length;

        el.statCadastrados.textContent = total;
        el.statFinalizados.textContent = finalizados;
        el.empty.hidden = total > 0;
        el.tableCard.hidden = total === 0;

        el.body.innerHTML = processamentos.map((p) => {
            const done = p.etapasConcluidas;
            const finalizado = done >= ETAPAS.length;
            const etapaAtual = finalizado ? 'Finalizado' : ETAPAS[done];
            const badge = finalizado
                ? `<span class="badge badge-maduro">${etapaAtual}</span>`
                : `<span class="badge badge-transicao">${escapeHtml(etapaAtual)}</span>`;
            const steps = ETAPAS.map((_, i) => `<span class="step${i < done ? ' done' : ''}"></span>`).join('');
            const title = finalizado ? 'Todas as etapas concluídas' : `Concluir etapa: ${ETAPAS[done]}`;

            return `
            <tr data-id="${p.id}">
                <td>${escapeHtml(p.lote)}</td>
                <td>${escapeHtml(p.coletaCodigo)}</td>
                <td>${escapeHtml(p.doadoraNome)}</td>
                <td>${badge}</td>
                <td>
                    <span class="steps" role="img" aria-label="${done} de ${ETAPAS.length} etapas concluídas">${steps}</span>
                    <span class="step-count">${done}/${ETAPAS.length}</span>
                </td>
                <td>${formatDate(p.criadoEm)}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="advance" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" ${finalizado ? 'disabled' : ''}>${ICON_CHECK}</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    /* ---------- Modal ---------- */
    function openModal() {
        selColeta.setItems(availableColetas().map((c) => ({ value: c.id, label: c.codigo })));
        selColeta.setValue('');
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

    /* ---------- Eventos ---------- */
    el.btnNovo.addEventListener('click', openModal);
    el.btnCancelar.addEventListener('click', closeModal);
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !el.modal.hidden) closeModal();
    });

    el.form.addEventListener('submit', (e) => {
        e.preventDefault();

        const coleta = availableColetas().find((c) => c.id === selColeta.getValue());
        if (!coleta) {
            el.erroColeta.textContent = 'Selecione uma coleta.';
            selColeta.trigger.classList.add('invalid');
            return;
        }

        processamentos.unshift({
            id: crypto.randomUUID(),
            lote: nextLote(),
            coletaId: coleta.id,
            coletaCodigo: coleta.codigo,
            doadoraNome: coleta.doadoraNome,
            etapasConcluidas: 0,
            criadoEm: new Date().toISOString(),
        });

        save();
        render();
        closeModal();
    });

    el.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="advance"]');
        if (!btn || btn.disabled) return;
        const id = btn.closest('tr').dataset.id;

        processamentos = processamentos.map((p) =>
            p.id === id && p.etapasConcluidas < ETAPAS.length
                ? { ...p, etapasConcluidas: p.etapasConcluidas + 1 }
                : p);

        save();
        render();
    });

    render();
})();