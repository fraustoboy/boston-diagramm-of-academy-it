// === Настройки и элементы ===
let products = [];
let chart;

const els = {
  form: () => document.getElementById('productForm'),
  name: () => document.getElementById('productName'),
  share: () => document.getElementById('marketShare'),
  growth: () => document.getElementById('marketGrowth'),
  size: () => document.getElementById('productSize'),
  list: () => document.getElementById('productsList'),
  canvas: () => document.getElementById('bcgChart'),
};

// Лог в угол, чтобы видеть ошибки без консоли (необязательно)
function log(msg) {
  let box = document.getElementById('appLog');
  if (!box) {
    box = document.createElement('div');
    box.id = 'appLog';
    box.style = 'position:fixed;right:8px;bottom:8px;background:#111;color:#fff;padding:8px 10px;border-radius:8px;font:12px system-ui;z-index:9999;opacity:.9';
    document.body.appendChild(box);
  }
  box.textContent = String(msg);
}
function logErr(p, e) { console.error(p, e); log(`${p}: ${e?.message || e}`); }

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
  if (!window.supabase) { logErr('Supabase не инициализирован', 'проверь <script> в index.html'); return; }
  wireHandlers();
  enableRealtime();
  loadProducts();
});

// === Обработчики ===
function wireHandlers() {
  const form = els.form();
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await addProduct();
    });
  }
}

// === CRUD в Supabase ===
async function loadProducts() {
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

async function addProduct() {
  const name = (els.name()?.value || '').trim();
  const marketShare = parseFloat(els.share()?.value);
  const marketGrowth = parseFloat(els.growth()?.value);
  const size = parseFloat(els.size()?.value);

  if (!name || isNaN(marketShare) || isNaN(marketGrowth) || isNaN(size)) {
    return log('Заполни все поля корректно');
  }

  const { error } = await supabase.from('products').insert([{ name, marketShare, marketGrowth, size }]);
  if (error) return logErr('Ошибка добавления', error);

  els.name().value = '';
  els.share().value = '';
  els.growth().value = '';
  els.size().value = '';
}

async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return logErr('Ошибка удаления', error);
}

// === Realtime ===
function enableRealtime() {
  supabase
    .channel('products-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      loadProducts();
    })
    .subscribe();
}

// === Рендер списка ===
function renderList() {
  const box = els.list();
  if (!box) return;
  box.innerHTML = '';
  products.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'product-item';
    row.innerHTML = `
      <span><strong>${p.name}</strong> — доля: ${p.marketShare}%, рост: ${p.marketGrowth}%, размер: ${p.size}</span>
      <button class="del" data-id="${p.id}" title="Удалить">❌</button>
    `;
    row.querySelector('.del').addEventListener('click', () => deleteProduct(p.id));
    box.appendChild(row);
  });
}

// === Рендер BCG-матрицы (Chart.js Bubble) ===
function renderChart() {
  const ctx = els.canvas()?.getContext('2d');
  if (!ctx) return;

  // Преобразуем продукты -> точки пузырьковой диаграммы
  const points = products.map((p) => ({
    label: p.name,
    share: Number(p.marketShare),
    growth: Number(p.marketGrowth),
    size: Number(p.size),
    r: Math.max(4, Math.sqrt(Math.max(0, Number(p.size))) * 0.8), // масштаб пузыря
  }));

  const ds = points.map((pt) => ({
    label: pt.label,
    data: [{ x: pt.share, y: pt.growth, r: pt.r }],
  }));

  // Освобождаем старый график
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bubble',
    data: { datasets: ds },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Относительная доля рынка' },
          min: 0, max: 2, grid: { color: 'rgba(0,0,0,.05)' }
        },
        y: {
          title: { display: true, text: 'Темп роста рынка (%)' },
          min: -10, max: 40, grid: { color: 'rgba(0,0,0,.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = ctx.raw;
              const name = ctx.dataset.label;
              return `${name}: доля ${d.x}, рост ${d.y}%, размер ${Math.round(d.r**2 / 0.64)}`;
            }
          }
        }
      }
    }
  });
}
