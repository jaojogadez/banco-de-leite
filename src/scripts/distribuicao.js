(() => {
    const DIST_KEY = 'blhm:distribuicoes';
    const PROC_KEY = 'blhm:processamentos';

    const ETAPAS = ['Saída', 'A caminho', 'Concluído'];

    const $ = (id) => document.getElementById(id);
    const el = {
        statConcluidas: $('statConcluidas'), statCanceladas: $('statCanceladas'),
        btnNova: $('btnNovaDist'),
        viewLista: $('viewLista'), viewFluxo: $('viewFluxo'), viewConcluida: $('viewConcluida'),
        empty: $('distEmpty'), tableCard: $('distTableCard'), body: $('distBody'),
        stepper: $('stepper'), stepTitle: $('stepTitle'), stepForm: $('stepForm'),
        fCodigo: $('fCodigo'), fHospital: $('fHospital'), fVolume: $('fVolume'), fDistancia: $('fDistancia'),
        btnAvancar: $('btnAvancar'), btnAvancarLabel: $('btnAvancarLabel'),
        btnVoltar: $('btnVoltar'), btnEtapaAnterior: $('btnEtapaAnterior'), btnVoltarConcluida: $('btnVoltarConcluida'), btnCancelarFluxo: $('btnCancelarFluxo'),
        resCodigo: $('resCodigo'), resHospital: $('resHospital'), resVolume: $('resVolume'), resData: $('resData'),
        cancelModal: $('cancelModal'), btnContinuarDepois: $('btnContinuarDepois'), btnConfirmCancel: $('btnConfirmCancel'),
        modal: $('distModal'), distForm: $('distForm'), btnFecharDist: $('btnFecharDist'), btnCancelarDist: $('btnCancelarDist'),
        mData: $('mData'), mVolume: $('mVolume'), mFrascos: $('mFrascos'), mHospital: $('mHospital'),
        mDistancia: $('mDistancia'), mObs: $('mObs'),
        erroMVolume: $('erroMVolume'), erroMFrascos: $('erroMFrascos'), erroMHospital: $('erroMHospital'), erroLote: $('erroLote'),
    };

    const selLote = createSelect($('selLote'), { emptyText: 'Nenhum lote disponível' });

    /* ---------- Helpers ---------- */
    const escapeHtml = (s) =>
        String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const todayISO = () => new Date().toLocaleDateString('sv-SE');
    const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

    function readList(key) {
        try {
            const list = JSON.parse(localStorage.getItem(key));
            return Array.isArray(list) ? list : [];
        } catch (_) { return []; }
    }

    /* ---------- Dados ---------- */
    let distribuicoes = readList(DIST_KEY);
    const saveDist = () => localStorage.setItem(DIST_KEY, JSON.stringify(distribuicoes));

    function nextCodigo() {
        const max = distribuicoes.reduce((m, d) => Math.max(m, parseInt(d.codigo.replace(/\D/g, ''), 10) || 0), 0);
        return `D-${String(max + 1).padStart(3, '0')}`;
    }

    /* Lote pronto = as 5 etapas do processamento concluídas (formato novo: lista de datas). */
    const loteCodigo = (p) => `L-${p.coletaCodigo}`;
    const isPronto = (p) => (Array.isArray(p.datas) ? p.datas.length >= 5 : (p.etapasConcluidas || 0) >= 4);

    /* Lotes prontos para distribuição e ainda sem distribuição cadastrada. */
    function availableLotes() {
        const usados = new Set(distribuicoes.map((d) => d.loteId));
        return readList(PROC_KEY).filter((p) => !usados.has(p.id) && isPronto(p));
    }

    /* ---------- Lista ---------- */
    function renderList() {
        const concluidas = distribuicoes.filter((d) => d.status === 'concluida').length;
        const canceladas = distribuicoes.filter((d) => d.status === 'cancelada').length;
        el.statConcluidas.textContent = concluidas;
        el.statCanceladas.textContent = canceladas;

        el.empty.hidden = distribuicoes.length > 0;
        el.tableCard.hidden = distribuicoes.length === 0;

        el.body.innerHTML = distribuicoes.map((d) => {
            const statusLabel = d.status === 'concluida' ? 'Concluída' : d.status === 'cancelada' ? 'Cancelada' : `Etapa ${d.etapa}: ${ETAPAS[d.etapa - 1]}`;
            const statusCss = d.status === 'concluida' ? 'dist-status-done' : d.status === 'cancelada' ? 'dist-status-cancel' : '';
            return `
            <tr data-id="${d.id}">
                <td>${escapeHtml(d.codigo)}</td>
                <td>${escapeHtml(d.doadoraNome)}</td>
                <td>${fmtDate(d.dataDistribuicao)}</td>
                <td>${d.volume} ml</td>
                <td>${d.distancia ? `${d.distancia} km` : '—'}</td>
                <td><span class="${statusCss}">${escapeHtml(statusLabel)}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="view" aria-label="Visualizar ${escapeHtml(d.codigo)}" title="Visualizar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    /* ---------- Views ---------- */
    function showView(name) {
        el.viewLista.hidden = name !== 'lista';
        el.viewFluxo.hidden = name !== 'fluxo';
        el.viewConcluida.hidden = name !== 'concluida';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ---------- Fluxo de 3 etapas ---------- */
    let atual = null; // distribuição em edição

    function renderStepper(etapa, concluida) {
        el.stepper.querySelectorAll('.step-item').forEach((item) => {
            const n = Number(item.dataset.step);
            item.classList.toggle('done', concluida || n < etapa);
            item.classList.toggle('current', !concluida && n === etapa);
        });
    }

    function renderResume() {
        el.resCodigo.textContent = atual.codigo;
        el.resHospital.textContent = atual.hospital;
        el.resVolume.textContent = `${atual.volume} ml`;
        el.resData.textContent = fmtDate(atual.dataDistribuicao);
    }

    function renderStep() {
        const etapa = atual.etapa;
        renderStepper(etapa, false);
        renderResume();

        el.stepTitle.textContent = `${etapa}. ${ETAPAS[etapa - 1]}`;
        el.fCodigo.value = atual.codigo;
        el.fHospital.value = atual.hospital;
        el.fVolume.value = atual.volume;
        el.fDistancia.value = atual.distancia ?? '';
        el.btnAvancarLabel.textContent = etapa === ETAPAS.length ? 'Concluir' : 'Próxima etapa';
        el.btnEtapaAnterior.style.display = etapa === 1 ? 'none' : '';
        clearStepErrors();
    }

    function clearStepErrors() {
        ['fHospital', 'fVolume', 'fDistancia'].forEach((id) => el[id].classList.remove('invalid'));
        ['erroHospital', 'erroVolume', 'erroDistancia'].forEach((id) => { $(id).textContent = ''; });
    }

    function openFlow(dist) {
        atual = { ...dist };
        showView('fluxo');
        renderStep();
    }

    function persistAtual() {
        distribuicoes = distribuicoes.map((d) => (d.id === atual.id ? { ...atual } : d));
        saveDist();
    }

    function validateStep() {
        clearStepErrors();
        let ok = true;
        if (!el.fHospital.value.trim()) {
            $('erroHospital').textContent = 'Informe o hospital de destino.';
            el.fHospital.classList.add('invalid'); ok = false;
        }
        if (!(Number(el.fVolume.value) > 0)) {
            $('erroVolume').textContent = 'Informe o volume.';
            el.fVolume.classList.add('invalid'); ok = false;
        }
        if (el.fDistancia.value !== '' && Number(el.fDistancia.value) < 0) {
            $('erroDistancia').textContent = 'Distância não pode ser negativa.';
            el.fDistancia.classList.add('invalid'); ok = false;
        }
        return ok;
    }

    function saveStepFields() {
        /* Só sobrescreve com valores válidos (ao voltar/sair com campo vazio, mantém o que já estava salvo). */
        if (el.fHospital.value.trim()) atual.hospital = el.fHospital.value.trim();
        if (Number(el.fVolume.value) > 0) atual.volume = Number(el.fVolume.value);
        if (el.fDistancia.value === '') atual.distancia = null;
        else if (Number(el.fDistancia.value) >= 0) atual.distancia = Number(el.fDistancia.value);
    }

    el.stepForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateStep()) return;

        saveStepFields();

        if (atual.etapa < ETAPAS.length) {
            atual.etapa += 1;
            persistAtual();
            renderStep();
        } else {
            atual.status = 'concluida';
            atual.concluidaEm = new Date().toISOString();
            persistAtual();
            renderList();
            showView('concluida');
        }
    });

    /* "Voltar para a lista": mantém a distribuição em andamento, sem perder a etapa atual. */
    el.btnVoltar.addEventListener('click', () => {
        if (atual && atual.status === 'andamento') { saveStepFields(); persistAtual(); }
        atual = null; renderList(); showView('lista');
    });

    /* Etapa anterior: guarda o que foi digitado e volta um passo. */
    el.btnEtapaAnterior.addEventListener('click', () => {
        if (!atual || atual.etapa <= 1) return;
        saveStepFields();
        atual.etapa -= 1;
        persistAtual();
        renderStep();
    });

    /* Cancelar: pergunta antes. "Continuar depois" preserva o andamento; só o botão vermelho cancela de verdade. */
    const closeCancelModal = () => { el.cancelModal.hidden = true; };
    el.btnCancelarFluxo.addEventListener('click', () => {
        el.cancelModal.hidden = false;
        el.btnContinuarDepois.focus();
    });
    el.btnContinuarDepois.addEventListener('click', () => {
        closeCancelModal();
        saveStepFields();
        persistAtual();
        atual = null;
        renderList();
        showView('lista');
    });
    el.btnConfirmCancel.addEventListener('click', () => {
        closeCancelModal();
        atual.status = 'cancelada';
        persistAtual();
        atual = null;
        renderList();
        showView('lista');
    });
    el.cancelModal.addEventListener('click', (e) => { if (e.target === el.cancelModal) closeCancelModal(); });
    el.btnVoltarConcluida.addEventListener('click', () => { atual = null; renderList(); showView('lista'); });

    el.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="view"]');
        if (!btn) return;
        const dist = distribuicoes.find((d) => d.id === btn.closest('tr').dataset.id);
        if (!dist) return;
        if (dist.status === 'concluida') {
            atual = { ...dist };
            renderResume();
            el.stepTitle.textContent = '';
            showView('concluida');
        } else if (dist.status === 'cancelada') {
            alert('Esta distribuição foi cancelada.');
        } else {
            openFlow(dist);
        }
    });

    /* ---------- Modal de nova distribuição ---------- */
    function openModal() {
        selLote.setItems(availableLotes().map((p) => ({ value: p.id, label: loteCodigo(p) })));
        selLote.setValue('');
        lastLote = '';
        el.distForm.reset();
        el.mFrascos.value = 1;
        el.mData.value = todayISO();
        ['erroLote', 'erroMVolume', 'erroMFrascos', 'erroMHospital'].forEach((id) => { $(id).textContent = ''; });
        el.modal.hidden = false;
        document.body.style.overflow = 'hidden';
        selLote.trigger.focus();
    }

    function closeModal() {
        selLote.close();
        el.modal.hidden = true;
        document.body.style.overflow = '';
    }

    /* Ao escolher o lote, já sugere o volume e a quantidade de frascos do processamento. */
    let lastLote = '';
    const onLotePick = () => setTimeout(() => {
        const lote = availableLotes().find((p) => p.id === selLote.getValue());
        if (!lote || lote.id === lastLote) return;
        lastLote = lote.id;
        el.mVolume.value = lote.volume || '';
        el.mFrascos.value = lote.frascos || 1;
    }, 0);
    $('selLote').addEventListener('click', onLotePick);
    $('selLote').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onLotePick(); });

    el.btnNova.addEventListener('click', openModal);
    el.btnFecharDist.addEventListener('click', closeModal);
    el.btnCancelarDist.addEventListener('click', closeModal);
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

    el.distForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let ok = true;
        const lote = availableLotes().find((p) => p.id === selLote.getValue());
        if (!lote) { $('erroLote').textContent = 'Selecione um lote.'; selLote.trigger.classList.add('invalid'); ok = false; }
        if (!(Number(el.mVolume.value) > 0)) { $('erroMVolume').textContent = 'Informe o volume.'; el.mVolume.classList.add('invalid'); ok = false; }
        if (!(Number(el.mFrascos.value) >= 1)) { $('erroMFrascos').textContent = 'Mínimo 1 frasco.'; el.mFrascos.classList.add('invalid'); ok = false; }
        if (!el.mHospital.value.trim()) { $('erroMHospital').textContent = 'Informe o local de entrega.'; el.mHospital.classList.add('invalid'); ok = false; }
        if (!ok) return;

        distribuicoes.unshift({
            id: crypto.randomUUID(),
            codigo: nextCodigo(),
            loteId: lote.id,
            loteCodigo: loteCodigo(lote),
            coletaCodigo: lote.coletaCodigo,
            doadoraNome: lote.doadoraNome,
            dataDistribuicao: el.mData.value || todayISO(),
            volume: Number(el.mVolume.value),
            frascos: Number(el.mFrascos.value),
            hospital: el.mHospital.value.trim(),
            distancia: el.mDistancia.value === '' ? null : Number(el.mDistancia.value),
            observacoes: el.mObs.value.trim(),
            etapa: 1,
            status: 'andamento',
            criadoEm: new Date().toISOString(),
        });

        saveDist();
        closeModal();
        renderList();
        openFlow(distribuicoes[0]);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!el.cancelModal.hidden) closeCancelModal();
        else if (!el.modal.hidden) closeModal();
    });

    renderList();
})();