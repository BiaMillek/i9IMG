'use strict';

// ========== DADOS PADRÃO (EQUIPAMENTOS + ESTOQUE) ==========
const DEFAULT_DATA = {
  equipamentos: {
    'EL-001': {
      nome: 'Elevador EL-001 Mistura 90',
      tipo: 'elevador',
      parametros: {
        capacidade_tph: 160,
        altura_m: 20.6,
        densidade_tpm: 1.11,
        velocidade_ms: 1.525,
        n_fileiras: 1,
        CF1: 0.754,
        CF2: 1,
        passo_mm: 310
      },
      componentes: {
        motor: { modelo: 'V10 2 1:37,26 BGA 180M 30HP', potencia_cv: 30, polos: 4, rpm: 1770 },
        correia: { modelo: 'Poliplás 22" 4PN3000', largura_mm: 620, tensao_admissivel_kgf_cm: 33, lonas: 4 },
        caneca: { volume_litros: 11.99, passo_mm: 310, largura_mm: 500 },
        tambor_motriz: { diametro_mm: 620, largura_mm: 710 },
        eixo_motriz: { diametro_mm: 140, comprimento_mm: 1780 }
      },
      criado_em: '2024-01-01'
    },
    'PN-001': {
      nome: 'Peneira PN-001 Malha 10',
      tipo: 'peneira',
      parametros: {
        alimentacao_m3h: 160,
        densidade_tpm: 1.0,
        malha_mm: 10,
        diametro_cesto_m: 1.25,
        comprimento_cesto_m: 2.9
      },
      componentes: {
        motorredutor: { modelo: 'N09 3 1:109,7 BGA 112M 6HP', potencia_cv: 6, reducao: 103 },
        tela: { abertura_mm: 10, material: 'INOX 304', dimensoes: '1000x2000mm' }
      },
      criado_em: '2024-01-01'
    },
    'TP-001': {
      nome: 'Transportador TP-001',
      tipo: 'transportador',
      parametros: {
        capacidade_tph: 177.7,
        comprimento_m: 15,
        densidade_tpm: 1.11,
        inclinacao_graus: 0,
        velocidade_ms: 1.5
      },
      componentes: {
        motor: { potencia_cv: 7.5, polos: 4 },
        correia: { largura_mm: 600, lonas: 2 }
      },
      criado_em: '2024-01-01'
    }
  },
  proximo_id: { elevador: 4, transportador: 2, peneira: 3, moinho: 2 }
};

const STORAGE_KEY = 'mistura90_v4';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let DATA = loadData();
let currentModule = 'configurador';
let currentId = 'CONFIG';
let deleteCallback = null;

// ========== UTILITÁRIOS ==========
function round(v, dec) { return Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec); }
function fmt(v, dec = 2) { if (v == null || isNaN(v)) return '—'; return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

function confirmDelete(msg, cb) {
  document.getElementById('modalBody').textContent = msg;
  document.getElementById('modalBackdrop').classList.add('show');
  deleteCallback = cb;
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function initCollapse() {
  document.querySelectorAll('.section-card-header').forEach(h => {
    h.addEventListener('click', () => {
      h.classList.toggle('open');
      h.nextElementSibling?.classList.toggle('open');
    });
  });
  const first = document.querySelector('.section-card-header');
  if (first) { first.classList.add('open'); first.nextElementSibling?.classList.add('open'); }
}

// ========== NAVEGAÇÃO ==========
function navigate(module, id) {
  currentModule = module;
  currentId = id;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.module === module && el.dataset.id === id);
  });
  const titles = {
    ESTOQUE: '📦 Equipamentos Cadastrados',
    CONFIG: '⚙️ Configurador Paramétrico',
    CADASTRO: '➕ Novo Equipamento',
    COMP: '🧩 Verificar Compatibilidade'
  };
  document.getElementById('topbarTitle').textContent = titles[id] || id;
  renderContent();
  closeSidebar();
}

function renderContent() {
  const el = document.getElementById('content');
  el.innerHTML = '';
  el.className = 'content fade-in';
  if (currentModule === 'estoque') renderEstoque(el);
  else if (currentModule === 'configurador') renderConfigurador(el);
  else if (currentModule === 'cadastro') renderCadastroEquipamento(el);
  else if (currentModule === 'compatibilidade') renderCompatibilidade(el);
  initCollapse();
}

