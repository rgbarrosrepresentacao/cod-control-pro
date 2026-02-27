/**
 * COD Control Pro – Main Application Logic (Supabase Edition)
 * All DB calls are async/await via Supabase
 */

/* =========================================
   HELPERS
   ========================================= */
const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtN = (v, dec = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const el = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);

function showToast(msg, duration = 3000) {
    const t = el('toast');
    el('toast-msg').textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function showLoading(show = true) {
    let loader = document.getElementById('global-loader');
    if (!loader) return;
    loader.classList.toggle('hidden', !show);
}

function showConfirm(title, msg, cb) {
    el('confirm-title').textContent = title;
    el('confirm-message').textContent = msg;
    el('modal-confirm').classList.remove('hidden');
    const ok = el('confirm-ok');
    const cancel = el('confirm-cancel');
    const cleanup = () => el('modal-confirm').classList.add('hidden');
    const newOk = ok.cloneNode(true);
    ok.parentNode.replaceChild(newOk, ok);
    newOk.addEventListener('click', () => { cleanup(); cb(); });
    cancel.addEventListener('click', cleanup, { once: true });
}

function openModal(id) { el(id).classList.remove('hidden'); }
function closeModal(id) { el(id).classList.add('hidden'); }

function calcSaleProfit(sale) {
    const gross = Number(sale.gross) || 0;
    const cost = Number(sale.cost) || 0;
    const shipping = Number(sale.shipping) || 0;
    const fee = Number(sale.fee) || 0;
    // Lucro Líquido = Valor Bruto − Custo do Produto − Frete − Taxa
    if (sale.status === 'Cancelado') return -cost;
    return gross - cost - shipping - fee;
}

function statusBadge(status) {
    const map = { 'Entregue': ['badge-green', '✅'], 'Cancelado': ['badge-red', '❌'], 'Separado': ['badge-blue', '📦'], 'Agendado': ['badge-orange', '📅'] };
    const [cls, icon] = map[status] || ['badge-blue', '•'];
    return `<span class="badge ${cls}">${icon} ${status}</span>`;
}

function platformBadge(p) {
    const map = { 'Facebook Ads': 'badge-blue', 'Google Ads': 'badge-orange', 'YouTube Ads': 'badge-red', 'TikTok Ads': 'badge-green' };
    return `<span class="badge ${map[p] || 'badge-blue'}">${p}</span>`;
}

async function withLoading(fn, loadingMsg = '') {
    showLoading(true);
    try { return await fn(); }
    catch (e) { showToast(`❌ ${e.message}`); console.error(e); }
    finally { showLoading(false); }
}

/* =========================================
   AUTH
   ========================================= */
/* Sem tela de login – acesso direto */
async function initAuth() {
    // Esconde tela de login e mostra app diretamente
    const loginScreen = el('login-screen');
    const appEl = el('app');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appEl) appEl.classList.remove('hidden');

    // Botão de logout apenas recarrega a página
    const logoutBtn = el('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    await initApp();
}

/* =========================================
   NAVIGATION
   ========================================= */
const PAGE_META = {
    dashboard: { title: 'Dashboard', subtitle: 'Visão geral da operação COD' },
    ads: { title: '📢 Controle de Anúncios', subtitle: 'Gerenciamento de investimento em mídia paga' },
    sales: { title: '📦 Controle de Vendas', subtitle: 'Registro e acompanhamento de pedidos Logzz' },
    reports: { title: '📊 Relatórios', subtitle: 'Análise detalhada e exportação de dados' },
    simulator: { title: '🔥 Simulador de Escala', subtitle: 'Projete seus resultados antes de investir' },
    settings: { title: '⚙️ Configurações', subtitle: 'Preferências e gestão do sistema' },
};

let currentTab = 'dashboard';

async function navigate(tab) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
    const meta = PAGE_META[tab] || { title: tab, subtitle: '' };
    el('page-title').textContent = meta.title;
    el('page-subtitle').textContent = meta.subtitle;
    currentTab = tab;
    if (window.innerWidth < 900) document.getElementById('sidebar').classList.remove('open');
    if (tab === 'dashboard') await refreshDashboard();
    if (tab === 'ads') await refreshAdsModule();
    if (tab === 'sales') await refreshSalesModule();
    if (tab === 'reports') await refreshReports();
    if (tab === 'simulator') runSimulator();
    if (tab === 'settings') await refreshSettings();
}

function initNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.tab));
    });
    el('sidebar-toggle').addEventListener('click', () => document.getElementById('app').classList.toggle('sidebar-collapsed'));
    el('mobile-menu-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal || btn.closest('.modal-overlay').id));
    });
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); });
    });
}

/* =========================================
   MONTH SELECTOR + CLOCK
   ========================================= */
let globalMonth = '';

function initMonthSelector() {
    const input = el('global-month');
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    input.value = ym;
    globalMonth = ym;
    input.addEventListener('change', async () => {
        globalMonth = input.value;
        await navigate(currentTab);
    });
}

function initClock() {
    const update = () => {
        el('topbar-date').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    };
    update();
    setInterval(update, 60000);
}

/* =========================================
   DASHBOARD
   ========================================= */
async function refreshDashboard() {
    await withLoading(async () => {
        const [allAds, allSales, settings] = await Promise.all([
            DB.ads.getAll(),
            DB.sales.getAll(),
            DB.settings.get(),
        ]);

        const ads = DB.filterByMonth(allAds, globalMonth);
        const sales = DB.filterByMonth(allSales, globalMonth);
        const goal = Number(settings.goal) || 100000;

        // KPIs
        const totalAds = ads.reduce((s, a) => s + Number(a.value || 0), 0);
        const deliveredSales = sales.filter(s => s.status === 'Entregue');
        const cancelledSales = sales.filter(s => s.status === 'Cancelado');
        const separatedSales = sales.filter(s => s.status === 'Separado');
        const scheduledSales = sales.filter(s => s.status === 'Agendado');

        const grossRev = sales.filter(s => s.status !== 'Cancelado').reduce((s, x) => s + Number(x.gross || 0), 0);
        const totalFees = sales.filter(s => s.status !== 'Cancelado').reduce((s, x) => s + Number(x.fee || 0), 0);
        const totalShipping = sales.filter(s => s.status !== 'Cancelado').reduce((s, x) => s + Number(x.shipping || 0), 0);
        const totalCost = sales.reduce((s, x) => s + Number(x.cost || 0), 0);
        const netRev = grossRev - totalFees - totalShipping;
        // Lucro Líquido = Bruto − Custo − Frete − Taxa − Anúncios
        const profit = netRev - totalCost - totalAds;
        const roas = totalAds > 0 ? (grossRev / totalAds) : 0;
        const cpv = deliveredSales.length > 0 ? (totalAds / deliveredSales.length) : 0;
        const ticket = deliveredSales.length > 0 ? (grossRev / deliveredSales.length) : 0;
        const cancelRate = sales.length > 0 ? (cancelledSales.length / sales.length * 100) : 0;
        const margin = grossRev > 0 ? (profit / grossRev * 100) : 0;

        // Update cards
        el('kpi-gross').textContent = fmt(grossRev);
        el('kpi-net').textContent = fmt(netRev);
        el('kpi-ads').textContent = fmt(totalAds);
        el('kpi-profit').textContent = fmt(profit);
        el('kpi-profit').className = `kpi-value ${profit >= 0 ? 'text-green' : 'text-red'}`;
        el('kpi-roas').textContent = `${fmtN(roas)}x`;
        el('kpi-cpv').textContent = fmt(cpv);
        el('kpi-ticket').textContent = fmt(ticket);
        el('kpi-orders').textContent = sales.length;
        el('kpi-delivered').textContent = deliveredSales.length;
        el('kpi-cancelled').textContent = cancelledSales.length;
        el('kpi-cancel-rate').textContent = `${fmtN(cancelRate, 1)}%`;
        el('kpi-margin').textContent = `${fmtN(margin, 1)}%`;

        // Meta
        const pct = Math.min((profit / goal) * 100, 100);
        el('meta-current').textContent = fmt(profit);
        el('meta-goal-display').textContent = fmt(goal);
        el('meta-progress-fill').style.width = `${Math.max(pct, 0)}%`;
        el('meta-pct').textContent = `${fmtN(Math.max(pct, 0), 1)}%`;

        const [yearS, monthS] = globalMonth.split('-').map(Number);
        const now2 = new Date();
        const daysInMonth = new Date(yearS, monthS, 0).getDate();
        let daysPassed = 0;
        if (yearS === now2.getFullYear() && monthS - 1 === now2.getMonth()) daysPassed = now2.getDate();
        else if (new Date(yearS, monthS - 1) < now2) daysPassed = daysInMonth;
        if (daysPassed > 0) {
            const projected = (profit / daysPassed) * daysInMonth;
            el('meta-projection').textContent = `Projeção: ${fmt(projected)} até fim do mês`;
        } else {
            el('meta-projection').textContent = 'Projeção: aguardando dados...';
        }

        // Charts data
        const salesByDay = {};
        sales.forEach(s => {
            if (!s.date) return;
            if (!salesByDay[s.date]) salesByDay[s.date] = { gross: 0, net: 0, profit: 0 };
            if (s.status !== 'Cancelado') {
                salesByDay[s.date].gross += Number(s.gross || 0);
                salesByDay[s.date].net += Number(s.gross || 0) - Number(s.fee || 0) - Number(s.shipping || 0);
            }
            salesByDay[s.date].profit += calcSaleProfit(s);
        });
        const salesDayArr = Object.entries(salesByDay).map(([date, v]) => ({ date, ...v }));
        const adsByDay = {};
        ads.forEach(a => { if (!a.date) return; adsByDay[a.date] = (adsByDay[a.date] || 0) + Number(a.value || 0); });
        const adsDayArr = Object.entries(adsByDay).map(([date, value]) => ({ date, value }));
        const profitDayArr = salesDayArr.map(d => ({ date: d.date, profit: d.profit - (adsByDay[d.date] || 0) }));

        Charts.updateRevenueChart(salesDayArr);
        Charts.updateAdsChart(adsDayArr);
        Charts.updateProfitChart(profitDayArr);
        Charts.updateComparisonChart(salesDayArr, adsDayArr);
        Charts.updateStatusChart(deliveredSales.length, cancelledSales.length, separatedSales.length, scheduledSales.length);
    });
}

