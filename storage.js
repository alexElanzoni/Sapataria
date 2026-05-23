// storage.js - Versão final com todas as funções de caixa e apuração
console.log('storage.js carregado');

function initStorage() {
    if (!localStorage.getItem('clientes')) localStorage.setItem('clientes', JSON.stringify([]));
    if (!localStorage.getItem('ordens')) localStorage.setItem('ordens', JSON.stringify([]));
    if (!localStorage.getItem('caixa')) localStorage.setItem('caixa', JSON.stringify([]));
    if (!localStorage.getItem('estoque')) localStorage.setItem('estoque', JSON.stringify([]));
    if (!localStorage.getItem('ultimoIdOS')) localStorage.setItem('ultimoIdOS', '0');
}

// ==================== CLIENTES ====================
function getClientes() { return JSON.parse(localStorage.getItem('clientes')) || []; }
function saveClientes(c) { localStorage.setItem('clientes', JSON.stringify(c)); }
function adicionarCliente(c) {
    const cli = getClientes();
    const n = { id: crypto.randomUUID?.()||'id-'+Date.now(), nome: c.nome, telefone: c.telefone, endereco: c.endereco, dataCadastro: new Date().toISOString() };
    cli.push(n); saveClientes(cli); return n;
}
function atualizarCliente(id, dados) {
    const cli = getClientes(); const idx = cli.findIndex(c=>c.id===id);
    if(idx!==-1){ cli[idx]={...cli[idx],...dados}; saveClientes(cli); return true; }
    return false;
}
function buscarClientePorId(id) { return getClientes().find(c=>c.id===id); }
function buscarClientes(termo) {
    const c = getClientes(); if(!termo) return c;
    termo=termo.toLowerCase(); return c.filter(c=>c.nome.toLowerCase().includes(termo)||c.telefone.includes(termo));
}

// ==================== ORDENS DE SERVIÇO ====================
function getOrdens() {
    let ordens = JSON.parse(localStorage.getItem('ordens')) || [];
    ordens = ordens.map(os => {
        if (!os.itens) {
            os.itens = [{
                id: crypto.randomUUID?.()||'item-'+Date.now(),
                tipoObjeto: os.tipoObjeto || 'outro',
                tipoPersonalizado: '',
                quantidade: os.quantidade || 1,
                caracteristicas: os.caracteristicas || '',
                servicoItem: os.servico || '',
                valorItem: os.valor || 0,
                status: 'ativo'
            }];
            delete os.tipoObjeto; delete os.quantidade; delete os.caracteristicas;
        }
        os.itens.forEach(i => { if(!i.status) i.status='ativo'; if(!i.id) i.id=crypto.randomUUID?.()||'item-'+Date.now(); });
        os.valor = os.itens.filter(i=>i.status==='ativo').reduce((s,i)=>s+(i.valorItem||0),0);
        return os;
    });
    return ordens;
}
function saveOrdens(o) { localStorage.setItem('ordens', JSON.stringify(o)); }
function getProximoIdOS() { let u = parseInt(localStorage.getItem('ultimoIdOS'))||0; u++; localStorage.setItem('ultimoIdOS',u); return `OS-${u.toString().padStart(4,'0')}`; }
function adicionarOrdem(os) {
    const ord = getOrdens();
    const nova = {
        id: getProximoIdOS(),
        clienteId: os.clienteId,
        itens: os.itens.map(i=>({...i, id: crypto.randomUUID?.()||'item-'+Date.now(), status:'ativo'})),
        valor: os.itens.reduce((s,i)=>s+(i.valorItem||0),0),
        dataEntrada: os.dataEntrada||new Date().toISOString(),
        dataRetirada: os.dataRetirada,
        status: 'em_andamento',
        metodoPagamento: null,
        pago: false
    };
    ord.push(nova); saveOrdens(ord); return nova;
}
function atualizarOrdem(id, att) { const ord=getOrdens(); const idx=ord.findIndex(o=>o.id===id); if(idx!==-1){ ord[idx]={...ord[idx],...att}; saveOrdens(ord); return true; } return false; }
function marcarPronto(id) { return atualizarOrdem(id, {status:'pronto'}); }
function darBaixa(id, metodo) {
    const ord = getOrdens(); const idx = ord.findIndex(o=>o.id===id);
    if(idx!==-1 && ord[idx].status!=='entregue'){
        ord[idx].status='entregue'; ord[idx].metodoPagamento=metodo; ord[idx].pago=true;
        saveOrdens(ord);
        registrarEntradaCaixa({valor:ord[idx].valor, metodoPagamento:metodo, descricao:`Pagamento OS ${id}`, osId:id});
        return true;
    }
    return false;
}
function getOrdensPorCliente(clienteId) { return getOrdens().filter(o=>o.clienteId===clienteId); }
function getOrdensParaEntregarHoje() {
    const hoje = new Date().toISOString().slice(0,10);
    return getOrdens().filter(o=>o.status!=='entregue'&&o.status!=='cancelada'&&new Date(o.dataRetirada).toISOString().slice(0,10)===hoje);
}
function getOrdensAtrasadas() {
    const hoje = new Date().toISOString().slice(0,10);
    return getOrdens().filter(o=>o.status!=='entregue'&&o.status!=='cancelada'&&new Date(o.dataRetirada).toISOString().slice(0,10)<hoje);
}

