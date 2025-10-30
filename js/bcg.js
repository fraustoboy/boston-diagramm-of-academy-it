document.addEventListener('DOMContentLoaded', () => {
  boot();
});

let products = [];
const els = {
  list: () => document.getElementById('productsList'),
  btn: () => document.getElementById('addProductBtn'),
  name: () => document.getElementById('productName'),
  share: () => document.getElementById('marketShare'),
  growth: () => document.getElementById('marketGrowth'),
  size: () => document.getElementById('productSize'),
};

async function boot() {
  if (!window.supabase) { logErr('Supabase не инициализирован', 'Проверь порядок скриптов'); return; }
  log('Загружаю данные…');
  wireHandlers();
  await loadProductsFromSupabase();
  log('Готово');
}

function wireHandlers() {
  const b = els.btn();
  if (b) b.addEventListener('click', addProduct);
}

async function loadProductsFromSupabase() {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if (error) { logErr('Ошибка загрузки', error); return; }
  products = data || [];
  renderProductsList();
  updateChart();
}

async function addProduct() {
  const name = (els.name()?.value || '').trim();
  const marketShare = parseFloat(els.share()?.value);
  const marketGrowth = parseFloat(els.growth()?.value);
  const size = parseFloat(els.size()?.value);

  if (!name || isNaN(marketShare) || isNaN(marketGrowth) || isNaN(size)) {
    log('Заполни все поля корректно'); return;
  }
  const { error } = await supabase.from('products').insert([{ name, marketShare, marketGrowth, size }]);
  if (error) { logErr('Ошибка добавления', error); return; }

  if (els.name()) els.name().value = '';
  if (els.share()) els.share().value = '';
  if (els.growth()) els.growth().value = '';
  if (els.size()) els.size().value = '';
}

async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { logErr('Ошибка удаления', error); }
}

function renderProductsList() {
  const container = els.list();
  if (!container) return;
  container.innerHTML = '';
  products.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `
      <span>${p.name} — доля: ${p.marketShare}%, рост: ${p.marketGrowth}%, размер: ${p.size}</span>
      <button data-id="${p.id}">❌</button>
    `;
    const btn = div.querySelector('button');
    btn.addEventListener('click', () => deleteProduct(p.id));
    container.appendChild(div);
  });
}

// Если у тебя уже есть рисовалка матрицы — вставь её внутрь этой функции:
function updateChart() {
  if (typeof window.renderBCG === 'function') {
    window.renderBCG(products); // вызов твоей существующей функции
  } else {
    // Временная заглушка: просто ничего не делаем
  }
}

// Realtime обновления
supabase
  .channel('products-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
    loadProductsFromSupabase();
  })
  .subscribe();

// мини-логгер
function log(msg) { const b = document.getElementById('appLog'); if (b) b.textContent = String(msg); }
function logErr(p, e) { console.error(p, e); const b = document.getElementById('appLog'); if (b) b.textContent = p + ': ' + (e?.message || e); }