/* =========================================
   ADS MODULE
   ========================================= */
async function refreshAdsModule() {
    await withLoading(async () => {
        const allAds = await DB.ads.getAll();
        const ads = DB.filterByMonth(allAds, globalMonth);

        const total = ads.reduce((s, a) => s + Number(a.value || 0), 0);
        const byPlatform = {};
        ads.forEach(a => { byPlatform[a.platform] = (byPlatform[a.platform] || 0) + Number(a.value || 0); });

        el('ads-total-month').textContent = fmt(total);
        el('ads-facebook').textContent = fmt(byPlatform['Facebook Ads'] || 0);
        el('ads-google').textContent = fmt(byPlatform['Google Ads'] || 0);
        el('ads-youtube').textContent = fmt(byPlatform['YouTube Ads'] || 0);

        const [yearS, monthS] = globalMonth.split('-').map(Number);
        const now2 = new Date();
        let daysPassed = 1;
        if (yearS === now2.getFullYear() && monthS - 1 === now2.getMonth()) daysPassed = now2.getDate();
        else if (new Date(yearS, monthS - 1) < now2) daysPassed = new Date(yearS, monthS, 0).getDate();
        el('ads-daily-avg').textContent = fmt(total / daysPassed);

        renderAdsTable(ads, el('ads-search').value);
    });
}