// ==================== CAIXA (com apuração correta) ====================
function getLancamentosCaixa() { return JSON.parse(localStorage.getItem('caixa'))||[]; }
function saveLancamentosCaixa(l) { localStorage.setItem('caixa', JSON.stringify(l)); }
function registrarEntradaCaixa({valor, metodoPagamento, descricao, osId}) {
    const l = getLancamentosCaixa();
    l.push({id:crypto.randomUUID?.()||'id-'+Date.now(), tipo:'entrada', valor:Number(valor), descricao, metodoPagamento, data:new Date().toISOString(), osId:osId||null});
    saveLancamentosCaixa(l);
}
function registrarSaidaCaixa({valor, metodoPagamento, descricao}) {
    const l = getLancamentosCaixa();
    l.push({id:crypto.randomUUID?.()||'id-'+Date.now(), tipo:'saida', valor:Number(valor), descricao, metodoPagamento, data:new Date().toISOString(), osId:null});
    saveLancamentosCaixa(l);
}
// Apuração do dia: recebe objeto Date
function getApuraçãoDia(data) {
    const dataStr = data.toISOString().slice(0,10);
    const lancamentos = getLancamentosCaixa();
    const doDia = lancamentos.filter(l => l.data.slice(0,10) === dataStr);
    let totalEntradas = 0, totalSaidas = 0;
    let porMetodo = { pix:0, debito:0, credito:0, especie:0 };
    doDia.forEach(l => {
        if(l.tipo === 'entrada') {
            totalEntradas += l.valor;
            if(porMetodo[l.metodoPagamento] !== undefined) porMetodo[l.metodoPagamento] += l.valor;
        } else {
            totalSaidas += l.valor;
        }
    });
    return { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas, porMetodo, lancamentos: doDia };
}
// Apuração do mês: recebe mês (0-11) e ano
function getApuraçãoMes(mes, ano) {
    const lancamentos = getLancamentosCaixa();
    const filtrados = lancamentos.filter(l => {
        const d = new Date(l.data);
        return d.getMonth() === mes && d.getFullYear() === ano;
    });
    let totalEntradas = 0, totalSaidas = 0;
    let porMetodo = { pix:0, debito:0, credito:0, especie:0 };
    filtrados.forEach(l => {
        if(l.tipo === 'entrada') {
            totalEntradas += l.valor;
            if(porMetodo[l.metodoPagamento] !== undefined) porMetodo[l.metodoPagamento] += l.valor;
        } else {
            totalSaidas += l.valor;
        }
    });
    return { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas, porMetodo, lancamentos: filtrados };
}

// ==================== RELATÓRIOS ====================
function getRelatorioDiario(data) {
    const dataStr = data.toISOString().slice(0,10);
    const ordens = getOrdens().filter(o => o.pago && new Date(o.dataEntrada).toISOString().slice(0,10) === dataStr);
    const caixa = getApuraçãoDia(data);
    return { data: dataStr, ordensPagas: ordens, caixa };
}
function getRelatorioMensal(mes, ano) {
    const ordens = getOrdens().filter(o => o.pago && new Date(o.dataEntrada).getMonth() === mes && new Date(o.dataEntrada).getFullYear() === ano);
    const caixa = getApuraçãoMes(mes, ano);
    return { mes, ano, ordensPagas: ordens, caixa };
}

