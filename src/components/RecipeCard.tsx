import type { ParsedRecipe } from '../lib/recipeFormat'

// A recipe-shaped card (see lib/recipeFormat.ts), laid out like a printed
// recipe box rather than a run of plain text — used wherever a card is
// only ever read, never edited, in place (TextView; the card pane's own
// preview toggle).
export function RecipeCard({ recipe }: { recipe: ParsedRecipe }) {
  return (
    <div className="recipe-card">
      <h3 className="recipe-card-title">{recipe.title}</h3>
      {recipe.meta && <p className="recipe-card-meta">{recipe.meta}</p>}

      <h4 className="recipe-card-heading">Ингредиенты</h4>
      <ul className="recipe-card-ingredients">
        {recipe.ingredients.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h4 className="recipe-card-heading">Шаги</h4>
      <ol className="recipe-card-steps">
        {recipe.steps.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </div>
  )
}
