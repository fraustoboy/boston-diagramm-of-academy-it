// ===== BCG MATRIX with Supabase + Realtime =====

// Пороги квадрантов
const SHARE_SPLIT  = 0.5;  // вертикальная граница по оси X (0..1)
const GROWTH_SPLIT = 10;   // горизонтальная граница по оси Y (-100..100), в процентах

let products = [];
let chart;

// Текущая страница (slug) передана из index.html через window.PAGE_SLUG
const PAGE = (window.PAGE_SLUG || 'page1');

// Удобные селекторы
const els = {
  form:   () => document.getElementById('productForm'),
  name:   () => document.getElementById('productName'),
  share:  () => document.getElementById('marketShare'),
  growth: () => document.getElementById('marketGrowth'),
  size:   () => document.getElementById('productSize'),
  list:   () => document.getElementById('productsList'),
  canvas: () => document.getElementById('bcgChart'),
};

// Мини-лог
function log(msg){
  let b = document.getElementById('appLog');
  if (!b) {
    b = document.createElement('div');
    b.id = 'appLog';
    b.style = 'position:fixed;right:8px;bottom:8px;background:#111;color:#fff;padding:8px 10px;border-radius:8px;font:12px system-ui;z-index:9999;opacity:.9';
    document.body.appendChild(b);
  }
  b.textContent = String(msg);
}
function logErr(p,e){ console.error(p,e); log(`${p}: ${e?.message || e}`); }

// === Плагин: квадранты + подписи по центру (логика BCG корректная) ===
const bcgQuadrants = {
  id: 'bcgQuadrants',
  beforeDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;

    const x = scales.x, y = scales.y;
    const xSplit = x.getPixelForValue(SHARE_SPLIT);
    const ySplit = y.getPixelForValue(GROWTH_SPLIT);

    // Цвета под легенду:
    const COLOR_STARS   = 'rgba(255, 99, 132, 0.10)';  // розовый
    const COLOR_COWS    = 'rgba(255, 206, 86, 0.12)';  // жёлтый
    const COLOR_CHILD   = 'rgba(75, 192, 192, 0.10)';  // бирюзовый
    const COLOR_DOGS    = 'rgba(201, 203, 207, 0.12)'; // серый

    // Квадранты по правилам:
    // Верх-лево: высокий рост, низкая доля  → Трудные дети
    const UL = { x0: chartArea.left,  y0: chartArea.top,    x1: xSplit,          y1: ySplit,           fill: COLOR_CHILD, label: 'Трудные дети' };
    // Верх-право: высокий рост, высокая доля → Звезды
    const UR = { x0: xSplit,          y0: chartArea.top,    x1: chartArea.right, y1: ySplit,           fill: COLOR_STARS, label: 'Звезды' };
    // Низ-право: низкий рост, высокая доля   → Дойные коровы
    const LR = { x0: xSplit,          y0: ySplit,           x1: chartArea.right, y1: chartArea.bottom, fill: COLOR_COWS,  label: 'Дойные коровы' };
    // Низ-лево: низкий рост, низкая доля     → Собаки
    const LL = { x0: chartArea.left,  y0: ySplit,           x1: xSplit,          y1: chartArea.bottom, fill: COLOR_DOGS,  label: 'Собаки' };

    [UL, UR, LR, LL].forEach(q => {
      ctx.save();
      ctx.fillStyle = q.fill;
      ctx.fillRect(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0);
      ctx.restore();
    });

    // Разделительные линии
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(xSplit, chartArea.top);    ctx.lineTo(xSplit, chartArea.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chartArea.left, ySplit);   ctx.lineTo(chartArea.right, ySplit);  ctx.stroke();
    ctx.restore();

    // Подписи по центрам квадрантов
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const center = q => ({ cx: (q.x0 + q.x1) / 2, cy: (q.y0 + q.y1) / 2 });
    [UL, UR, LR, LL].forEach(q => {
      const { cx, cy } = center(q);
      ctx.fillText(q.label, cx, cy);
    });
    ctx.restore();
  }
};

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
  if (!window.supabase) { logErr('Supabase не инициализирован', 'проверь <script> в index.html'); return; }
  wireHandlers();
  enableRealtime();
  loadProducts();
});