// ==================== ESTOQUE ====================
function getEstoque() { return JSON.parse(localStorage.getItem('estoque'))||[]; }
function saveEstoque(e) { localStorage.setItem('estoque', JSON.stringify(e)); }
function adicionarItemEstoque(item) {
    const e=getEstoque(); const novo={ id:crypto.randomUUID?.()||'id-'+Date.now(), nome:item.nome, quantidade:Number(item.quantidade), unidade:item.unidade, descricao:item.descricao||'' }; e.push(novo); saveEstoque(e); return novo;
}
function atualizarQuantidadeEstoque(id, novaQtd) {
    const e=getEstoque(); const i=e.findIndex(i=>i.id===id); if(i!==-1){ e[i].quantidade=Number(novaQtd); saveEstoque(e); return true; } return false;
}
// Adicione no final do storage.js, antes do initStorage()

// ==================== HISTÓRICO DE ESTOQUE (movimentações) ====================
function getHistoricoEstoque() {
    return JSON.parse(localStorage.getItem('historico_estoque')) || [];
}
function saveHistoricoEstoque(h) {
    localStorage.setItem('historico_estoque', JSON.stringify(h));
}
function registrarMovimentacaoEstoque({itemId, itemNome, quantidade, tipo, observacao}) {
    const hist = getHistoricoEstoque();
    hist.push({
        id: crypto.randomUUID?.() || 'mov-'+Date.now(),
        itemId,
        itemNome,
        quantidade: Number(quantidade),
        tipo, // 'saida' (baixa) ou 'entrada' (reposição)
        observacao: observacao || '',
        data: new Date().toISOString()
    });
    saveHistoricoEstoque(hist);
}
// Sobrescrever a função darBaixaEstoque original para registrar no histórico
// Se já existir, modifique-a:
function darBaixaEstoque(id, quantidadeBaixa, observacao = '') {
    const estoque = getEstoque();
    const index = estoque.findIndex(i => i.id === id);
    if (index !== -1) {
        const novaQtd = estoque[index].quantidade - Number(quantidadeBaixa);
        if (novaQtd < 0) return false;
        estoque[index].quantidade = novaQtd;
        saveEstoque(estoque);
        // Registrar movimentação
        registrarMovimentacaoEstoque({
            itemId: id,
            itemNome: estoque[index].nome,
            quantidade: quantidadeBaixa,
            tipo: 'saida',
            observacao
        });
        return true;
    }
    return false;
}
// Função para obter relatório de movimentações por período
function getRelatorioMovimentacoesEstoque(tipoPeriodo, valor) {
    const hist = getHistoricoEstoque();
    const agora = new Date();
    let dataInicio;
    if (tipoPeriodo === 'semana') {
        dataInicio = new Date(agora);
        dataInicio.setDate(agora.getDate() - 7);
    } else if (tipoPeriodo === 'mes') {
        dataInicio = new Date(agora);
        dataInicio.setMonth(agora.getMonth() - 1);
    } else if (tipoPeriodo === 'personalizado') {
        dataInicio = new Date(valor);
    }
    const movimentacoes = hist.filter(m => new Date(m.data) >= dataInicio);
    // Agrupar por item
    const resumo = {};
    movimentacoes.forEach(m => {
        if (!resumo[m.itemId]) {
            resumo[m.itemId] = {
                nome: m.itemNome,
                saidas: 0,
                entradas: 0
            };
        }
        if (m.tipo === 'saida') resumo[m.itemId].saidas += m.quantidade;
        else resumo[m.itemId].entradas += m.quantidade;
    });
    // Adicionar estoque atual
    const estoqueAtual = getEstoque();
    for (const item of estoqueAtual) {
        if (!resumo[item.id]) {
            resumo[item.id] = {
                nome: item.nome,
                saidas: 0,
                entradas: 0
            };
        }
        resumo[item.id].estoqueAtual = item.quantidade;
    }
    return { movimentacoes, resumo: Object.values(resumo) };
}
initStorage();
console.log('storage.js inicializado');