function renderAdsTable(ads, search = '') {
    const tbody = el('ads-tbody');
    const filtered = search
        ? ads.filter(a => (a.campaign || '').toLowerCase().includes(search.toLowerCase()) || (a.platform || '').toLowerCase().includes(search.toLowerCase()))
        : ads;
    const sorted = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Nenhum anúncio encontrado. Clique em "Lançar Anúncio" para começar.</td></tr>`;
        return;
    }
    tbody.innerHTML = sorted.map(a => `
    <tr>
      <td>${a.date}</td>
      <td>${platformBadge(a.platform)}</td>
      <td>${a.campaign || '<span class="text-muted">—</span>'}</td>
      <td><strong>${fmt(a.value)}</strong></td>
      <td><span title="${a.obs || ''}">${a.obs ? a.obs.slice(0, 40) + (a.obs.length > 40 ? '...' : '') : '<span class="text-muted">—</span>'}</span></td>
      <td>
        <button class="action-btn edit" onclick="editAd('${a.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete" onclick="deleteAd('${a.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function initAdsModule() {
    el('btn-add-ad').addEventListener('click', () => {
        el('modal-ad-title').textContent = 'Lançar Anúncio';
        el('ad-edit-id').value = '';
        el('ad-form').reset();
        el('ad-date').value = today();
        openModal('modal-ad');
    });

    el('ad-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = el('ad-edit-id').value;
        const data = {
            date: el('ad-date').value,
            platform: el('ad-platform').value,
            value: parseFloat(el('ad-value').value) || 0,
            campaign: el('ad-campaign').value.trim(),
            obs: el('ad-obs').value.trim(),
        };
        await withLoading(async () => {
            if (id) { await DB.ads.update(id, data); showToast('✅ Anúncio atualizado!'); }
            else { await DB.ads.add(data); showToast('✅ Anúncio lançado!'); }
            closeModal('modal-ad');
            await refreshAdsModule();
        });
    });

    el('ads-search').addEventListener('input', async () => {
        const allAds = await DB.ads.getAll();
        renderAdsTable(DB.filterByMonth(allAds, globalMonth), el('ads-search').value);
    });

    el('btn-export-ads-excel').addEventListener('click', async () => {
        const ads = DB.filterByMonth(await DB.ads.getAll(), globalMonth);
        Exporter.exportAds(ads);
        showToast('📊 Excel de anúncios exportado!');
    });
}

window.editAd = async (id) => {
    const all = await DB.ads.getAll();
    const ad = all.find(a => a.id === id);
    if (!ad) return;
    el('modal-ad-title').textContent = 'Editar Anúncio';
    el('ad-edit-id').value = id;
    el('ad-date').value = ad.date;
    el('ad-platform').value = ad.platform;
    el('ad-value').value = ad.value;
    el('ad-campaign').value = ad.campaign || '';
    el('ad-obs').value = ad.obs || '';
    openModal('modal-ad');
};

window.deleteAd = (id) => {
    showConfirm('Excluir Anúncio', 'Tem certeza que deseja excluir este anúncio?', async () => {
        await withLoading(async () => {
            await DB.ads.delete(id);
            showToast('🗑️ Anúncio excluído');
            await refreshAdsModule();
        });
    });
};

/* =========================================
   SALES MODULE
   ========================================= */
async function refreshSalesModule() {
    await withLoading(async () => {
        const allSales = await DB.sales.getAll();
        const sales = DB.filterByMonth(allSales, globalMonth);
        const statusFilter = el('sales-filter-status').value;
        const search = el('sales-search').value;

        const cancelled = sales.filter(s => s.status === 'Cancelado');
        const nonCancelled = sales.filter(s => s.status !== 'Cancelado');

        const grossTotal = nonCancelled.reduce((s, x) => s + Number(x.gross || 0), 0);
        const totalCustos = nonCancelled.reduce((s, x) =>
            s + Number(x.cost || 0) + Number(x.shipping || 0) + Number(x.fee || 0), 0);
        const lucroTotal = sales.reduce((s, x) => s + (calcSaleProfit(x) || 0), 0);

        el('sales-gross').textContent = fmt(grossTotal);
        el('sales-net').textContent = fmt(totalCustos);
        el('sales-profit').textContent = fmt(lucroTotal);
        el('sales-profit').style.color = lucroTotal >= 0 ? 'var(--green)' : 'var(--red)';
        el('sales-cancelled').textContent = fmt(cancelled.reduce((s, x) => s + Number(x.gross || 0), 0));

        renderSalesTable(sales, search, statusFilter);
    });
}

