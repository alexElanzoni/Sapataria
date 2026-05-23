// app.js
// Lógica principal e utilitários globais do sistema

// ==================== CONFIGURAÇÕES ====================
const CONFIG = {
    nomeLoja: "SAPATARIA CENTRAL",
    telefoneLoja: "(11) 99999-9999",
    enderecoLoja: "Rua dos Sapatos, 123 - Centro"
};

// ==================== UTILITÁRIOS ====================
function formatarData(dataISO, comHoras = false) {
    if (!dataISO) return '—';
    const data = new Date(dataISO);
    if (comHoras) return data.toLocaleString('pt-BR');
    return data.toLocaleDateString('pt-BR');
}

function formatarMoeda(valor) {
    return `R$ ${valor.toFixed(2)}`;
}

function escapeHtml(texto) {
    if (!texto) return '';
    return texto.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function gerarUUID() {
    return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36);
}

// ==================== NOTIFICAÇÕES ====================
function criarContainerNotificacoes() {
    let container = document.getElementById('notificacao-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificacao-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }
    return container;
}

function mostrarNotificacao(mensagem, tipo = 'info', duracao = 5000) {
    const container = criarContainerNotificacoes();
    const notif = document.createElement('div');
    const cores = { sucesso: '#d4edda', erro: '#f8d7da', alerta: '#fff3cd', info: '#d1ecf1' };
    const bordas = { sucesso: '#28a745', erro: '#dc3545', alerta: '#ffc107', info: '#17a2b8' };
    notif.style.cssText = `
        background: ${cores[tipo] || cores.info};
        border-left: 4px solid ${bordas[tipo] || bordas.info};
        padding: 12px 15px;
        border-radius: 6px;
        font-size: 0.9rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
        cursor: pointer;
    `;
    notif.innerHTML = mensagem;
    notif.onclick = () => notif.remove();
    container.appendChild(notif);
    setTimeout(() => { if (notif.parentNode) notif.remove(); }, duracao);
}

// Adicionar animação CSS
const styleNotif = document.createElement('style');
styleNotif.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(styleNotif);

// ==================== VERIFICAÇÃO DE ORDENS PENDENTES ====================
function verificarOrdensPendentes() {
    const ordensHoje = getOrdensParaEntregarHoje();
    if (ordensHoje.length > 0) {
        mostrarNotificacao(`⚠️ Você tem ${ordensHoje.length} OS(s) para entregar hoje!`, 'alerta', 8000);
    }
    const ordensAtrasadas = getOrdensAtrasadas();
    if (ordensAtrasadas.length > 0) {
        mostrarNotificacao(`⚠️ Atenção: ${ordensAtrasadas.length} OS(s) estão atrasadas!`, 'erro', 8000);
    }
}

// ==================== RELÓGIO AO VIVO ====================
function atualizarRelogio() {
    const relogioEl = document.getElementById('relogio');
    if (relogioEl) {
        relogioEl.textContent = new Date().toLocaleString('pt-BR');
    }
}
function iniciarRelogio() {
    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);
}

// ==================== BOTÃO VOLTAR GLOBAL ====================
function adicionarBotaoVoltar() {
    // Não adicionar na página inicial (index.html) nem na página de cupom (impressão)
    const path = window.location.pathname;
    if (path.includes('index.html') || path.includes('cupom.html')) return;
    
    // Evitar duplicidade
    if (document.getElementById('global-voltar-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'global-voltar-btn';
    btn.innerHTML = '← Voltar';
    btn.className = 'btn btn-secondary';
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        padding: 8px 16px;
        font-size: 0.9rem;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    btn.onclick = () => history.back();
    document.body.appendChild(btn);
}

// ==================== BOTÃO TOPO ====================
function adicionarBotaoTopo() {
    if (document.getElementById('btn-topo')) return;
    const btnTopo = document.createElement('button');
    btnTopo.id = 'btn-topo';
    btnTopo.innerHTML = '⬆️';
    btnTopo.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1abc9c;
        color: white;
        border: none;
        border-radius: 50%;
        width: 45px;
        height: 45px;
        font-size: 1.5rem;
        cursor: pointer;
        display: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
    `;
    btnTopo.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(btnTopo);
    window.addEventListener('scroll', () => {
        btnTopo.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });
}

// ==================== INICIALIZAÇÃO GLOBAL ====================
function initSistema() {
    initStorage();
    
    // Verificar pendências (exceto na página de cupom)
    if (!window.location.pathname.includes('cupom.html')) {
        setTimeout(verificarOrdensPendentes, 500);
    }
    
    // Adicionar relógio no header se existir
    const headers = document.querySelectorAll('.header');
    headers.forEach(header => {
        if (!document.getElementById('relogio')) {
            const relogioSpan = document.createElement('span');
            relogioSpan.id = 'relogio';
            relogioSpan.style.cssText = 'float: right; font-size: 0.8rem; margin-top: 5px;';
            const titulo = header.querySelector('h1');
            if (titulo) {
                titulo.style.display = 'inline-block';
                titulo.parentNode.insertBefore(relogioSpan, titulo.nextSibling);
            } else {
                header.appendChild(relogioSpan);
            }
            iniciarRelogio();
        }
    });
    
    adicionarBotaoVoltar();
    adicionarBotaoTopo();
}

// Expor funções globais
window.formatarData = formatarData;
window.formatarMoeda = formatarMoeda;
window.escapeHtml = escapeHtml;
window.mostrarNotificacao = mostrarNotificacao;
window.CONFIG = CONFIG;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initSistema);