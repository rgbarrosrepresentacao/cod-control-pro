/**
 * COD Control Pro – Charts Module
 */

const Charts = (() => {
    const defaults = {
        animation: { duration: 600 },
        plugins: {
            legend: {
                labels: { color: '#8b9cb8', font: { family: 'Inter', size: 12 }, boxWidth: 12 }
            },
            tooltip: {
                backgroundColor: '#161f2e',
                titleColor: '#f0f4ff',
                bodyColor: '#8b9cb8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
            }
        },
        scales: {
            x: {
                ticks: { color: '#4d5e77', font: { family: 'Inter', size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
                ticks: { color: '#4d5e77', font: { family: 'Inter', size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' }
            }
        }
    };

    const instances = {};

    function destroy(id) {
        if (instances[id]) { instances[id].destroy(); delete instances[id]; }
    }

    function createLineChart(id, labels, datasets) {
        destroy(id);
        const ctx = document.getElementById(id);
        if (!ctx) return;
        instances[id] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                ...defaults,
                responsive: true,
                maintainAspectRatio: true,
                elements: { line: { tension: 0.4 }, point: { radius: 4, hoverRadius: 6 } },
                plugins: { ...defaults.plugins },
                scales: defaults.scales,
            }
        });
    }

    function createBarChart(id, labels, datasets) {
        destroy(id);
        const ctx = document.getElementById(id);
        if (!ctx) return;
        instances[id] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                ...defaults,
                responsive: true,
                maintainAspectRatio: true,
                plugins: { ...defaults.plugins },
                scales: {
                    ...defaults.scales,
                    x: { ...defaults.scales.x, grid: { display: false } }
                }
            }
        });
    }

    function createDoughnutChart(id, labels, data, colors) {
        destroy(id);
        const ctx = document.getElementById(id);
        if (!ctx) return;
        instances[id] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors, borderColor: '#111827', borderWidth: 3, hoverOffset: 8 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '68%',
                plugins: {
                    legend: { position: 'right', ...defaults.plugins.legend },
                    tooltip: defaults.plugins.tooltip,
                }
            }
        });
    }

    function updateRevenueChart(data) {
        // data: array of { date, gross, net }
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const labels = sorted.map(d => d.date.slice(8)); // day
        createLineChart('chart-revenue', labels, [
            {
                label: 'Faturamento Bruto',
                data: sorted.map(d => d.gross),
                borderColor: '#0A84FF',
                backgroundColor: 'rgba(10,132,255,0.12)',
                fill: true,
            },
            {
                label: 'Faturamento Líquido',
                data: sorted.map(d => d.net),
                borderColor: '#00E5A0',
                backgroundColor: 'rgba(0,229,160,0.08)',
                fill: true,
            }
        ]);
    }

    function updateAdsChart(data) {
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const labels = sorted.map(d => d.date.slice(8));
        createBarChart('chart-ads', labels, [
            {
                label: 'Gasto em Anúncios',
                data: sorted.map(d => d.value),
                backgroundColor: 'rgba(239,68,68,0.7)',
                borderColor: '#ef4444',
                borderWidth: 1,
                borderRadius: 6,
            }
        ]);
    }

    function updateProfitChart(data) {
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const labels = sorted.map(d => d.date.slice(8));
        createLineChart('chart-profit', labels, [
            {
                label: 'Lucro Diário',
                data: sorted.map(d => d.profit),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.1)',
                fill: true,
            }
        ]);
    }

    function updateComparisonChart(salesData, adsData) {
        const allDates = [...new Set([
            ...salesData.map(d => d.date),
            ...adsData.map(d => d.date)
        ])].sort();

        const salesMap = Object.fromEntries(salesData.map(d => [d.date, d.gross]));
        const adsMap = Object.fromEntries(adsData.map(d => [d.date, d.value]));

        createBarChart('chart-comparison', allDates.map(d => d.slice(8)), [
            {
                label: 'Receita Bruta',
                data: allDates.map(d => salesMap[d] || 0),
                backgroundColor: 'rgba(10,132,255,0.7)',
                borderColor: '#0A84FF', borderWidth: 1, borderRadius: 6,
            },
            {
                label: 'Gasto em Anúncios',
                data: allDates.map(d => adsMap[d] || 0),
                backgroundColor: 'rgba(239,68,68,0.7)',
                borderColor: '#ef4444', borderWidth: 1, borderRadius: 6,
            }
        ]);
    }

    function updateStatusChart(delivered, cancelled, separated, scheduled) {
        createDoughnutChart(
            'chart-status',
            ['Entregues', 'Cancelados', 'Separados', 'Agendados'],
            [delivered, cancelled, separated, scheduled],
            ['#22c55e', '#ef4444', '#0A84FF', '#f97316']
        );
    }

    function updateSimulatorChart(id, labels, profitData) {
        destroy(id);
        const ctx = document.getElementById(id);
        if (!ctx) return;
        instances[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Lucro Acumulado Projetado',
                    data: profitData,
                    borderColor: '#00E5A0',
                    backgroundColor: 'rgba(0,229,160,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { ...defaults.plugins },
                scales: defaults.scales,
            }
        });
    }

    return {
        updateRevenueChart, updateAdsChart, updateProfitChart,
        updateComparisonChart, updateStatusChart, updateSimulatorChart,
        destroy,
    };
})();