// ========== TELA: LISTA DE EQUIPAMENTOS CADASTRADOS ==========
function renderEstoque(root) {
  const equipamentos = DATA.equipamentos;
  let html = `
    <div class="module-header">
      <div class="module-badge">📦 Estoque</div>
      <div class="module-title">Equipamentos Cadastrados</div>
      <div class="module-desc">Lista de todos os equipamentos disponíveis no sistema</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Capacidade (t/h)</th><th>Motor (cv)</th><th>Ações</th></tr></thead>
        <tbody>
  `;
  for (const [id, eq] of Object.entries(equipamentos)) {
    const cap = eq.parametros?.capacidade_tph || eq.parametros?.alimentacao_m3h || '—';
    const motor = eq.componentes?.motor?.potencia_cv || eq.componentes?.motorredutor?.potencia_cv || '—';
    html += `
      <tr>
        <td data-label="ID">${id}</td>
        <td data-label="Nome">${eq.nome}</td>
        <td data-label="Tipo">${eq.tipo}</td>
        <td data-label="Capacidade">${cap}</td>
        <td data-label="Motor">${motor}</td>
        <td data-label="Ações"><button class="btn-del" onclick="excluirEquipamento('${id}')">✕ Excluir</button></td>
      </tr>
    `;
  }
  html += `</tbody></table></div>`;
  root.innerHTML = html;
}

window.excluirEquipamento = function(id) {
  confirmDelete(`Excluir equipamento ${id} permanentemente?`, () => {
    delete DATA.equipamentos[id];
    saveData(DATA);
    renderEstoque(document.getElementById('content'));
    showToast('Equipamento excluído', 'success');
  });
};