function renderSalesTable(sales, search = '', statusFilter = '') {
    const tbody = el('sales-tbody');
    let filtered = sales;
    if (statusFilter) filtered = filtered.filter(s => s.status === statusFilter);
    if (search) filtered = filtered.filter(s => (s.product || '').toLowerCase().includes(search.toLowerCase()) || (s.status || '').toLowerCase().includes(search.toLowerCase()));
    const sorted = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9">Nenhuma venda encontrada. Clique em "Registrar Venda" para começar.</td></tr>`;
        return;
    }
    tbody.innerHTML = sorted.map(s => {
        const profit = calcSaleProfit(s);
        const profitColor = profit >= 0 ? 'var(--green)' : 'var(--red)';
        return `
    <tr>
      <td>${s.date}</td>
      <td>${s.product}</td>
      <td>${fmt(s.gross)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${fmt(s.cost || 0)}</td>
      <td>${fmt(s.shipping || 0)}</td>
      <td>${fmt(s.fee || 0)}</td>
      <td class="${profit >= 0 ? 'text-green' : 'text-red'}"><strong>${fmt(profit)}</strong></td>
      <td>
        <button class="action-btn edit" onclick="editSale('${s.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete" onclick="deleteSale('${s.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    </tr>`;
    }).join('');
}

function initSalesModule() {
    el('btn-add-sale').addEventListener('click', () => {
        el('modal-sale-title').textContent = 'Registrar Venda';
        el('sale-edit-id').value = '';
        el('sale-form').reset();
        el('sale-date').value = today();
        el('sale-profit-preview').value = '';
        openModal('modal-sale');
    });

    ['sale-gross', 'sale-cost', 'sale-shipping', 'sale-fee', 'sale-status'].forEach(id => {
        el(id)?.addEventListener('input', updateSaleProfitPreview);
        el(id)?.addEventListener('change', updateSaleProfitPreview);
    });

    el('sale-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = el('sale-edit-id').value;
        const data = {
            id,
            date: el('sale-date').value,
            product: el('sale-product').value.trim(),
            status: el('sale-status').value,
            gross: parseFloat(el('sale-gross').value) || 0,
            commission: 0,
            cost: parseFloat(el('sale-cost').value) || 0,
            shipping: parseFloat(el('sale-shipping').value) || 0,
            fee: parseFloat(el('sale-fee').value) || 0,
            obs: el('sale-obs').value.trim(),
        };
        data.profit = calcSaleProfit(data);
        await withLoading(async () => {
            if (id) { await DB.sales.update(id, data); showToast('✅ Venda atualizada!'); }
            else { await DB.sales.add(data); showToast('✅ Venda registrada!'); }
            closeModal('modal-sale');
            await refreshSalesModule();
        });
    });

    el('sales-search').addEventListener('input', async () => refreshSalesModule());
    el('sales-filter-status').addEventListener('change', async () => refreshSalesModule());

    el('btn-export-sales-excel').addEventListener('click', async () => {
        const sales = DB.filterByMonth(await DB.sales.getAll(), globalMonth);
        Exporter.exportSales(sales);
        showToast('📊 Excel de vendas exportado!');
    });
}

function updateSaleProfitPreview() {
    const gross = parseFloat(el('sale-gross').value) || 0;
    const cost = parseFloat(el('sale-cost').value) || 0;
    const shipping = parseFloat(el('sale-shipping').value) || 0;
    const fee = parseFloat(el('sale-fee').value) || 0;
    const status = el('sale-status').value;

    const data = { gross, cost, shipping, fee, status };
    const profit = calcSaleProfit(data);
    const totalCosts = cost + shipping + fee;

    el('sale-profit-preview').value = fmt(profit);
    el('sale-profit-preview').style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';

    // Breakdown detalhado
    const breakdown = el('sale-profit-breakdown');
    if (breakdown) {
        if (status === 'Cancelado') {
            breakdown.textContent = `Cancelado: prejuízo do custo do produto (−${fmt(cost)})`;
            breakdown.style.color = 'var(--red)';
        } else {
            breakdown.innerHTML =
                `${fmt(gross)} − ${fmt(totalCosts)} = ` +
                `<strong style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'}">` +
                `${fmt(profit)}</strong> ` +
                `<span style="opacity:.7">(custo ${fmt(cost)} + frete ${fmt(shipping)} + taxa ${fmt(fee)})</span>`;
            breakdown.style.color = 'var(--text-muted)';
        }
    }
}