// === Обработчики ===
function wireHandlers(){
  const form = els.form();
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await addProduct();
    });
  }
}

// === CRUD Supabase ===
async function loadProducts(){
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('page_slug', PAGE)
    .order('id', { ascending: true });
  if (error) return logErr('Ошибка загрузки', error);

  products = data || [];
  renderList();
  renderChart();
  log('Данные загружены');
}

async function addProduct(){
  const name = (els.name()?.value || '').trim();
  const marketShare  = parseFloat(els.share()?.value);   // 0..1
  const marketGrowth = parseFloat(els.growth()?.value);  // -100..100
  const size         = parseFloat(els.size()?.value);

  if (!name || isNaN(marketShare) || isNaN(marketGrowth) || isNaN(size)) {
    return log('Заполни все поля корректно');
  }

  const { error } = await supabase
    .from('products')
    .insert([{ name, marketShare, marketGrowth, size, page_slug: PAGE }]);
  if (error) return logErr('Ошибка добавления', error);

  els.name().value = '';
  els.share().value = '';
  els.growth().value = '';
  els.size().value = '';
}

async function deleteProduct(id){
  const { error } = await supabase.from('products').delete().eq('id', id).eq('page_slug', PAGE);
  if (error) return logErr('Ошибка удаления', error);
}

// === Realtime ===
function enableRealtime(){
  supabase
    .channel(`products-changes-${PAGE}`)
    .on('postgres_changes', { event:'*', schema:'public', table:'products', filter: `page_slug=eq.${PAGE}` }, loadProducts)
    .subscribe();
}

// === Рендер списка ===
function renderList(){
  const box = els.list(); if (!box) return;
  box.innerHTML = '';
  products.forEach(p => {
    const row = document.createElement('div');
    row.className = 'product-item';
    row.innerHTML = `
      <span><strong>${p.name}</strong> — доля: ${p.marketShare}, рост: ${p.marketGrowth}%, размер: ${p.size}</span>
      <button class="del" data-id="${p.id}" title="Удалить">❌</button>
    `;
    row.querySelector('.del').addEventListener('click', () => deleteProduct(p.id));
    box.appendChild(row);
  });
}

// === Рендер диаграммы (Chart.js Bubble) ===
function renderChart(){
  const ctx = els.canvas()?.getContext('2d'); if (!ctx) return;

  const points = products.map(p => ({
    label: p.name,
    x: Number(p.marketShare),   // 0..1
    y: Number(p.marketGrowth),  // -100..100
    r: Math.max(4, Math.sqrt(Math.max(0, Number(p.size))) * 0.8),
    size: Number(p.size)
  }));

  const datasets = points.map(pt => ({
    label: pt.label,
    data: [{ x: pt.x, y: pt.y, r: pt.r, size: pt.size }]
  }));

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bubble',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Относительная доля рынка (0…1)' },
          min: 0, max: 1,
          grid: { color: 'rgba(0,0,0,.05)' },
          ticks: { stepSize: 0.1 }
        },
        y: {
          title: { display: true, text: 'Темп роста рынка (%)' },
          min: -100, max: 100,
          grid: { color: 'rgba(0,0,0,.05)' },
          ticks: { stepSize: 10, callback: v => `${v}%` }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const d = c.raw;                // { x, y, r, size }
              const name = c.dataset.label;
              return `${name}: доля ${d.x}, рост ${d.y}%, размер ${d.size}`;
            }
          }
        },
        // ========== ПОСТОЯННЫЕ ПОДПИСИ НА ТОЧКАХ ==========
        datalabels: {
          display: true,
          align: 'top',
          anchor: 'center',
          offset: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 4,
          padding: { top: 4, bottom: 4, left: 6, right: 6 },
          font: {
            size: 11,
            weight: '600',
            family: 'Inter, system-ui, sans-serif'
          },
          color: '#333',
          formatter: (value, context) => {
            // Отображаем название продукта
            return context.dataset.label;
          }
        }
        // ===================================================
      }
    },
    plugins: [bcgQuadrants, ChartDataLabels]  // Добавили ChartDataLabels
  });
}
