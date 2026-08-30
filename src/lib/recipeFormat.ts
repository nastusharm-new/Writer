export interface ParsedRecipe {
  title: string
  meta: string | null
  ingredients: string[]
  steps: string[]
}

// Recognizes the exact shape templates.ts's recipe() helper writes — a
// title line, an optional one-line meta (servings/time), an "Ингредиенты:"
// block of "— " bullets, and a "Шаги:" block of "N. " numbered steps —
// and only that shape. Deliberately doesn't generalize to "any line
// starting with a dash is a bullet": in Russian prose, a leading em dash
// is how dialogue is written ("— Привет, — сказала она."), so a looser
// heuristic would mangle ordinary scenes. Anything that isn't recognized
// returns null and renders as plain text, same as before.
export function parseRecipeCard(text: string): ParsedRecipe | null {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  if (blocks.length < 3) return null

  const title = blocks[0]
  if (!title || title.includes('\n')) return null

  const ingredientsIndex = blocks.findIndex((b) => b.startsWith('Ингредиенты:'))
  const stepsIndex = blocks.findIndex((b) => b.startsWith('Шаги:'))
  if (ingredientsIndex <= 0 || stepsIndex <= ingredientsIndex) return null

  const ingredients = blocks[ingredientsIndex]
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('— '))
    .map((l) => l.slice(2).trim())

  const steps = blocks[stepsIndex]
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s/.test(l))
    .map((l) => l.replace(/^\d+\.\s*/, ''))

  if (ingredients.length === 0 || steps.length === 0) return null

  // Whatever sits between the title and the ingredients block (the
  // template always has a servings/time line there; a hand-edited card
  // might not have one at all).
  const meta = blocks.slice(1, ingredientsIndex).join(' ') || null

  return { title, meta, ingredients, steps }
}
