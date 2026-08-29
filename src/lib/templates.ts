import { dataStore } from './dataStore'
import type { CardStatus, Project } from '../types'

interface TemplateCard {
  text: string
  status: CardStatus
}

interface TemplateSection {
  title: string
  cards: TemplateCard[]
}

export interface TemplateVariant {
  id: string
  label: string
  sections: TemplateSection[]
}

export interface ProjectTemplate {
  id: string
  title: string
  description: string
  variants: TemplateVariant[]
}

// One example recipe per section, plain text (cards have no markdown
// rendering — see CardTile/TextView) — just what a filled-in recipe card
// looks like, meant to be copied and replaced, not kept.
function recipe(title: string, meta: string, ingredients: string[], steps: string[]): TemplateCard {
  const text = [
    title,
    '',
    meta,
    '',
    'Ингредиенты:',
    ...ingredients.map((i) => `— ${i}`),
    '',
    'Шаги:',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
  ].join('\n')
  return { text, status: 'draft' }
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'recipe-book',
    title: 'Книга рецептов',
    description: 'Разделы и примеры карточек-рецептов — структуру можно выбрать ниже.',
    variants: [
      {
        id: 'by-meal',
        label: 'По приёму пищи',
        sections: [
          {
            title: 'Завтраки',
            cards: [
              recipe(
                'Омлет с зеленью',
                'На 2 порции, 10 минут.',
                ['яйца — 4 шт', 'молоко — 50 мл', 'зелень — по вкусу', 'соль, перец — по вкусу', 'масло сливочное — 10 г'],
                [
                  'Взбить яйца с молоком, посолить и поперчить.',
                  'Разогреть масло на сковороде на среднем огне.',
                  'Вылить смесь, готовить 3–4 минуты.',
                  'Посыпать зеленью, сложить пополам, подавать сразу.',
                ],
              ),
            ],
          },
          {
            title: 'Обеды',
            cards: [
              recipe(
                'Суп-пюре из тыквы',
                'На 4 порции, 35 минут.',
                ['тыква — 600 г', 'лук репчатый — 1 шт', 'бульон овощной — 700 мл', 'сливки — 100 мл', 'соль, перец — по вкусу'],
                [
                  'Обжарить лук до мягкости, добавить тыкву кубиками.',
                  'Залить бульоном, варить 20 минут до мягкости тыквы.',
                  'Пробить блендером до однородности.',
                  'Влить сливки, прогреть, приправить.',
                ],
              ),
            ],
          },
          {
            title: 'Ужины',
            cards: [
              recipe(
                'Курица с овощами в духовке',
                'На 4 порции, 50 минут.',
                ['куриные бёдра — 4 шт', 'картофель — 4 шт', 'морковь — 2 шт', 'масло растительное — 3 ст.л.', 'специи — по вкусу'],
                [
                  'Овощи нарезать крупно, выложить на противень.',
                  'Курицу натереть специями, уложить сверху овощей.',
                  'Полить маслом, запекать при 200°C 40 минут.',
                ],
              ),
            ],
          },
          {
            title: 'Перекусы',
            cards: [
              recipe(
                'Хумус с овощами',
                'На 4 порции, 15 минут.',
                ['нут варёный — 300 г', 'тахини — 2 ст.л.', 'лимонный сок — 1 ст.л.', 'чеснок — 1 зубчик', 'оливковое масло — 3 ст.л.'],
                [
                  'Пробить нут блендером с тахини, соком лимона и чесноком.',
                  'Влить масло, довести до нужной консистенции водой.',
                  'Подавать с нарезанными овощами.',
                ],
              ),
            ],
          },
        ],
      },
      {
        id: 'by-ingredient',
        label: 'По продуктам',
        sections: [
          {
            title: 'Мясо',
            cards: [
              recipe(
                'Говядина, тушённая с луком',
                'На 4 порции, 1,5 часа.',
                ['говядина — 700 г', 'лук репчатый — 2 шт', 'томатная паста — 2 ст.л.', 'бульон — 300 мл', 'соль, перец, лавровый лист'],
                [
                  'Обжарить говядину кусками до румяной корочки.',
                  'Добавить лук, обжарить ещё 5 минут.',
                  'Влить бульон с томатной пастой, тушить под крышкой 1 час.',
                ],
              ),
            ],
          },
          {
            title: 'Рыба и морепродукты',
            cards: [
              recipe(
                'Лосось на сковороде-гриль',
                'На 2 порции, 15 минут.',
                ['стейк лосося — 2 шт', 'лимон — 1 шт', 'оливковое масло — 1 ст.л.', 'соль, перец — по вкусу'],
                [
                  'Стейки посолить, поперчить, сбрызнуть маслом.',
                  'Обжарить на разогретой сковороде-гриль по 4 минуты с каждой стороны.',
                  'Подавать с дольками лимона.',
                ],
              ),
            ],
          },
          {
            title: 'Птица',
            cards: [
              recipe(
                'Куриное филе в панировке',
                'На 3 порции, 25 минут.',
                ['куриное филе — 2 шт', 'яйцо — 1 шт', 'сухари панировочные — 100 г', 'мука — 2 ст.л.', 'масло растительное — для жарки'],
                [
                  'Филе нарезать пластами, отбить.',
                  'Обвалять в муке, затем в яйце, затем в сухарях.',
                  'Обжарить с двух сторон до золотистой корочки.',
                ],
              ),
            ],
          },
          {
            title: 'Овощи и гарниры',
            cards: [
              recipe(
                'Овощи гриль',
                'На 4 порции, 20 минут.',
                ['цукини — 1 шт', 'баклажан — 1 шт', 'перец болгарский — 2 шт', 'оливковое масло — 2 ст.л.', 'соль, травы — по вкусу'],
                [
                  'Овощи нарезать пластинами вдоль.',
                  'Смазать маслом, посолить, приправить травами.',
                  'Обжарить на сковороде-гриль по 2–3 минуты с каждой стороны.',
                ],
              ),
            ],
          },
          {
            title: 'Крупы и паста',
            cards: [
              recipe(
                'Ризотто с грибами',
                'На 3 порции, 35 минут.',
                ['рис арборио — 250 г', 'грибы — 300 г', 'лук — 1 шт', 'бульон овощной — 800 мл', 'пармезан — 50 г'],
                [
                  'Обжарить лук и грибы до золотистого цвета.',
                  'Добавить рис, обжарить 2 минуты, помешивая.',
                  'Вливать бульон по половнику, помешивая, пока рис не станет мягким (~20 минут).',
                  'Снять с огня, вмешать пармезан.',
                ],
              ),
            ],
          },
          {
            title: 'Выпечка и десерты',
            cards: [
              recipe(
                'Шарлотка с яблоками',
                'На 6 порций, 50 минут.',
                ['яблоки — 4 шт', 'яйца — 3 шт', 'сахар — 150 г', 'мука — 150 г', 'разрыхлитель — 1 ч.л.'],
                [
                  'Яблоки нарезать дольками, выложить в форму.',
                  'Взбить яйца с сахаром до пышной массы.',
                  'Вмешать муку с разрыхлителем, вылить тесто на яблоки.',
                  'Выпекать при 180°C 35–40 минут.',
                ],
              ),
            ],
          },
        ],
      },
    ],
  },
]

// Builds the whole folder-and-cards structure for one template variant
// under `parentId` (null = root of the sidebar tree). `addProject` is
// useProjectTree's own — reused rather than calling dataStore directly so
// the tree's React state picks up every created folder the normal way.
// Cards, on the other hand, go straight through dataStore: they don't need
// their own hook here, and the caller is expected to refetch the sidebar's
// card snapshot once this resolves.
export async function applyProjectTemplate(
  parentId: string | null,
  template: ProjectTemplate,
  variantId: string,
  addProject: (parentId: string | null, title: string) => Promise<Project | undefined>,
): Promise<Project | undefined> {
  const variant = template.variants.find((v) => v.id === variantId)
  if (!variant) return undefined

  const root = await addProject(parentId, template.title)
  if (!root) return undefined

  for (const section of variant.sections) {
    const sectionProject = await addProject(root.id, section.title)
    if (!sectionProject) continue
    for (const card of section.cards) {
      await dataStore.createCard(sectionProject.id, card.text, card.status)
    }
  }

  return root
}
