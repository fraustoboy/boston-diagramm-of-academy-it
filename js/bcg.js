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
  size:   () => document.getElementById('marketSize'),

  canvas: () => document.getElementById('bcgChart'),
  list:   () => document.getElementById('productList'),

  slug:   () => document.getElementById('page-slug'),
  title:  () => document.getElementById('page-title'),
  subttl: () => document.getElementById('page-subtitle'),
  intro:  () => document.getElementById('intro'),
};

function logErr(...args){ console.error('[BCG]', ...args); }
function log(...args){ console.log('[BCG]', ...args); }

// === CRUD заглушки/пример данных ===
// Здесь могут быть реальные вызовы Supabase/REST; для примера используем локальное хранилище
function loadProducts(){
  try {
    const raw = localStorage.getItem(`bcg-${PAGE}`) || '[]';
    products = JSON.parse(raw);
  } catch(e){
    logErr('loadProducts error', e);
    products = [];
  }
}

function saveProducts(){
  try {
    localStorage.setItem(`bcg-${PAGE}`, JSON.stringify(products));
  } catch(e){
    logErr('saveProducts error', e);
  }
}

function addProduct(p){
  products.push({ id: crypto.randomUUID(), ...p });
  saveProducts(); renderAll();
}

function deleteProduct(id){
  products = products.filter(p => p.id !== id);
  saveProducts(); renderAll();
}

// === Рисуем квадранты поверх чарта ===
const bcgQuadrants = {
  id: 'bcgQuadrants',
  afterDraw: (chart, args, opts) => {
    const { ctx, chartArea } = chart;
    const { left, right, top, bottom } = chartArea;
    const midX = chart.scales.x.getPixelForValue(SHARE_SPLIT);
    const midY = chart.scales.y.getPixelForValue(GROWTH_SPLIT);

    ctx.save();
    // Фон квадрантов
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    ctx.fillRect(left, top, right - left, bottom - top);

    // Разделительные линии
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.25;

    // Вертикальная
    ctx.beginPath(); ctx.moveTo(midX, top); ctx.lineTo(midX, bottom); ctx.stroke();
    // Горизонтальная
    ctx.beginPath(); ctx.moveTo(left, midY); ctx.lineTo(right, midY); ctx.stroke();

    // Подписи квадрантов
    ctx.fillStyle = '#333';
    ctx.font = '600 12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    const pad = 10;
    const UL = { x0: left, x1: midX, y0: top,  y1: midY, label: 'Звезды' };
    const UR = { x0: midX, x1: right, y0: top, y1: midY, label: 'Трудные дети' };
    const LR = { x0: midX, x1: right, y0: midY, y1: bottom, label: 'Собаки' };
    const LL = { x0: left, x1: midX, y0: midY, y1: bottom, label: 'Дойные коровы' };

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

// === Рендер списка ===
function renderList(){
  const box = els.list(); if (!box) return;
  box.innerHTML = '';
  products.forEach(p => {
    const row = document.createElement('div');
    row.className = 'product-row';
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
        // ВАЖНО: надписи видны всегда, без наведения
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
          display: true,
          align: 'center',
          color: '#000',
          font: { size: 12, weight: '600' },
          formatter: (value, ctx) => {
            const name = ctx.dataset?.label ?? '';
            const d = value;
            return `${name}\n${d.x}, ${d.y}%`;
          }
        }
      }
    },
    // Подключаем плагин квадрантов и DataLabels
    plugins: [bcgQuadrants, ChartDataLabels]
  });
}

// === Рендер всего ===
function renderAll(){
  renderList();
  renderChart();
}

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  renderAll();

  // Пример обработки формы
  const form = els.form();
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name   = (els.name()?.value || '').trim();
      const share  = Number(els.share()?.value || 0);
      const growth = Number(els.growth()?.value || 0);
      const size   = Number(els.size()?.value || 0);
      if (!name) return;

      addProduct({ name, marketShare: share, marketGrowth: growth, size });
      form.reset();
    });
  }
});