window.editSale = async (id) => {
    const all = await DB.sales.getAll();
    const s = all.find(x => x.id === id);
    if (!s) return;
    el('modal-sale-title').textContent = 'Editar Venda';
    el('sale-edit-id').value = id;
    el('sale-date').value = s.date;
    el('sale-product').value = s.product;
    el('sale-status').value = s.status;
    el('sale-gross').value = s.gross;
    el('sale-cost').value = s.cost || 0;
    el('sale-shipping').value = s.shipping || 0;
    el('sale-fee').value = s.fee || 0;
    el('sale-obs').value = s.obs || '';
    updateSaleProfitPreview();
    openModal('modal-sale');
};

window.deleteSale = (id) => {
    showConfirm('Excluir Venda', 'Tem certeza que deseja excluir esta venda?', async () => {
        await withLoading(async () => {
            await DB.sales.delete(id);
            showToast('🗑️ Venda excluída');
            await refreshSalesModule();
        });
    });
};

/* =========================================
   REPORTS MODULE
   ========================================= */
async function refreshReports() {
    await applyReportFilters();
}

async function applyReportFilters() {
    await withLoading(async () => {
        let [ads, sales] = await Promise.all([DB.ads.getAll(), DB.sales.getAll()]);

        const dateFrom = el('report-date-from').value;
        const dateTo = el('report-date-to').value;
        const platform = el('report-platform').value;
        const status = el('report-status').value;
        const product = el('report-product').value.trim().toLowerCase();

        if (dateFrom) { ads = ads.filter(a => a.date >= dateFrom); sales = sales.filter(s => s.date >= dateFrom); }
        if (dateTo) { ads = ads.filter(a => a.date <= dateTo); sales = sales.filter(s => s.date <= dateTo); }
        if (platform) ads = ads.filter(a => a.platform === platform);
        if (status) sales = sales.filter(s => s.status === status);
        if (product) sales = sales.filter(s => (s.product || '').toLowerCase().includes(product));

        const delivered = sales.filter(s => s.status === 'Entregue');
        const cancelled = sales.filter(s => s.status === 'Cancelado');
        const nonCancelled = sales.filter(s => s.status !== 'Cancelado');
        const grossRev = nonCancelled.reduce((s, x) => s + Number(x.gross || 0), 0);
        // Custos diretos de venda (sem comissão)
        const totalFeeRep = nonCancelled.reduce((s, x) => s + Number(x.fee || 0), 0);
        const totalShipRep = nonCancelled.reduce((s, x) => s + Number(x.shipping || 0), 0);
        const totalCostRep = sales.reduce((s, x) => s + Number(x.cost || 0), 0);
        const totalCustos = totalFeeRep + totalShipRep + totalCostRep;
        const netRev = grossRev - totalFeeRep - totalShipRep;
        const totalAds = ads.reduce((s, a) => s + Number(a.value || 0), 0);
        // Lucro Líquido = Bruto − Custo − Frete − Taxa − Anúncios
        const profit = netRev - totalCostRep - totalAds;
        const roas = totalAds > 0 ? grossRev / totalAds : 0;
        const cancelRate = sales.length > 0 ? cancelled.length / sales.length * 100 : 0;

        const kpis = {
            'Total de Pedidos': sales.length,
            'Pedidos Entregues': delivered.length,
            'Pedidos Cancelados': cancelled.length,
            'Taxa de Cancelamento': `${fmtN(cancelRate, 1)}%`,
            'Faturamento Bruto': fmt(grossRev),
            'Total de Custos (Custo+Frete+Taxa)': fmt(totalCustos),
            'Total em Anúncios': fmt(totalAds),
            '💰 Lucro Líquido': fmt(profit),
            'ROAS': `${fmtN(roas)}x`,
        };

        el('report-summary').innerHTML = Object.entries(kpis).map(([k, v]) => `
      <div class="report-summary-card"><span class="label">${k}</span><span class="value">${v}</span></div>
    `).join('');

        // By product
        const productMap = {};
        sales.forEach(s => {
            if (!productMap[s.product]) productMap[s.product] = { count: 0, delivered: 0, cancelled: 0, gross: 0, profit: 0 };
            productMap[s.product].count++;
            if (s.status === 'Entregue') { productMap[s.product].delivered++; productMap[s.product].gross += Number(s.gross || 0); }
            if (s.status === 'Cancelado') productMap[s.product].cancelled++;
            productMap[s.product].profit += calcSaleProfit(s);
        });
        const productRows = Object.entries(productMap).sort((a, b) => b[1].gross - a[1].gross);
        el('report-product-tbody').innerHTML = productRows.length
            ? productRows.map(([name, d]) => `<tr><td>${name}</td><td>${d.count}</td><td>${d.delivered}</td><td>${d.cancelled}</td><td>${fmt(d.gross)}</td><td class="${d.profit >= 0 ? 'text-green' : 'text-red'}">${fmt(d.profit)}</td></tr>`).join('')
            : `<tr class="empty-row"><td colspan="6">Sem dados</td></tr>`;

        // By campaign
        const campMap = {};
        ads.forEach(a => {
            const key = a.campaign || '(sem nome)';
            if (!campMap[key]) campMap[key] = { platform: a.platform, total: 0 };
            campMap[key].total += Number(a.value || 0);
        });
        const campRows = Object.entries(campMap).sort((a, b) => b[1].total - a[1].total);
        el('report-campaign-tbody').innerHTML = campRows.length
            ? campRows.map(([name, d]) => `<tr><td>${name}</td><td>${platformBadge(d.platform)}</td><td>${fmt(d.total)}</td><td>${fmtN(roas)}x</td></tr>`).join('')
            : `<tr class="empty-row"><td colspan="4">Sem dados</td></tr>`;

        window._lastReportKpis = kpis;
        window._lastReportAds = ads;
        window._lastReportSales = sales;
    });
}

