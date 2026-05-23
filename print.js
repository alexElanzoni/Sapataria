// print.js
// Módulo especializado para impressão de cupons térmicos e relatórios

// ==================== CONFIGURAÇÕES DE IMPRESSÃO ====================
const PRINT_CONFIG = {
    // Modo de impressão: 'thermal' (58mm/80mm) ou 'a4' (folha comum)
    modo: 'thermal',
    
    // Largura da impressão térmica em mm (58 ou 80)
    larguraMM: 58,
    
    // Margens em mm (apenas para impressão normal)
    margens: {
        top: 5,
        bottom: 5,
        left: 5,
        right: 5
    },
    
    // Habilitar corte automático (requer suporte da impressora)
    corteAutomatico: true,
    
    // Número de cópias (1 para cupom cliente, 2 para via loja)
    copias: 1,
    
    // Caracteres por linha (aproximado para 58mm)
    colunas: 42
};

// ==================== FUNÇÕES AUXILIARES ====================
function centralizarTexto(texto, largura = PRINT_CONFIG.colunas) {
    const espacos = Math.max(0, (largura - texto.length) / 2);
    return ' '.repeat(Math.floor(espacos)) + texto;
}

function linhaSimples(char = '-', largura = PRINT_CONFIG.colunas) {
    return char.repeat(largura);
}

function linhaDupla(char = '=', largura = PRINT_CONFIG.colunas) {
    return char.repeat(largura);
}

// Formatar valor monetário para impressão
function formatarValorImpressao(valor) {
    return `R$ ${valor.toFixed(2)}`;
}

// ==================== GERAÇÃO DE HTML PARA IMPRESSÃO ====================
function gerarCupomHTML(os, cliente, copia = 'cliente') {
    const dataEmissao = new Date().toLocaleString('pt-BR');
    const tituloCopia = copia === 'cliente' ? 'CUPOM DO CLIENTE' : 'VIA LOJA - ARQUIVO';
    
    let html = `
        <div class="cupom-print">
            <div class="cabecalho">
                <div class="loja-nome">${CONFIG.nomeLoja || 'SAPATARIA CENTRAL'}</div>
                <div class="loja-endereco">${CONFIG.enderecoLoja || 'Rua dos Sapatos, 123'}</div>
                <div class="loja-telefone">Tel: ${CONFIG.telefoneLoja || '(11) 99999-9999'}</div>
                <div class="linha">${linhaSimples('=')}</div>
                <div class="tipo-cupom">${tituloCopia}</div>
                <div class="linha">${linhaSimples('-')}</div>
            </div>
            
            <div class="destaque">
                <div class="os-id">${os.id}</div>
                <div class="os-status">${os.status === 'entregue' ? 'PAGO E ENTREGUE' : (os.status === 'pronto' ? 'PRONTO PARA RETIRADA' : 'EM ANDAMENTO')}</div>
            </div>
            
            <div class="linha">${linhaSimples('-')}</div>
            
            <div class="cliente-info">
                <div><strong>Cliente:</strong> ${escapeHtml(cliente.nome)}</div>
                <div><strong>Telefone:</strong> ${escapeHtml(cliente.telefone)}</div>
                ${cliente.endereco ? `<div><strong>Endereço:</strong> ${escapeHtml(cliente.endereco)}</div>` : ''}
            </div>
            
            <div class="linha">${linhaSimples('-')}</div>
            
            <div class="servico-info">
                <div><strong>Objeto:</strong> ${os.tipoObjeto} (${os.quantidade}x)</div>
                ${os.caracteristicas ? `<div><strong>Características:</strong> ${escapeHtml(os.caracteristicas)}</div>` : ''}
                <div><strong>Serviço:</strong> ${escapeHtml(os.servico)}</div>
                <div><strong>Data entrada:</strong> ${formatarData(os.dataEntrada)}</div>
                <div><strong>Data retirada:</strong> ${formatarData(os.dataRetirada)}</div>
            </div>
            
            <div class="linha">${linhaSimples('-')}</div>
            
            <div class="valor">
                <strong>VALOR TOTAL:</strong> ${formatarValorImpressao(os.valor)}
            </div>
            
            ${os.pago ? `<div class="pagamento"><strong>Pagamento:</strong> ${os.metodoPagamento.toUpperCase()} - CONFIRMADO</div>` : '<div class="pagamento"><strong>Pagamento:</strong> A REALIZAR NA RETIRADA</div>'}
            
            <div class="linha">${linhaSimples('-')}</div>
            
            <div class="rodape">
                <div>⚠️ Guarde este cupom para retirar seu item.</div>
                <div>Apresente na loja junto com um documento.</div>
                <div class="linha">${linhaSimples('.')}</div>
                <div>Emitido em: ${dataEmissao}</div>
                <div>Assinatura do cliente: ___________________</div>
            </div>
        </div>
    `;
    
    return html;
}

