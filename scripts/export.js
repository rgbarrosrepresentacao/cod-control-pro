/**
 * COD Control Pro – Export Module (PDF + Excel)
 */

const Exporter = (() => {
    const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // ---- EXCEL (XLSX) ----
    function toExcel(sheets, filename) {
        const wb = XLSX.utils.book_new();
        sheets.forEach(({ name, data }) => {
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, name);
        });
        XLSX.writeFile(wb, filename);
    }

    function exportAds(ads) {
        const header = ['ID', 'Data', 'Plataforma', 'Campanha', 'Valor (R$)', 'Observações'];
        const rows = ads.map(a => [a.id, a.date, a.platform, a.campaign || '', a.value, a.obs || '']);
        toExcel([{ name: 'Anúncios', data: [header, ...rows] }], 'cod_anuncios.xlsx');
    }

    function exportSales(sales) {
        const header = ['ID', 'Data', 'Produto', 'Bruto (R$)', 'Comissão (R$)', 'Status', 'Custo (R$)', 'Frete (R$)', 'Taxa (R$)', 'Lucro (R$)', 'Observações'];
        const rows = sales.map(s => [
            s.id, s.date, s.product, s.gross, s.commission || 0,
            s.status, s.cost || 0, s.shipping || 0, s.fee || 0, s.profit || 0, s.obs || ''
        ]);
        toExcel([{ name: 'Vendas', data: [header, ...rows] }], 'cod_vendas.xlsx');
    }

    function exportFull(ads, sales, kpis) {
        const adsHeader = ['Data', 'Plataforma', 'Campanha', 'Valor (R$)', 'Observações'];
        const adsRows = ads.map(a => [a.date, a.platform, a.campaign || '', a.value, a.obs || '']);

        const salesHeader = ['Data', 'Produto', 'Bruto (R$)', 'Comissão (R$)', 'Status', 'Custo (R$)', 'Frete (R$)', 'Taxa (R$)', 'Lucro (R$)'];
        const salesRows = sales.map(s => [s.date, s.product, s.gross, s.commission || 0, s.status, s.cost || 0, s.shipping || 0, s.fee || 0, s.profit || 0]);

        const kpiHeader = ['Indicador', 'Valor'];
        const kpiRows = Object.entries(kpis);

        toExcel([
            { name: 'Resumo KPIs', data: [kpiHeader, ...kpiRows] },
            { name: 'Vendas', data: [salesHeader, ...salesRows] },
            { name: 'Anúncios', data: [adsHeader, ...adsRows] },
        ], 'cod_relatorio_completo.xlsx');
    }

    // ---- PDF ----
    async function exportPDF(title, ads, sales, kpis, month) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.width;
        let y = 18;

        // Header
        doc.setFillColor(11, 17, 32);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setFontSize(16);
        doc.setTextColor(240, 244, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('COD Control Pro', 15, 12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(139, 156, 184);
        doc.text(title, 15, 21);
        doc.setTextColor(139, 156, 184);
        doc.text(`Período: ${month || 'Geral'}`, pageW - 15, 21, { align: 'right' });
        y = 38;

        // KPIs section
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(240, 244, 255);
        doc.text('Resumo de KPIs', 15, y); y += 7;

        const kpiRows = Object.entries(kpis).map(([k, v]) => [k, v]);
        doc.autoTable({
            startY: y,
            head: [['Indicador', 'Valor']],
            body: kpiRows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3, textColor: [30, 40, 60], font: 'helvetica' },
            headStyles: { fillColor: [10, 132, 255], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 244, 255] },
            margin: { left: 15, right: 15 },
        });
        y = doc.lastAutoTable.finalY + 10;

        // Sales section
        if (sales.length > 0) {
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.setTextColor(240, 244, 255);
            if (y > 230) { doc.addPage(); y = 18; }
            doc.text('Vendas', 15, y); y += 5;
            doc.autoTable({
                startY: y,
                head: [['Data', 'Produto', 'Bruto', 'Status', 'Lucro']],
                body: sales.map(s => [s.date, s.product, fmt(s.gross), s.status, fmt(s.profit || 0)]),
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2.5 },
                headStyles: { fillColor: [0, 229, 160], textColor: 20, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [240, 252, 248] },
                margin: { left: 15, right: 15 },
            });
            y = doc.lastAutoTable.finalY + 10;
        }

        // Ads section
        if (ads.length > 0) {
            if (y > 230) { doc.addPage(); y = 18; }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.setTextColor(240, 244, 255);
            doc.text('Anúncios', 15, y); y += 5;
            doc.autoTable({
                startY: y,
                head: [['Data', 'Plataforma', 'Campanha', 'Valor']],
                body: ads.map(a => [a.date, a.platform, a.campaign || '-', fmt(a.value)]),
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2.5 },
                headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [255, 244, 244] },
                margin: { left: 15, right: 15 },
            });
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(139, 156, 184);
            doc.text(`COD Control Pro – Gerado em ${new Date().toLocaleString('pt-BR')}`, 15, 290);
            doc.text(`Página ${i} de ${pageCount}`, pageW - 15, 290, { align: 'right' });
        }

        doc.save(`cod_relatorio_${month || 'geral'}.pdf`);
    }

    return { exportAds, exportSales, exportFull, exportPDF };
})();
