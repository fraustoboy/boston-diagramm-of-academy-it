// Подключение Supabase — используется глобальная переменная supabase из index.html

let products = [];
const container = document.getElementById("productsList");
const addButton = document.getElementById("addProductBtn");
const nameInput = document.getElementById("productName");
const shareInput = document.getElementById("marketShare");
const growthInput = document.getElementById("marketGrowth");
const sizeInput = document.getElementById("productSize");

// === Загрузка данных из Supabase ===
async function loadProductsFromSupabase() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Ошибка загрузки:", error);
    return;
  }

  products = data || [];
  renderProductsList();
  updateChart();
}

// === Добавление продукта ===
async function addProduct() {
  const name = nameInput.value.trim();
  const marketShare = parseFloat(shareInput.value);
  const marketGrowth = parseFloat(growthInput.value);
  const size = parseFloat(sizeInput.value);

  if (!name || isNaN(marketShare) || isNaN(marketGrowth) || isNaN(size)) {
    alert("Пожалуйста, заполните все поля корректно.");
    return;
  }

  const { error } = await supabase.from("products").insert([
    { name, marketShare, marketGrowth, size },
  ]);

  if (error) {
    console.error("Ошибка добавления:", error);
    alert("Не удалось добавить продукт 😢");
  } else {
    nameInput.value = "";
    shareInput.value = "";
    growthInput.value = "";
    sizeInput.value = "";
  }
}

// === Удаление продукта ===
async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("Ошибка удаления:", error);
  }
}

// === Отображение списка ===
function renderProductsList() {
  container.innerHTML = "";
  products.forEach((p) => {
    const div = document.createElement("div");
    div.className = "product-item";
    div.innerHTML = `
      <span>${p.name} — доля: ${p.marketShare}%, рост: ${p.marketGrowth}%, размер: ${p.size}</span>
      <button onclick="deleteProduct(${p.id})">❌</button>
    `;
    container.appendChild(div);
  });
}

// === Диаграмма (пример — просто консоль, если есть chart.js, можно вставить код сюда) ===
function updateChart() {
  console.log("Обновление данных:", products);
  // Здесь вставь код для обновления диаграммы (если есть Chart.js или canvas)
}

// === Реакция на клики ===
addButton.addEventListener("click", addProduct);

// === Реальное время (автообновление при изменениях у других пользователей) ===
supabase
  .channel("products-changes")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "products" },
    (payload) => {
      console.log("Изменения в таблице:", payload);
      loadProductsFromSupabase(); // перезагрузить данные
    }
  )
  .subscribe();

// === Первоначальная загрузка ===
loadProductsFromSupabase();
