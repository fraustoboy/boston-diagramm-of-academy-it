# Интерактивная Бостонская матрица (BCG)

Готовый React-компонент для веб-визуализации портфеля по Бостонской матрице с интерактивным вводом X (относительная доля рынка) и Y (темпы роста).

## Быстрый старт (Next.js 14 + Tailwind + shadcn/ui)

```bash
npx create-next-app@latest bcg-matrix --ts --tailwind
cd bcg-matrix

# shadcn/ui
npx shadcn@latest init -y
npx shadcn@latest add card button input label switch table

# зависимости
npm i recharts lucide-react
```

Сохраните файл `BCGMatrixApp.tsx` в `app/bcg/page.tsx` **или** в `components/BCGMatrixApp.tsx`, а затем используйте:

```tsx
// app/bcg/page.tsx
import BCGMatrixApp from "@/components/BCGMatrixApp"; // если файл лежит в components
export default function Page() {
  return <BCGMatrixApp />;
}
```

> Компонент помечен как `"use client"`, так что без SSR-конфликтов работают `localStorage` и интерактивные элементы.

## Что внутри

- Ввод/редактирование данных в таблице (название, X, Y, Z, цвет).
- Пороговые линии по медиане или вручную.
- Цветные квадранты (Звезды / Трудные дети / Дойные коровы / Собаки).
- Сохранение данных в `localStorage`.
- Recharts пузырьковая диаграмма.

## Замечания
- Импорт `@/components/ui/*` предполагает установленный shadcn/ui (см. шаги выше).
- Если используете структуру `src/`, убедитесь что в `tsconfig.json` путь `"@/*"` указывает на корень исходников.
- Размер пузыря `Z` можно трактовать как выручку/GMV/маржу и т. п.

## Лицензия
MIT — используйте свободно в компаниях и проектах.
