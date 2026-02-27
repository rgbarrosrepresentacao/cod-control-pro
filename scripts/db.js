/**
 * COD Control Pro – Database Layer (Supabase)
 * Usa supabaseClient (definido em supabase-config.js)
 */

const DB = (() => {

  // ---- ERROR HANDLER ----
  function handleError(err, context) {
    console.error(`[DB Error] ${context}:`, err);
    throw new Error(`Erro ao ${context}: ${err.message}`);
  }

  // ---- MONTH FILTER ----
  function filterByMonth(items, ym) {
    if (!ym) return items;
    return items.filter(i => i.date && i.date.startsWith(ym));
  }

  // ================================================================
  // ADS
  // ================================================================
  const ads = {
    async getAll() {
      const { data, error } = await supabaseClient
        .from('ads')
        .select('*')
        .order('date', { ascending: false });
      if (error) handleError(error, 'buscar anúncios');
      return data || [];
    },

    async add(ad) {
      const { data, error } = await supabaseClient
        .from('ads')
        .insert([{
          date: ad.date,
          platform: ad.platform,
          value: Number(ad.value) || 0,
          campaign: ad.campaign || null,
          obs: ad.obs || null,
        }])
        .select()
        .single();
      if (error) handleError(error, 'inserir anúncio');
      return data;
    },

    async update(id, ad) {
      const { error } = await supabaseClient
        .from('ads')
        .update({
          date: ad.date,
          platform: ad.platform,
          value: Number(ad.value) || 0,
          campaign: ad.campaign || null,
          obs: ad.obs || null,
        })
        .eq('id', id);
      if (error) handleError(error, 'atualizar anúncio');
    },

    async delete(id) {
      const { error } = await supabaseClient
        .from('ads')
        .delete()
        .eq('id', id);
      if (error) handleError(error, 'excluir anúncio');
    },
  };

  // ================================================================
  // SALES
  // ================================================================
  const sales = {
    async getAll() {
      const { data, error } = await supabaseClient
        .from('sales')
        .select('*')
        .order('date', { ascending: false });
      if (error) handleError(error, 'buscar vendas');
      return data || [];
    },

    async add(sale) {
      const { data, error } = await supabaseClient
        .from('sales')
        .insert([{
          date: sale.date,
          product: sale.product,
          status: sale.status,
          gross: Number(sale.gross) || 0,
          commission: Number(sale.commission) || 0,
          cost: Number(sale.cost) || 0,
          shipping: Number(sale.shipping) || 0,
          fee: Number(sale.fee) || 0,
          profit: Number(sale.profit) || 0,
          obs: sale.obs || null,
        }])
        .select()
        .single();
      if (error) handleError(error, 'inserir venda');
      return data;
    },

    async update(id, sale) {
      const { error } = await supabaseClient
        .from('sales')
        .update({
          date: sale.date,
          product: sale.product,
          status: sale.status,
          gross: Number(sale.gross) || 0,
          commission: Number(sale.commission) || 0,
          cost: Number(sale.cost) || 0,
          shipping: Number(sale.shipping) || 0,
          fee: Number(sale.fee) || 0,
          profit: Number(sale.profit) || 0,
          obs: sale.obs || null,
        })
        .eq('id', sale.id || id);
      if (error) handleError(error, 'atualizar venda');
    },

    async delete(id) {
      const { error } = await supabaseClient
        .from('sales')
        .delete()
        .eq('id', id);
      if (error) handleError(error, 'excluir venda');
    },
  };

  // ================================================================
  // SETTINGS (single row, always id=1)
  // ================================================================
  const settings = {
    async get() {
      try {
        const { data, error } = await supabaseClient
          .from('settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        if (error || !data) {
          return { goal: 100000 };
        }
        return { goal: Number(data.goal) || 100000 };
      } catch (e) {
        console.warn('[Settings] Falha ao buscar, usando padrão:', e.message);
        return { goal: 100000 };
      }
    },

    async save(s) {
      const { error } = await supabaseClient
        .from('settings')
        .upsert([{ id: 1, goal: s.goal }]);
      if (error) console.warn('[Settings] Supabase save failed:', error.message);
    },
  };

  // ================================================================
  // BACKUP / RESTORE
  // ================================================================
  async function exportAll() {
    const [adsData, salesData, settingsData] = await Promise.all([
      ads.getAll(),
      sales.getAll(),
      settings.get(),
    ]);
    return {
      ads: adsData,
      sales: salesData,
      settings: settingsData,
      exportedAt: new Date().toISOString(),
    };
  }

  async function importAll(data) {
    if (data.ads && data.ads.length > 0) {
      await supabaseClient.from('ads').delete().not('id', 'is', null);
      const cleanAds = data.ads.map(a => ({
        date: a.date, platform: a.platform, value: Number(a.value) || 0,
        campaign: a.campaign || null, obs: a.obs || null,
      }));
      await supabaseClient.from('ads').insert(cleanAds);
    }
    if (data.sales && data.sales.length > 0) {
      await supabaseClient.from('sales').delete().not('id', 'is', null);
      const cleanSales = data.sales.map(s => ({
        date: s.date, product: s.product, status: s.status,
        gross: Number(s.gross) || 0, commission: Number(s.commission) || 0,
        cost: Number(s.cost) || 0, shipping: Number(s.shipping) || 0,
        fee: Number(s.fee) || 0, profit: Number(s.profit) || 0, obs: s.obs || null,
      }));
      await supabaseClient.from('sales').insert(cleanSales);
    }
    if (data.settings) await settings.save(data.settings);
  }

  return { ads, sales, settings, filterByMonth, exportAll, importAll };
})();