// Gerar cupom para impressão (com múltiplas vias se necessário)
function gerarConteudoImpressao(osId) {
    const ordens = getOrdens();
    const os = ordens.find(o => o.id === osId);
    if (!os) return '<div class="erro">OS não encontrada</div>';
    
    const cliente = buscarClientePorId(os.clienteId);
    if (!cliente) return '<div class="erro">Cliente não encontrado</div>';
    
    let html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Cupom - ${os.id}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Courier New', 'Consolas', monospace;
                font-size: 10pt;
                line-height: 1.3;
                padding: 0;
                margin: 0;
                background: white;
            }
            .cupom-print {
                max-width: ${PRINT_CONFIG.larguraMM}mm;
                margin: 0 auto;
                padding: 2mm;
            }
            .cabecalho {
                text-align: center;
                margin-bottom: 8px;
            }
            .loja-nome {
                font-size: 14pt;
                font-weight: bold;
            }
            .loja-endereco, .loja-telefone {
                font-size: 9pt;
            }
            .tipo-cupom {
                font-size: 10pt;
                font-weight: bold;
                margin: 5px 0;
            }
            .destaque {
                text-align: center;
                margin: 10px 0;
            }
            .os-id {
                font-size: 16pt;
                font-weight: bold;
                letter-spacing: 2px;
                background: #f0f0f0;
                padding: 4px;
            }
            .os-status {
                font-size: 9pt;
                margin-top: 4px;
            }
            .cliente-info, .servico-info {
                margin: 8px 0;
            }
            .cliente-info div, .servico-info div {
                margin: 3px 0;
            }
            .valor {
                font-size: 14pt;
                font-weight: bold;
                text-align: center;
                margin: 10px 0;
            }
            .pagamento {
                text-align: center;
                margin: 8px 0;
            }
            .rodape {
                text-align: center;
                font-size: 8pt;
                margin-top: 12px;
            }
            .linha {
                font-family: monospace;
                white-space: pre;
                margin: 4px 0;
            }
            .erro {
                color: red;
                text-align: center;
                padding: 20px;
            }
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                }
                @page {
                    size: ${PRINT_CONFIG.larguraMM}mm auto;
                    margin: 0mm;
                }
            }
        </style>
    </head>
    <body>`;
    
    // Para múltiplas cópias (via cliente + via loja)
    const copias = PRINT_CONFIG.copias === 2 ? ['cliente', 'loja'] : ['cliente'];
    for (let i = 0; i < copias.length; i++) {
        if (i > 0) html += '<div style="page-break-before: avoid; margin-top: 10mm;">' + linhaSimples('=', 50) + '</div>';
        html += gerarCupomHTML(os, cliente, copias[i]);
    }
    
    // Instrução de corte automático (comentário CSS para impressoras que suportam)
    if (PRINT_CONFIG.corteAutomatico) {
        html += `\n<!-- Comando de corte: alguns drivers reconhecem -->\n`;
        html += `<div style="page-break-after: avoid;"></div>`;
    }
    
    html += `</body></html>`;
    return html;
}

// ==================== FUNÇÃO PRINCIPAL DE IMPRESSÃO ====================
function imprimirCupom(osId, silencioso = false) {
    if (!osId) {
        console.error('ID da OS não informado');
        return false;
    }
    
    const conteudo = gerarConteudoImpressao(osId);
    if (conteudo.includes('erro')) {
        alert('Erro ao gerar cupom: ' + (conteudo.match(/>(.*?)</)?.[1] || 'OS não encontrada'));
        return false;
    }
    
    // Abrir janela de impressão
    const win = window.open('', '_blank', 'width=400,height=600,toolbar=no,menubar=no,scrollbars=yes');
    if (!win) {
        alert('Por favor, permita pop-ups para imprimir o cupom.');
        return false;
    }
    
    win.document.write(conteudo);
    win.document.close();
    
    if (silencioso) {
        // Tenta imprimir silenciosamente (pode não funcionar em todos os navegadores)
        win.print();
        setTimeout(() => win.close(), 1000);
    } else {
        win.focus();
        win.print();
        // Não fecha automaticamente para o usuário ver o resultado
    }
    
    return true;
}

// ==================== IMPRESSÃO DE RELATÓRIOS ====================
function imprimirRelatorioDiario(data) {
    const relatorio = getRelatorioDiario(data);
    const dataStr = formatarData(data);
    
    let html = `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Relatório Diário - ${dataStr}</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        h1 { text-align: center; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        th { background: #f0f0f0; }
        @media print { body { margin: 0; } }
    </style>
    </head>
    <body>
        <h1>Relatório Diário - ${dataStr}</h1>
        <h2>Resumo Financeiro</h2>
        <p>Total Entradas: R$ ${relatorio.caixa.totalEntradas.toFixed(2)}</p>
        <p>Total Saídas: R$ ${relatorio.caixa.totalSaidas.toFixed(2)}</p>
        <p>Saldo: R$ ${relatorio.caixa.saldo.toFixed(2)}</p>
        <h2>Ordens Pagas</h2>
        <table><tr><th>OS</th><th>Cliente</th><th>Serviço</th><th>Valor</th></tr>`;
    
    relatorio.ordensPagas.forEach(os => {
        const cliente = buscarClientePorId(os.clienteId);
        html += `<tr><td>${os.id}</td><td>${cliente?.nome || 'N/A'}</td><td>${os.servico.substring(0, 40)}</td><td>R$ ${os.valor.toFixed(2)}</td></tr>`;
    });
    
    html += `</table></body></html>`;
    
    const win = window.open();
    win.document.write(html);
    win.print();
}

// ==================== EXPOR FUNÇÕES ====================
window.imprimirCupom = imprimirCupom;
window.imprimirRelatorioDiario = imprimirRelatorioDiario;
window.PRINT_CONFIG = PRINT_CONFIG;