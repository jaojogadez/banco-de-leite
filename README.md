<div align="center">

# 💧 BLHM Care

### Sistema de Controle para Bancos de Leite Humano

Acompanhe o caminho do leite humano doado, da **doadora** até o **hospital**, em uma interface simples, rápida e feita 100% com **HTML, CSS e JavaScript puro**.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-zero-4fb3a9?style=for-the-badge)

</div>

---

## 📖 Sobre o projeto

O **BLHM Care** é um sistema web para organizar a rotina de um Banco de Leite Humano. Ele cobre o ciclo completo do leite doado:

```
Doadora  →  Coleta  →  Processamento  →  Distribuição
```

Cada etapa tem a sua tela, e os dados fluem de uma para a próxima. Uma coleta conferida vira lote de processamento. Um lote com as 5 etapas concluídas fica disponível para distribuição. Assim o fluxo respeita a ordem real do trabalho no banco de leite.

> O projeto não usa frameworks, bibliotecas nem backend. Os dados ficam salvos no `localStorage` do navegador.

---

## ✨ Funcionalidades

### 🏠 Dashboard
- Visão geral com cards de métricas (Coletas, Processamento, Distribuições e Concluídos)
- Tabela de atividades recentes
- Menu lateral recolhível no desktop e com overlay no mobile

### 👩 Doadoras
- Cadastro, edição e exclusão com confirmação
- Máscaras automáticas de **CPF** e **telefone**
- Validação de CPF (dígitos verificadores) e bloqueio de CPF duplicado
- Cards de resumo: total de doadoras e doadoras editadas

### 🍼 Coletas
- Registro de coleta com doadora, datas, volume, frascos e conferência
- **Tipo do leite** escolhido pela pessoa: *Colostro*, *Transição* ou *Maduro*
- Conferência do frasco: identificação correta, materiais estranhos e condição do recipiente
- Coletas com inconformidade ficam **aguardando conferência** e não seguem para o processamento
- Busca por código, doadora ou classificação
- Visualizar, editar e excluir

### ⚗️ Processamento
- Cada coleta conferida vira um **lote** (`L-C-0464`)
- Acompanhamento em 5 etapas:
  1. Seleção do leite
  2. Descongelamento
  3. Pasteurização
  4. Controle de qualidade
  5. Pronto para distribuição
- Data e hora registradas em cada etapa concluída, com possibilidade de desfazer a última
- Ao concluir a última etapa, a tela volta para a lista com aviso visual e destaque no lote finalizado

### 🚚 Distribuição
- Nova distribuição a partir de um lote pronto (`D-001`, `D-002`...)
- Fluxo em 3 etapas: **Saída → A caminho → Concluído**
- Navegação entre etapas, com botão *Etapa anterior* a partir da etapa 2
- Cancelamento com confirmação: *Continuar depois* preserva o andamento, e só *Cancelar distribuição* encerra de vez
- Cards de distribuições concluídas e canceladas

---

## 🔄 Como os dados se conectam

| De | Para | Regra |
|----|------|-------|
| Doadora | Coleta | A coleta usa as doadoras cadastradas |
| Coleta | Processamento | Só entram coletas **sem inconformidade** e ainda não processadas |
| Processamento | Distribuição | Só entram lotes com as **5 etapas concluídas** e ainda sem distribuição |

---

## 🗂️ Estrutura de pastas

```
banco-de-leite/
├── index.html                  # Dashboard (Home)
├── pages/
│   ├── doadoras.html
│   ├── coletas.html
│   ├── processamento.html
│   └── distribuicao.html
└── src/
    ├── styles/
    │   ├── index.css           # Importa os demais estilos
    │   ├── geral.css
    │   └── dashboard.css
    ├── scripts/
    │   ├── sidebar.js          # Menu lateral (recolher, abrir, fechar)
    │   ├── doadoras.js
    │   ├── coletas.js
    │   ├── processamento.js
    │   ├── distribuicao.js
    │   └── utils/
    │       └── select.js       # Dropdown customizado reutilizável
    └── assets/                 # Imagens e ícones
```

---

## 🚀 Como rodar

Não há nada para instalar. Basta servir os arquivos estaticamente.

**Opção 1: VS Code / Codespaces**
1. Instale a extensão **Live Server**
2. Clique com o botão direito em `index.html` e escolha **Open with Live Server**

**Opção 2: terminal**
```bash
# na raiz do projeto
python3 -m http.server 5500
# acesse http://localhost:5500
```

> Abrir o `index.html` direto no navegador (`file://`) também costuma funcionar, mas um servidor local é mais seguro para os caminhos relativos.

---

## 💾 Dados e armazenamento

Tudo é salvo no `localStorage`, nestas chaves:

| Chave | Conteúdo |
|-------|----------|
| `blhm:doadoras` | Cadastro de doadoras |
| `blhm:doadoras:editadas` | Contador de doadoras editadas |
| `blhm:coletas` | Coletas registradas |
| `blhm:processamentos` | Lotes e datas de cada etapa |
| `blhm:distribuicoes` | Distribuições e etapa atual |

Para **limpar os dados de teste**, abra o console do navegador (`F12`) e rode:

```js
localStorage.clear();
location.reload();
```

> ⚠️ Como os dados ficam só no navegador, eles não são compartilhados entre computadores nem sobrevivem à limpeza de dados do navegador.

---

## 🎨 Design

- Layout criado no **Figma** e implementado fielmente em CSS puro
- Paleta com **dourado** nos títulos, **verde-água** nas ações e **marrom escuro** no menu lateral
- Responsivo, com menu lateral que vira gaveta no mobile
- Componentes reutilizados entre as telas: modais, dropdowns, selos de status e cards de métricas

---

## 🛣️ Próximos passos

- [ ] Ligar os cards do dashboard aos dados reais
- [ ] Tela de **Rastreabilidade** do lote, da doadora até o hospital
- [ ] Permitir reabrir distribuições canceladas
- [ ] Exportar relatórios (PDF/CSV)
- [ ] Backend e banco de dados para uso multiusuário

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça o commit: `git commit -m "feat: minha feature"`
4. Envie: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

<div align="center">

Feito com 💛 para apoiar a doação de leite humano.

</div>