function initReports() {
    el('btn-apply-report').addEventListener('click', applyReportFilters);
    el('btn-export-pdf').addEventListener('click', async () => {
        try {
            await Exporter.exportPDF('Relatório Completo', window._lastReportAds || [], window._lastReportSales || [], window._lastReportKpis || {}, globalMonth);
            showToast('📄 PDF exportado!');
        } catch (e) { showToast('❌ Erro ao exportar PDF: ' + e.message); }
    });
    el('btn-export-excel').addEventListener('click', async () => {
        Exporter.exportFull(window._lastReportAds || [], window._lastReportSales || [], window._lastReportKpis || {});
        showToast('📊 Excel completo exportado!');
    });
}

/* =========================================
   SIMULATOR (sync, no DB needed)
   ========================================= */
function runSimulator() {
    const investment = parseFloat(el('sim-investment').value) || 0;
    const conversion = parseFloat(el('sim-conversion').value) || 0;
    const ticket = parseFloat(el('sim-ticket').value) || 0;
    const cost = parseFloat(el('sim-cost').value) || 0;
    const platformFee = parseFloat(el('sim-platform-fee').value) || 0;
    const cancelRate = parseFloat(el('sim-cancel-rate').value) || 0;
    const shipping = parseFloat(el('sim-shipping').value) || 0;
    const goal = parseFloat(el('sim-goal').value) || 100000;
    if (investment <= 0 || ticket <= 0) return;

    const clicks = investment / 1.5;
    const salesPerDay = clicks * (conversion / 100);
    const delivered = salesPerDay * (1 - cancelRate / 100);
    const grossDay = delivered * ticket;
    const netDay = grossDay - delivered * ticket * (platformFee / 100) - delivered * shipping - delivered * cost - investment;
    const grossMonth = grossDay * 30;
    const netMonth = netDay * 30;
    const roas = investment > 0 ? (grossDay / investment) : 0;
    const daysToGoal = netDay > 0 ? Math.ceil(goal / netDay) : Infinity;
    const pct = netMonth > 0 ? Math.min((netMonth / goal) * 100, 100) : 0;

    el('sim-clicks').textContent = fmtN(clicks, 0);
    el('sim-sales-day').textContent = fmtN(salesPerDay, 1);
    el('sim-revenue-day').textContent = fmt(grossDay);
    el('sim-profit-day').textContent = fmt(netDay);
    el('sim-revenue-month').textContent = fmt(grossMonth);
    el('sim-profit-month').textContent = fmt(netMonth);
    el('sim-roas').textContent = `${fmtN(roas)}x`;
    el('sim-days-goal').textContent = isFinite(daysToGoal) ? `${daysToGoal} dias` : '∞';
    el('sim-goal-pct').textContent = `${fmtN(pct, 1)}%`;
    el('sim-goal-fill').style.width = `${Math.max(pct, 0)}%`;

    const labels = Array.from({ length: 30 }, (_, i) => `D${i + 1}`);
    let cumulative = 0;
    Charts.updateSimulatorChart('chart-simulator', labels, labels.map(() => { cumulative += netDay; return cumulative; }));
}

