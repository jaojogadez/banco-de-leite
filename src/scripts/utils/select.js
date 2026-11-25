(() => {
    const escapeHtml = (s) =>
        String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    window.createSelect = function createSelect(root, { pill = false, emptyText = 'Nenhuma opção disponível' } = {}) {
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
                menu.innerHTML = `<li class="select-empty">${escapeHtml(emptyText)}</li>`;
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
            const item = items.find((i) => i.value === v);
            value = item ? item.value : '';
            label.textContent = item ? item.label : placeholder;
            root.classList.toggle('has-value', Boolean(item));
            renderMenu();
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
    };
})();