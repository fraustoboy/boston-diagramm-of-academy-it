// ===== BCG MATRIX with Supabase + Realtime =====

// Пороги квадрантов
const SHARE_SPLIT = 1.0;   // вертикальная граница: относительная доля рынка (можно поставить 0.5)
const GROWTH_SPLIT = 10;   // горизонтальная граница: % роста рынка

let products = [];
let chart;

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
function log(msg){ let b=document.getElementById('appLog'); if(!b){b=document.createElement('div');b.id='appLog';b.style='position:fixed;right:8px;bottom:8px;background:#111;color:#fff;padding:8px 10px;border-radius:8px;font:12px system-ui;z-index:9999;opacity:.9';document.body.appendChild(b);} b.textContent=String(msg); }
function logErr(p,e){ console.error(p,e); log(`${p}: ${e?.message || e}`); }

// === Плагин Chart.js: подложка квадрантов + линии + подписи ===
const bcgQuadrants = {
  id: 'bcgQuadrants',
  beforeDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;

    const x = scales.x, y = scales.y;
    const xSplit = x.getPixelForValue(SHARE_SPLIT);
    const ySplit = y.getPixelForValue(GROWTH_SPLIT);

    const quads = [
      { x0: chartArea.left,  y0: chartArea.top,    x1: xSplit,          y1: ySplit,            fill: 'rgba(255, 99, 132, 0.10)'}, // Звёзды
      { x0: xSplit,          y0: chartArea.top,    x1: chartArea.right, y1: ySplit,            fill: 'rgba(255, 206, 86, 0.12)'}, // Дойные коровы
      { x0: chartArea.left,  y0: ySplit,           x1: xSplit,          y1: chartArea.bottom,  fill: 'rgba(75, 192, 192, 0.10)'}, // Трудные дети
      { x0: xSplit,          y0: ySplit,           x1: chartArea.right, y1: chartArea.bottom,  fill: 'rgba(201, 203, 207, 0.12)'}  // Собаки
    ];

    quads.forEach(q => { ctx.save(); ctx.fillStyle = q.fill; ctx.fillRect(q.x0, q.y0, q.x1-q.x0, q.y1-q.y0); ctx.restore(); });

    // Линии
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(xSplit, chartArea.top);    ctx.lineTo(xSplit, chartArea.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chartArea.left, ySplit);   ctx.lineTo(chartArea.right, ySplit);  ctx.stroke();
    ctx.restore();

    // Подписи квадрантов
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Звёзды',        chartArea.left + 10, y.top + 14);
    ctx.fillText('Дойные коровы', xSplit + 10,         y.top + 14);
    ctx.fillText('Трудные дети',  chartArea.left + 10, ySplit + 14);
    ctx.fillText('Собаки',        xSplit + 10,         ySplit + 14);
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
    .order('id', { ascending: true });
  if (error) return logErr('Ошибка загрузки', error);

  products = data || [];
  renderList();
  renderChart();
  log('Данные загружены');
}

async function addProduct(){
  const name = (els.name()?.value || '').trim();
  const marketShare  = parseFloat(els.share()?.value);
  const marketGrowth = parseFloat(els.growth()?.value);
  const size         = parseFloat(els.size()?.value);

  if (!name || isNaN(marketShare) || isNaN(marketGrowth) || isNaN(size)) {
    return log('Заполни все поля корректно');
  }

  const { error } = await supabase
    .from('products')
    .insert([{ name, marketShare, marketGrowth, size }]);
  if (error) return logErr('Ошибка добавления', error);

  els.name().value = '';
  els.share().value = '';
  els.growth().value = '';
  els.size().value = '';
}

async function deleteProduct(id){
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return logErr('Ошибка удаления', error);
}

// === Realtime ===
function enableRealtime(){
  supabase
    .channel('products-changes')
    .on('postgres_changes', { event:'*', schema:'public', table:'products' }, loadProducts)
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
    x: Number(p.marketShare),   // ожидаем 0…1 (относительная доля)
    y: Number(p.marketGrowth),  // ожидаем −100…100 (% роста)
    r: Math.max(4, Math.sqrt(Math.max(0, Number(p.size))) * 0.8) // масштаб пузыря
  }));

  const datasets = points.map(pt => ({
    label: pt.label,
    data: [{ x: pt.x, y: pt.y, r: pt.r }]
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
          min: 0,
          max: 1,                          // <<< ИЗМЕНЕНО: диапазон X 0…1
          grid: { color: 'rgba(0,0,0,.05)' },
          ticks: { stepSize: 0.1 }
        },
        y: {
          title: { display: true, text: 'Темп роста рынка (%)' },
          min: -100,
          max: 100,
          grid: { color: 'rgba(0,0,0,.05)' },
          ticks: { stepSize: 10, callback: (v) => `${v}%` }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const d = c.raw;
              const name = c.dataset.label;
              const approxSize = Math.round((d.r ** 2) / 0.64);
              return `${name}: доля ${d.x}, рост ${d.y}%, размер ~${approxSize}`;
            }
          }
        }
      }
    },
    plugins: [bcgQuadrants]
  });
}
