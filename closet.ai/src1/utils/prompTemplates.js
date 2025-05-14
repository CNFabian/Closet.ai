export const recipePromptTemplates = {
    // Basic recipe generator template
    basicRecipeGenerator: {
      format: 'custom',
      text: `You are a creative and knowledgeable chef. Using ONLY the following ingredients from my pantry, 
      suggest 3-5 possible recipes I could make. Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each recipe, please provide:
      1. Recipe name
      2. Brief description (2-3 sentences)
      3. Total preparation and cooking time
      4. Difficulty level (Easy, Moderate, Challenging)
      5. Required ingredients with approximate quantities from the available list
      6. Brief step-by-step instructions
      7. Any helpful tips or variations
  
      Present the recipes in order from simplest to most complex.`
    },
    
    // Template for quick meals (under 30 minutes)
    quickMeals: {
      format: 'custom',
      text: `You are a culinary expert specializing in quick, efficient cooking. Using ONLY the following ingredients 
      from my pantry, suggest 3 recipes that can be prepared and cooked in under 30 minutes. 
      Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each quick recipe, please provide:
      1. Recipe name
      2. Total preparation and cooking time (must be under 30 minutes)
      3. Required ingredients with approximate quantities from the available list
      4. Brief step-by-step instructions focusing on efficiency
      5. What makes this recipe quick and convenient
  
      Focus on simplicity and speed while still creating flavorful dishes.`
    },
    
    // Template for dietary restrictions
    dietaryRestrictions: {
      format: 'custom',
      text: `You are a nutritionist and chef who specializes in {{dietType}} cooking. Using ONLY the following 
      ingredients from my pantry, suggest 3-4 {{dietType}} recipes I could make. Ensure all recipes 
      strictly adhere to {{dietType}} requirements. Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each {{dietType}} recipe, please provide:
      1. Recipe name
      2. Brief description highlighting the {{dietType}} benefits
      3. Total preparation and cooking time
      4. Required ingredients with approximate quantities from the available list
      5. Brief step-by-step instructions
      6. Nutritional highlights relevant to {{dietType}} diet
      
      All recipes must strictly comply with {{dietType}} dietary guidelines.`
    },
    
    // Template for ingredient-focused cooking
    ingredientMaximizer: {
      format: 'custom',
      text: `You are a resourceful chef who specializes in using ingredients efficiently. I want to use as much of 
      the ingredient "{{targetIngredient}}" as possible. Using ONLY the following ingredients from my pantry 
      (which includes {{targetIngredient}}), suggest 2-3 recipes that prominently feature {{targetIngredient}}.
      Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each {{targetIngredient}}-focused recipe, please provide:
      1. Recipe name that highlights {{targetIngredient}}
      2. Brief description of how {{targetIngredient}} is featured
      3. Required ingredients with approximate quantities from the available list
      4. Brief step-by-step instructions
      5. What makes this recipe a good way to use {{targetIngredient}}
      
      Focus on recipes where {{targetIngredient}} is a star component, not just a minor addition.`
    },
    
    // Template for meal prep/batch cooking
    mealPrep: {
      format: 'custom',
      text: `You are a meal prep expert who helps people efficiently cook multiple meals at once. Using ONLY the 
      following ingredients from my pantry, suggest a practical meal prep plan that will create 4-5 meals I 
      can store and reheat throughout the week. Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      Please provide:
      1. An efficient cooking sequence/plan to create multiple dishes in one session
      2. 4-5 distinct meals that can be made from these ingredients
      3. Estimated total prep and cooking time for the entire batch
      4. For each meal:
         a. Name and brief description
         b. Ingredients with approximate quantities
         c. Basic preparation steps
         d. Storage instructions
         e. Reheating recommendations
      
      Focus on practical recipes that maintain quality when stored and reheated.`
    },
    
    // Template for finding recipes similar to a favorite
    similarToFavorite: {
      format: 'custom',
      text: `You are a creative chef who can adapt recipes based on available ingredients. I love the dish 
      "{{favoriteDish}}" but want to make something similar using ONLY the following ingredients from my pantry.
      Suggest 2-3 recipes that capture the essence, flavors, or cooking style of {{favoriteDish}} while only 
      using the available ingredients. Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each recipe inspired by {{favoriteDish}}, please provide:
      1. Recipe name
      2. How it relates to or was inspired by {{favoriteDish}}
      3. Required ingredients with approximate quantities from the available list
      4. Brief step-by-step instructions
      5. What flavors or elements it preserves from the original dish
      
      Be creative but practical - the goal is to capture the essence of {{favoriteDish}} with what I have available.`
    },
    
    // Template for using ingredients about to expire
    reduceWaste: {
      format: 'custom',
      text: `You are a sustainable cooking expert who helps reduce food waste. The following ingredients in my pantry 
      will expire soon: {{expiringIngredients}}. Using ONLY these expiring items and the other available ingredients 
      listed below, suggest 2-3 recipes that will help me use up the expiring ingredients. Do not include any 
      ingredients that are not listed below.
      
      All Available Ingredients (expiring ones are marked with *):
      {{documents}}
      
      For each recipe that uses the expiring ingredients, please provide:
      1. Recipe name
      2. Which expiring ingredients it uses and in what quantity
      3. Other required ingredients from the available list
      4. Brief step-by-step instructions
      5. Any tips for preserving or extending the life of remaining portions
      
      Prioritize using greater quantities of the expiring ingredients.`
    },
    
    // Template for cooking by method/equipment
    cookingMethod: {
      format: 'custom',
      text: `You are a chef who specializes in {{cookingMethod}} recipes. Using ONLY the following ingredients from 
      my pantry, suggest 3 recipes that can be prepared using the {{cookingMethod}} cooking method.
      Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each {{cookingMethod}} recipe, please provide:
      1. Recipe name
      2. Why this recipe works well with the {{cookingMethod}} method
      3. Required ingredients with approximate quantities from the available list
      4. Detailed instructions specific to {{cookingMethod}} preparation
      5. Total cooking time using this method
      6. Any tips for best results with {{cookingMethod}}
      
      Focus on recipes where {{cookingMethod}} brings out the best flavors or textures in the available ingredients.`
    },
    
    // Template for cuisine-specific recipes
    cuisineSpecific: {
      format: 'custom',
      text: `You are a chef who specializes in authentic {{cuisineType}} cooking. Using ONLY the following ingredients 
      from my pantry, suggest 2-3 {{cuisineType}} recipes I could make. If I'm missing any essential ingredients for 
      traditional {{cuisineType}} cooking, suggest adaptations using what I have. Do not include any ingredients that 
      are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each {{cuisineType}} recipe, please provide:
      1. Authentic {{cuisineType}} recipe name (with translation if applicable)
      2. Brief cultural context or history
      3. Required ingredients with approximate quantities from the available list
      4. Any traditional ingredients I'm missing and possible substitutions from my available ingredients
      5. Brief step-by-step instructions highlighting authentic techniques
      6. How close this adaptation is to the traditional version
      
      Focus on capturing authentic {{cuisineType}} flavors while working within my ingredient constraints.`
    },
    
    // Template for kids-friendly recipes
    kidsFriendly: {
      format: 'custom',
      text: `You are a family chef who specializes in creating fun, nutritious meals that children enjoy. Using ONLY 
      the following ingredients from my pantry, suggest 3 kid-friendly recipes that are both appealing to children 
      and nutritionally balanced. Do not include any ingredients that are not listed below.
      
      Available Ingredients:
      {{documents}}
      
      For each kid-friendly recipe, please provide:
      1. Fun, appealing recipe name
      2. Why kids will enjoy this dish
      3. Required ingredients with approximate quantities from the available list
      4. Brief step-by-step instructions
      5. How to present or serve it in a way that appeals to children
      6. Any ways kids can safely help with preparation
      7. Hidden nutritional benefits
      
      Focus on recipes that are both enjoyable for children and meet their nutritional needs.`
    }
  };
  
  // Helper function to format ingredient data from Firestore for prompts
  export const formatIngredientsForPrompt = (ingredients) => {
    if (!ingredients || ingredients.length === 0) {
      return "No ingredients available";
    }
    
    // Group ingredients by category if category field exists
    const categorized = ingredients.some(ing => ing.category);
    
    if (categorized) {
      // Group by category
      const categories = {};
      
      ingredients.forEach(ing => {
        const category = ing.category || 'Other';
        if (!categories[category]) {
          categories[category] = [];
        }
        
        let itemText = ing.name;
        
        // Add quantity and unit if available
        if (ing.quantity) {
          itemText += ` (${ing.quantity}${ing.unit ? ' ' + ing.unit : ''})`;
        }
        
        // Add expiration if available
        if (ing.expirationDate) {
          const expDate = new Date(ing.expirationDate);
          const today = new Date();
          
          // Mark items expiring within 3 days
          if ((expDate - today) / (1000 * 60 * 60 * 24) <= 3) {
            itemText += ' *expiring soon*';
          }
        }
        
        categories[category].push(itemText);
      });
      
      // Format as categorized list
      return Object.entries(categories)
        .map(([category, items]) => {
          return `${category}:\n${items.map(item => `- ${item}`).join('\n')}`;
        })
        .join('\n\n');
    } else {
      // Simple list format
      return ingredients.map(ing => {
        let itemText = ing.name;
        
        // Add quantity and unit if available
        if (ing.quantity) {
          itemText += ` (${ing.quantity}${ing.unit ? ' ' + ing.unit : ''})`;
        }
        
        return `- ${itemText}`;
      }).join('\n');
    }
  };
  
  // Function to create a prompt with ingredient data from Firestore
  export const createRecipePrompt = (ingredients, templateKey, customVariables = {}) => {
    // Get the selected template
    const template = recipePromptTemplates[templateKey];
    
    if (!template) {
      throw new Error(`Template "${templateKey}" not found`);
    }
    
    // Format the ingredients data
    const formattedIngredients = formatIngredientsForPrompt(ingredients);
    
    // Replace the {{documents}} placeholder with formatted ingredients
    let promptText = template.text.replace('{{documents}}', formattedIngredients);
    
    // Replace any custom variables in the template
    Object.entries(customVariables).forEach(([key, value]) => {
      promptText = promptText.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    
    return promptText;
  };
  
  // Example Firestore service for ingredient queries
  // This would typically be in a separate file but included here for reference
  export const getIngredientsByExpirationDate = async (daysUntilExpiration = 7) => {
    // This is where you'd implement your Firestore query to get ingredients
    // that will expire within the specified number of days
    // For example:
    // const expirationDate = new Date();
    // expirationDate.setDate(expirationDate.getDate() + daysUntilExpiration);
    // 
    // return await queryDocuments('ingredients', [
    //   {
    //     field: 'expirationDate',
    //     operator: '<=',
    //     value: expirationDate
    //   },
    //   {
    //     field: 'userId',
    //     operator: '==',
    //     value: currentUserId
    //   }
    // ]);
  };