// ========== TELA: CONFIGURADOR PARAMÉTRICO ==========
function renderConfigurador(root) {
  root.innerHTML = `
    <div class="module-header">
      <div class="module-badge">⚙️ Configurador Paramétrico</div>
      <div class="module-title">Dimensione um novo equipamento</div>
      <div class="module-desc">Informe os parâmetros desejados. O sistema calculará as especificações e verificará compatibilidade com equipamentos existentes.</div>
    </div>
    <div class="section-card">
      <div class="section-card-header open">
        <div class="section-title">1. Tipo de equipamento</div>
        <span class="section-chevron">▼</span>
      </div>
      <div class="section-card-body open">
        <div class="form-grid">
          <div class="form-group">
            <label>Tipo</label>
            <select id="cfg_tipo">
              <option value="elevador">Elevador de canecas</option>
              <option value="transportador">Transportador de correia</option>
              <option value="peneira">Peneira rotativa</option>
              <option value="moinho">Moinho de facas</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-header open">
        <div class="section-title">2. Parâmetros de projeto</div>
        <span class="section-chevron">▼</span>
      </div>
      <div class="section-card-body open" id="cfg_params_panel"></div>
    </div>
    <div class="section-card">
      <div class="section-card-header open">
        <div class="section-title">3. Resultado do dimensionamento</div>
        <span class="section-chevron">▼</span>
      </div>
      <div class="section-card-body open" id="cfg_resultado"></div>
    </div>
  `;
  const tipoSelect = document.getElementById('cfg_tipo');
  const paramsPanel = document.getElementById('cfg_params_panel');
  const resultadoDiv = document.getElementById('cfg_resultado');

  function atualizarCampos() {
    const tipo = tipoSelect.value;
    if (tipo === 'elevador') {
      paramsPanel.innerHTML = `
        <div class="form-grid">
          <div class="form-group"><label>Capacidade desejada (t/h)</label><input type="number" id="cap" step="10" value="150"></div>
          <div class="form-group"><label>Altura de elevação (m)</label><input type="number" id="altura" step="1" value="20"></div>
          <div class="form-group"><label>Densidade do material (t/m³)</label><input type="number" id="dens" step="0.05" value="0.75"></div>
          <div class="form-group"><label>Velocidade da correia (m/s)</label><input type="number" id="vel" step="0.1" value="1.5"></div>
          <div class="form-group"><label>Número de fileiras (n)</label><input type="number" id="n" step="1" value="1"></div>
          <div class="form-group"><label>Coef. enchimento (CF1)</label><input type="number" id="cf1" step="0.01" value="0.75"></div>
          <div class="form-group"><label>Passo da caneca (mm) - padrão 350</label><input type="number" id="passo" step="10" value="350"></div>
        </div>
        <button class="btn-save" id="btnDimensionar" style="margin-top:16px">🔧 Dimensionar</button>
      `;
    } else if (tipo === 'transportador') {
      paramsPanel.innerHTML = `
        <div class="form-grid">
          <div class="form-group"><label>Capacidade (t/h)</label><input type="number" id="cap" step="10" value="200"></div>
          <div class="form-group"><label>Comprimento (m)</label><input type="number" id="comp" step="5" value="25"></div>
          <div class="form-group"><label>Densidade (t/m³)</label><input type="number" id="dens" step="0.05" value="1.1"></div>
          <div class="form-group"><label>Inclinação (graus)</label><input type="number" id="incl" step="1" value="0"></div>
          <div class="form-group"><label>Velocidade (m/s)</label><input type="number" id="vel" step="0.1" value="1.5"></div>
        </div>
        <button class="btn-save" id="btnDimensionar" style="margin-top:16px">🔧 Dimensionar</button>
      `;
    } else if (tipo === 'peneira') {
      paramsPanel.innerHTML = `
        <div class="form-grid">
          <div class="form-group"><label>Alimentação (m³/h)</label><input type="number" id="alim" step="10" value="180"></div>
          <div class="form-group"><label>Densidade (t/m³)</label><input type="number" id="dens" step="0.05" value="1.0"></div>
          <div class="form-group"><label>Abertura da malha (mm)</label><input type="number" id="malha" step="1" value="10"></div>
          <div class="form-group"><label>Diâmetro do cesto (m)</label><input type="number" id="diam" step="0.1" value="1.3"></div>
          <div class="form-group"><label>Comprimento do cesto (m)</label><input type="number" id="compr" step="0.1" value="3.0"></div>
        </div>
        <button class="btn-save" id="btnDimensionar" style="margin-top:16px">🔧 Dimensionar</button>
      `;
    } else if (tipo === 'moinho') {
      paramsPanel.innerHTML = `
        <div class="form-grid">
          <div class="form-group"><label>Taxa de alimentação (t/h)</label><input type="number" id="taxa" step="1" value="10"></div>
          <div class="form-group"><label>Índice de Bond Wi (kWh/ST)</label><input type="number" id="wi" step="0.5" value="11.6"></div>
          <div class="form-group"><label>Diâmetro produto d1 (mm)</label><input type="number" id="d1" step="1" value="5"></div>
          <div class="form-group"><label>Diâmetro inicial d0 (mm)</label><input type="number" id="d0" step="1" value="35"></div>
        </div>
        <button class="btn-save" id="btnDimensionar" style="margin-top:16px">🔧 Dimensionar</button>
      `;
    }

    document.getElementById('btnDimensionar')?.addEventListener('click', () => {
      const tipoEq = tipoSelect.value;
      let params = {};
      if (tipoEq === 'elevador') {
        params = {
          capacidade: parseFloat(document.getElementById('cap')?.value) || 0,
          altura: parseFloat(document.getElementById('altura')?.value) || 0,
          densidade: parseFloat(document.getElementById('dens')?.value) || 0.75,
          velocidade: parseFloat(document.getElementById('vel')?.value) || 1.5,
          n: parseFloat(document.getElementById('n')?.value) || 1,
          CF1: parseFloat(document.getElementById('cf1')?.value) || 0.75,
          passo: parseFloat(document.getElementById('passo')?.value) || 350
        };
      } else if (tipoEq === 'transportador') {
        params = {
          capacidade: parseFloat(document.getElementById('cap')?.value) || 0,
          comprimento: parseFloat(document.getElementById('comp')?.value) || 0,
          densidade: parseFloat(document.getElementById('dens')?.value) || 1.1,
          inclinacao: parseFloat(document.getElementById('incl')?.value) || 0,
          velocidade: parseFloat(document.getElementById('vel')?.value) || 1.5
        };
      } else if (tipoEq === 'peneira') {
        params = {
          alimentacao: parseFloat(document.getElementById('alim')?.value) || 0,
          densidade: parseFloat(document.getElementById('dens')?.value) || 1.0,
          malha: parseFloat(document.getElementById('malha')?.value) || 10,
          diametro: parseFloat(document.getElementById('diam')?.value) || 1.3,
          comprimento: parseFloat(document.getElementById('compr')?.value) || 3.0
        };
      } else if (tipoEq === 'moinho') {
        params = {
          taxa: parseFloat(document.getElementById('taxa')?.value) || 0,
          wi: parseFloat(document.getElementById('wi')?.value) || 11.6,
          d1: parseFloat(document.getElementById('d1')?.value) || 5,
          d0: parseFloat(document.getElementById('d0')?.value) || 35
        };
      }
      const dimensionamento = calcularDimensionamento(tipoEq, params);
      exibirDimensionamento(resultadoDiv, dimensionamento, tipoEq, params);
    });
  }

  tipoSelect.addEventListener('change', atualizarCampos);
  atualizarCampos();
}

