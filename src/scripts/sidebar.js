document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const collapseDesktopBtn = document.getElementById('collapseDesktopBtn');
    const overlay = document.getElementById('sidebarOverlay');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const pageHeading = document.querySelector('.header-titles .main-heading');

    // Mapeamento de títulos para os links (sem criar novas páginas)
    const sectionTitles = {
        '#home': 'Nome do projeto / Banco de Leite humano',
        '#doadoras': 'Gestão de Doadoras / Banco de Leite',
        '#coletas': 'Controle de Coletas / Banco de Leite',
        '#processamento': 'Processamento de Leite / Lotes',
        '#distribuicao': 'Distribuição e Entregas / Banco de Leite',
        '#rastreabilidade': 'Rastreabilidade e Conformidade'
    };

    // Função para abrir a sidebar (mobile / telas pequenas)
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Função para fechar a sidebar (mobile)
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Alternar abertura no mobile
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    // Botão de fechar dentro da sidebar
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    // Fechar ao clicar no overlay escuro
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Recolher/expandir no Desktop
    if (collapseDesktopBtn) {
        collapseDesktopBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            document.querySelector('.dashboard-layout').classList.toggle('sidebar-is-collapsed');
        });
    }

    // Fechar ao pressionar a tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // Alternar item ativo e interatividade sem sair da página
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetHash = link.getAttribute('href');

            // Remover active de todos e adicionar ao clicado
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            // Atualiza dinamicamente o título caso exista mapeamento
            if (pageHeading && sectionTitles[targetHash]) {
                pageHeading.textContent = sectionTitles[targetHash];
            }

            // Fecha a sidebar no mobile após selecionar um item
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    // Ajuste suave caso a janela seja redimensionada
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
});