function initSimulator() {
    el('btn-simulate').addEventListener('click', runSimulator);
    ['sim-investment', 'sim-conversion', 'sim-ticket', 'sim-cost', 'sim-platform-fee', 'sim-cancel-rate', 'sim-shipping', 'sim-goal'].forEach(id => {
        el(id)?.addEventListener('input', () => { clearTimeout(initSimulator._t); initSimulator._t = setTimeout(runSimulator, 400); });
    });
}

/* =========================================
   SETTINGS
   ========================================= */
async function refreshSettings() {
    const settings = await DB.settings.get();
    el('settings-goal').value = settings.goal || 100000;
}

function initSettings() {
    const saveGoalBtn = el('btn-save-goal');
    if (saveGoalBtn) {
        saveGoalBtn.addEventListener('click', async () => {
            await withLoading(async () => {
                const settings = await DB.settings.get();
                settings.goal = parseFloat(el('settings-goal').value) || 100000;
                await DB.settings.save(settings);
                showToast('✅ Meta salva no Supabase!');
            });
        });
    }

    const exportBackupBtn = el('btn-export-backup');
    if (exportBackupBtn) {
        exportBackupBtn.addEventListener('click', async () => {
            await withLoading(async () => {
                const data = JSON.stringify(await DB.exportAll(), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `cod_backup_${new Date().toISOString().slice(0, 10)}.json`;
                a.click(); URL.revokeObjectURL(url);
                showToast('💾 Backup exportado do Supabase!');
            });
        });
    }

    const importBackupBtn = el('btn-import-backup');
    if (importBackupBtn) importBackupBtn.addEventListener('click', () => el('backup-file-input').click());

    const backupFileInput = el('backup-file-input');
    if (backupFileInput) {
        backupFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    showConfirm('Importar Backup', 'Isso substituirá TODOS os dados atuais no Supabase. Continuar?', async () => {
                        await withLoading(async () => {
                            await DB.importAll(data);
                            showToast('✅ Backup importado para o Supabase!');
                            await navigate(currentTab);
                        });
                    });
                } catch { showToast('❌ Arquivo inválido.'); }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    const clearDataBtn = el('btn-clear-data');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            showConfirm('⚠️ Apagar Todos os Dados', 'Todos os dados no Supabase serão apagados permanentemente!', async () => {
                await withLoading(async () => {
                    await supabaseClient.from('ads').delete().not('id', 'is', null);
                    await supabaseClient.from('sales').delete().not('id', 'is', null);
                    showToast('🗑️ Dados apagados do Supabase.');
                    await navigate(currentTab);
                });
            });
        });
    }
}

/* =========================================
   INIT
   ========================================= */
async function initApp() {
    initMonthSelector();
    initClock();
    initNav();
    initAdsModule();
    initSalesModule();
    initReports();
    initSimulator();
    initSettings();
    await refreshDashboard();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initAuth();
    } catch (err) {
        console.error('Erro ao inicializar:', err);
        showToast('❌ Erro ao conectar com o banco de dados: ' + err.message);
    }
});
