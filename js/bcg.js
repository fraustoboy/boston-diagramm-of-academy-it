// Хранилище данных о продуктах
let products = [];
let chart = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadProductsFromStorage();
    initChart();
    updateChart();
    renderProductsList();
    
    // Обработчик формы добавления продукта
    document.getElementById('productForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addProduct();
    });
});

// Добавление нового продукта
function addProduct() {
    const name = document.getElementById('productName').value.trim();
    const marketShare = parseFloat(document.getElementById('marketShare').value);
    const marketGrowth = parseFloat(document.getElementById('marketGrowth').value);
    const size = parseFloat(document.getElementById('productSize').value);
    
    if (!name || isNaN(marketShare) || isNaN(marketGrowth) || isNaN(size)) {
        alert('Пожалуйста, заполните все поля корректно');
        return;
    }
    
    const product = {
        id: Date.now(),
        name: name,
        marketShare: marketShare,
        marketGrowth: marketGrowth,
        size: size
    };
    
    products.push(product);
    saveProductsToStorage();
    updateChart();
    renderProductsList();
    
    // Очистка формы
    document.getElementById('productForm').reset();
}

// Удаление продукта
function deleteProduct(id) {
    if (confirm('Вы уверены, что хотите удалить этот продукт?')) {
        products = products.filter(p => p.id !== id);
        saveProductsToStorage();
        updateChart();
        renderProductsList();
    }
}

// Редактирование продукта
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    document.getElementById('productName').value = product.name;
    document.getElementById('marketShare').value = product.marketShare;
    document.getElementById('marketGrowth').value = product.marketGrowth;
    document.getElementById('productSize').value = product.size;
    
    // Удаляем старую версию
    deleteProduct(id);
    
    // Прокрутка к форме
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Определение категории продукта в BCG матрице
function getProductCategory(marketShare, marketGrowth) {
    const avgShare = 1.0; // Среднее значение для относительной доли рынка
    const avgGrowth = 10; // Среднее значение для темпов роста (в процентах)
    
    if (marketGrowth >= avgGrowth && marketShare >= avgShare) {
        return { name: 'Звезды', class: 'category-star' };
    } else if (marketGrowth < avgGrowth && marketShare >= avgShare) {
        return { name: 'Дойные коровы', class: 'category-cash-cow' };
    } else if (marketGrowth >= avgGrowth && marketShare < avgShare) {
        return { name: 'Трудные дети', class: 'category-question' };
    } else {
        return { name: 'Собаки', class: 'category-dog' };
    }
}

// Получение цвета точки в зависимости от категории
function getPointColor(marketShare, marketGrowth) {
    const avgShare = 1.0;
    const avgGrowth = 10;
    
    if (marketGrowth >= avgGrowth && marketShare >= avgShare) {
        return 'rgba(255, 99, 132, 0.7)'; // Звезды - красный
    } else if (marketGrowth < avgGrowth && marketShare >= avgShare) {
        return 'rgba(255, 206, 86, 0.7)'; // Дойные коровы - желтый
    } else if (marketGrowth >= avgGrowth && marketShare < avgShare) {
        return 'rgba(75, 192, 192, 0.7)'; // Трудные дети - бирюзовый
    } else {
        return 'rgba(201, 203, 207, 0.7)'; // Собаки - серый
    }
}

// Инициализация графика
function initChart() {
    const ctx = document.getElementById('bcgChart').getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const product = products[context.dataIndex];
                            if (!product) return '';
                            return [
                                `Продукт: ${product.name}`,
                                `Доля рынка: ${product.marketShare}`,
                                `Рост рынка: ${product.marketGrowth}%`,
                                `Выручка: ${product.size} млн руб.`
                            ];
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: '#333',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    formatter: function(value, context) {
                        const product = products[context.dataIndex];
                        return product ? product.name : '';
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Относительная доля рынка',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: 3,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Темп роста рынка (%)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: -5,
                    max: 30,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// Обновление графика
function updateChart() {
    if (!chart) return;
    
    const datasets = products.map(product => {
        return {
            label: product.name,
            data: [{
                x: product.marketShare,
                y: product.marketGrowth,
                r: Math.sqrt(product.size) * 2 // Радиус пропорционален квадратному корню из выручки
            }],
            backgroundColor: getPointColor(product.marketShare, product.marketGrowth),
            borderColor: 'rgba(255, 255, 255, 0.8)',
            borderWidth: 2
        };
    });
    
    chart.data.datasets = datasets;
    chart.update();
}

// Отрисовка списка продуктов
function renderProductsList() {
    const container = document.getElementById('productsList');
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>Пока нет добавленных продуктов</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const category = getProductCategory(product.marketShare, product.marketGrowth);
        return `
            <div class="product-card">
                <h3>${product.name}</h3>
                <div class="product-info">
                    <strong>Доля рынка:</strong> ${product.marketShare}
                </div>
                <div class="product-info">
                    <strong>Рост рынка:</strong> ${product.marketGrowth}%
                </div>
                <div class="product-info">
                    <strong>Выручка:</strong> ${product.size} млн руб.
                </div>
                <div class="product-category ${category.class}">
                    ${category.name}
                </div>
                <div class="product-actions">
                    <button class="btn-edit" onclick="editProduct(${product.id})">
                        Редактировать
                    </button>
                    <button class="btn-delete" onclick="deleteProduct(${product.id})">
                        Удалить
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Сохранение данных в localStorage
function saveProductsToStorage() {
    localStorage.setItem('bcg_products', JSON.stringify(products));
}

// Загрузка данных из localStorage
function loadProductsFromStorage() {
    const stored = localStorage.getItem('bcg_products');
    if (stored) {
        products = JSON.parse(stored);
    }
}