// ========== FUNÇÕES DE CÁLCULO (DIMENSIONAMENTO TÉCNICO) ==========
function calcularDimensionamento(tipo, params) {
  if (tipo === 'elevador') {
    const { capacidade, altura, densidade, velocidade, n, CF1, passo } = params;
    const CF2 = 1.0;
    const V_litros = (capacidade * passo) / (3600 * n * velocidade * CF1 * CF2 * densidade);
    const V_arred = Math.ceil(V_litros * 2) / 2;
    const Pm = (1000 * n * densidade * V_arred) / passo;
    const D_tambor = 0.32;
    const potencia_cv = (velocidade * Pm * n * (altura + 7 * D_tambor)) / (75 * 0.95);
    const potencia_req = Math.ceil(potencia_cv * 1.2);
    const Te = Pm * (altura + 7);
    const Tm = Te * 1.85;
    const largura_correia_mm = 600;
    const tensao_unit = Tm / (largura_correia_mm / 10);
    const lonas_necessarias = Math.ceil(tensao_unit / 33);
    return {
      tipo: 'elevador',
      especificacoes: {
        volume_caneca_litros: V_arred,
        passo_caneca_mm: passo,
        peso_metro_material_kgm: round(Pm, 2),
        potencia_requerida_cv: potencia_req,
        torque_estimado_Nm: round((potencia_req * 716) / (velocidade * 60 / (Math.PI * D_tambor)), 1),
        tensao_maxima_correia_kgf: round(Tm, 1),
        lonas_necessarias: lonas_necessarias,
        largura_correia_mm: largura_correia_mm
      },
      formulas: {
        volume_caneca: `V = (Q × e) / (3600 × n × v × CF1 × CF2 × γ) = (${capacidade} × ${passo}) / (3600 × ${n} × ${velocidade} × ${CF1} × 1 × ${densidade}) = ${V_litros.toFixed(2)} L → arredondado ${V_arred} L`,
        potencia: `N = (v × Pm × n × (H + 7D)) / (75 × η) = (${velocidade} × ${Pm.toFixed(2)} × ${n} × (${altura} + 7×0.32)) / (75×0.95) = ${potencia_cv.toFixed(2)} cv → com folga ${potencia_req} cv`
      }
    };
  } else if (tipo === 'transportador') {
    const { capacidade, comprimento, densidade, inclinacao, velocidade } = params;
    const Wm = capacidade * 1000 / 3600 / velocidade;
    const Te = Wm * 9.81 * comprimento * 0.04;
    const potencia_kW = (Te * velocidade) / 1000;
    const potencia_cv = potencia_kW / 0.7355;
    const potencia_req = Math.ceil(potencia_cv * 1.15);
    return {
      tipo: 'transportador',
      especificacoes: {
        peso_material_kgm: round(Wm, 2),
        tensao_efetiva_N: round(Te, 1),
        potencia_requerida_cv: potencia_req,
        torque_estimado_Nm: round((potencia_req * 716) / (velocidade * 60 / (Math.PI * 0.32)), 1)
      },
      formulas: {
        tensao: `Te = Wm × g × L × f = ${Wm.toFixed(2)} × 9.81 × ${comprimento} × 0.04 = ${Te.toFixed(1)} N`,
        potencia: `N = (Te × v) / (1000 × 0.7355) × 1.15 = ${potencia_cv.toFixed(2)} cv → ${potencia_req} cv`
      }
    };
  } else if (tipo === 'peneira') {
    const { alimentacao, densidade, malha, diametro, comprimento } = params;
    const Qton = alimentacao * densidade;
    const capacidadeUnit = malha <= 10 ? 22 : 25;
    const areaReq = Qton / capacidadeUnit;
    const areaCesto = Math.PI * diametro * comprimento / 3;
    const potencia_cv = (areaReq * 1.5) + 1;
    const potencia_req = Math.ceil(potencia_cv);
    return {
      tipo: 'peneira',
      especificacoes: {
        vazao_tonh: round(Qton, 1),
        area_necessaria_m2: round(areaReq, 3),
        area_cesto_m2: round(areaCesto, 3),
        potencia_requerida_cv: potencia_req
      },
      formulas: {
        area: `A = Q / Cu = (${alimentacao} × ${densidade}) / ${capacidadeUnit} = ${areaReq.toFixed(3)} m²`,
        potencia: `N = A × 1.5 + 1 = ${potencia_cv.toFixed(2)} cv → ${potencia_req} cv`
      }
    };
  } else if (tipo === 'moinho') {
    const { taxa, wi, d1, d0 } = params;
    const d1um = d1 * 1000, d0um = d0 * 1000;
    const Et = wi * 10 * (1 / Math.sqrt(d1um) - 1 / Math.sqrt(d0um));
    const P_kW = Et * (taxa / 0.9072);
    const potencia_cv = P_kW / 0.7355;
    const potencia_req = Math.ceil(potencia_cv * 1.25);
    return {
      tipo: 'moinho',
      especificacoes: {
        energia_especifica_kWhST: round(Et, 3),
        potencia_requerida_cv: potencia_req,
        torque_estimado_Nm: round((potencia_req * 716) / 1200, 1)
      },
      formulas: {
        energia: `Et = Wi × 10 × (1/√d1 - 1/√d0) = ${wi} × 10 × (1/√${d1um} - 1/√${d0um}) = ${Et.toFixed(3)} kWh/ST`,
        potencia: `P = Et × (T / 0.9072) = ${Et.toFixed(3)} × ${(taxa/0.9072).toFixed(2)} = ${P_kW.toFixed(2)} kW → ${potencia_req} cv`
      }
    };
  }
}

function exibirDimensionamento(container, dim, tipo, params) {
  let html = `<div class="formula-box"><div class="formula-title">📐 Fórmulas utilizadas (validação técnica)</div>`;
  for (const [key, formula] of Object.entries(dim.formulas)) {
    html += `<div><span class="ir-label">${key}:</span> ${formula}</div>`;
  }
  html += `</div><div class="formula-box"><div class="formula-title">⚙️ Especificações calculadas</div><div class="form-grid">`;
  for (const [key, val] of Object.entries(dim.especificacoes)) {
    html += `<div class="form-group"><label>${key.replace(/_/g, ' ')}</label><div class="calc-display">${val}</div></div>`;
  }
  html += `</div></div><div class="formula-box"><div class="formula-title">🔄 Compatibilidade com equipamentos existentes</div>`;

  // Buscar motores no estoque
  const motoresEstoque = [];
  for (const [id, eq] of Object.entries(DATA.equipamentos)) {
    if (eq.componentes?.motor?.potencia_cv) {
      motoresEstoque.push({ id, nome: eq.nome, potencia: eq.componentes.motor.potencia_cv });
    }
    if (eq.componentes?.motorredutor?.potencia_cv) {
      motoresEstoque.push({ id, nome: eq.nome, potencia: eq.componentes.motorredutor.potencia_cv });
    }
  }
  const potenciaReq = dim.especificacoes.potencia_requerida_cv;
  const compativeis = motoresEstoque.filter(m => m.potencia >= potenciaReq).sort((a,b) => a.potencia - b.potencia);
  if (compativeis.length) {
    html += `<p>✅ Motores disponíveis (potência ≥ ${potenciaReq} cv):</p><div class="table-wrap"><table><thead><tr><th>Equipamento</th><th>Potência (cv)</th></tr></thead><tbody>`;
    compativeis.forEach(m => { html += `<tr><td>${m.nome} (${m.id})</td><td>${m.potencia}</td></tr>`; });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>❌ Nenhum motor no estoque atende a potência de ${potenciaReq} cv. <strong>Necessário desenvolver/comprar novo motor.</strong></p>`;
  }

  // Para elevador, verificar correias
  if (tipo === 'elevador') {
    const correiasEstoque = [];
    for (const [id, eq] of Object.entries(DATA.equipamentos)) {
      if (eq.componentes?.correia) {
        correiasEstoque.push({ id, nome: eq.nome, lonas: eq.componentes.correia.lonas });
      }
    }
    const lonasNecessarias = dim.especificacoes.lonas_necessarias;
    const correiasCompativeis = correiasEstoque.filter(c => c.lonas >= lonasNecessarias);
    if (correiasCompativeis.length) {
      html += `<p>✅ Correias compatíveis (lonas ≥ ${lonasNecessarias}):</p><div class="table-wrap"><table><thead><tr><th>Equipamento</th><th>Lonas</th></tr></thead><tbody>`;
      correiasCompativeis.forEach(c => { html += `<tr><td>${c.nome} (${c.id})</td><td>${c.lonas}</td></tr>`; });
      html += `</tbody></table></div>`;
    } else {
      html += `<p>❌ Nenhuma correia existente atende a exigência de ${lonasNecessarias} lonas. <strong>Necessário desenvolver/comprar nova correia.</strong></p>`;
    }
  }

  html += `<div class="divider"></div><p>💡 Caso deseje, você pode <strong>cadastrar um novo equipamento</strong> com estas especificações.</p>`;
  html += `<button class="btn-add" id="btnSalvarComoEquipamento">📌 Salvar este dimensionamento como novo equipamento</button>`;
  container.innerHTML = html;
  initCollapse();

  document.getElementById('btnSalvarComoEquipamento')?.addEventListener('click', () => {
    const nome = prompt('Nome do novo equipamento:', `${tipo.toUpperCase()} dimensionado`);
    if (!nome) return;
    const novoId = gerarNovoId(tipo);
    const novoEquip = {
      nome: nome,
      tipo: tipo,
      parametros: params,
      componentes: {
        motor: { potencia_cv: dim.especificacoes.potencia_requerida_cv, observacao: 'componente sugerido pelo configurador' }
      },
      criado_em: new Date().toISOString().split('T')[0]
    };
    if (tipo === 'elevador') {
      novoEquip.componentes.caneca = { volume_litros: dim.especificacoes.volume_caneca_litros, passo_mm: dim.especificacoes.passo_caneca_mm };
      novoEquip.componentes.correia = { largura_mm: dim.especificacoes.largura_correia_mm, lonas: dim.especificacoes.lonas_necessarias };
    }
    DATA.equipamentos[novoId] = novoEquip;
    DATA.proximo_id[tipo] = (DATA.proximo_id[tipo] || 1) + 1;
    saveData(DATA);
    showToast(`Equipamento ${novoId} salvo com sucesso!`, 'success');
    navigate('estoque', 'ESTOQUE');
  });
}

function gerarNovoId(tipo) {
  const prefixos = { elevador: 'EL', transportador: 'TP', peneira: 'PN', moinho: 'MO' };
  const prefixo = prefixos[tipo] || 'EQ';
  const prox = DATA.proximo_id[tipo] || 1;
  const num = String(prox).padStart(3, '0');
  return `${prefixo}-${num}`;
}

// ========== TELA: CADASTRO MANUAL DE EQUIPAMENTO ==========
function renderCadastroEquipamento(root) {
  root.innerHTML = `
    <div class="module-header">
      <div class="module-badge">➕ Cadastro</div>
      <div class="module-title">Novo Equipamento</div>
      <div class="module-desc">Preencha os dados do equipamento que deseja adicionar ao estoque.</div>
    </div>
    <div class="section-card">
      <div class="section-card-header open">
        <div class="section-title">Dados do equipamento</div>
        <span class="section-chevron">▼</span>
      </div>
      <div class="section-card-body open">
        <div class="form-grid">
          <div class="form-group"><label>Tipo</label><select id="cad_tipo"><option value="elevador">Elevador</option><option value="transportador">Transportador</option><option value="peneira">Peneira</option><option value="moinho">Moinho</option></select></div>
          <div class="form-group"><label>Nome</label><input type="text" id="cad_nome" placeholder="Ex: Elevador Grãos 01"></div>
          <div class="form-group"><label>Capacidade (t/h)</label><input type="number" id="cad_capacidade" step="10" value="100"></div>
          <div class="form-group"><label>Potência do motor (cv)</label><input type="number" id="cad_potencia" step="1" value="20"></div>
          <div class="form-group"><label>Observações</label><textarea id="cad_obs" rows="2" placeholder="Especificações adicionais..."></textarea></div>
        </div>
        <button class="btn-save" id="btnCadastrar" style="margin-top:16px">💾 Cadastrar Equipamento</button>
      </div>
    </div>
  `;
  document.getElementById('btnCadastrar').addEventListener('click', () => {
    const tipo = document.getElementById('cad_tipo').value;
    const nome = document.getElementById('cad_nome').value.trim();
    const capacidade = parseFloat(document.getElementById('cad_capacidade').value) || 0;
    const potencia = parseFloat(document.getElementById('cad_potencia').value) || 0;
    const obs = document.getElementById('cad_obs').value;
    if (!nome) { showToast('Informe o nome do equipamento', 'error'); return; }
    const novoId = gerarNovoId(tipo);
    const novoEquip = {
      nome: nome,
      tipo: tipo,
      parametros: { capacidade_tph: capacidade },
      componentes: { motor: { potencia_cv: potencia, observacao: obs } },
      criado_em: new Date().toISOString().split('T')[0]
    };
    DATA.equipamentos[novoId] = novoEquip;
    DATA.proximo_id[tipo] = (DATA.proximo_id[tipo] || 1) + 1;
    saveData(DATA);
    showToast(`Equipamento ${novoId} cadastrado com sucesso!`, 'success');
    navigate('estoque', 'ESTOQUE');
  });
}

// ========== TELA: VERIFICAR COMPATIBILIDADE ==========
function renderCompatibilidade(root) {
  root.innerHTML = `
    <div class="module-header">
      <div class="module-badge">🧩 Compatibilidade</div>
      <div class="module-title">Verificar compatibilidade de componentes</div>
      <div class="module-desc">Selecione um equipamento existente e veja se seus componentes podem ser usados em um novo projeto.</div>
    </div>
    <div class="section-card"><div class="section-card-header open"><div class="section-title">Equipamento de referência</div><span class="section-chevron">▼</span></div>
    <div class="section-card-body open">
      <div class="form-group"><label>Selecione</label><select id="comp_equip">${Object.keys(DATA.equipamentos).map(k => `<option value="${k}">${DATA.equipamentos[k].nome} (${k})</option>`).join('')}</select></div>
      <button class="btn-save" id="btnVerificarComp">Verificar</button>
    </div></div>
    <div id="comp_resultado"></div>
  `;
  document.getElementById('btnVerificarComp').addEventListener('click', () => {
    const equipId = document.getElementById('comp_equip').value;
    const eq = DATA.equipamentos[equipId];
    if (!eq) return;
    const motor = eq.componentes?.motor?.potencia_cv || eq.componentes?.motorredutor?.potencia_cv;
    let html = `<div class="section-card"><div class="section-card-header open"><div class="section-title">Análise de compatibilidade</div></div><div class="section-card-body open">`;
    html += `<div class="formula-box">Equipamento: ${eq.nome} (${equipId})<br>Tipo: ${eq.tipo}<br>Motor: ${motor ? motor + ' cv' : 'não informado'}</div>`;
    html += `<p>✅ Este motor pode ser utilizado em projetos que exijam até ${motor} cv, desde que torque e rotação sejam compatíveis.</p>`;
    html += `<p>📌 Para um novo projeto, utilize o <strong>Configurador Paramétrico</strong> e verifique a compatibilidade automática.</p>`;
    html += `</div></div>`;
    document.getElementById('comp_resultado').innerHTML = html;
    initCollapse();
  });
}

// ========== EVENTOS GLOBAIS ==========
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigate(el.dataset.module, el.dataset.id);
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  saveData(DATA);
  showToast('Dados salvos com sucesso!', 'success');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  confirmDelete('Restaurar dados padrão? Todas as alterações serão perdidas.', () => {
    DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
    saveData(DATA);
    renderContent();
    showToast('Dados restaurados', 'success');
  });
});

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
});
document.getElementById('sidebarToggle').addEventListener('click', closeSidebar);
document.getElementById('overlay').addEventListener('click', closeSidebar);

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mistura90_${new Date().toISOString().slice(0,19)}.json`;
  a.click();
  showToast('Exportado com sucesso', 'success');
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e => {
  if (!e.target.files[0]) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      DATA = JSON.parse(ev.target.result);
      saveData(DATA);
      renderContent();
      showToast('Importado com sucesso', 'success');
    } catch {
      showToast('Arquivo inválido', 'error');
    }
  };
  reader.readAsText(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('modalCancel').addEventListener('click', () => {
  document.getElementById('modalBackdrop').classList.remove('show');
  deleteCallback = null;
});
document.getElementById('modalConfirm').addEventListener('click', () => {
  document.getElementById('modalBackdrop').classList.remove('show');
  if (deleteCallback) { deleteCallback(); deleteCallback = null; }
});

// Inicializar navegação
navigate('configurador', 'CONFIG');