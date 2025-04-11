import { generateText } from 'ai';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { enhancedLanguageModel } from '../ai/provider-registry';

config({
  path: '.env.local',
});

interface GeneratedPrompt {
  id: string;
  title: string;
  label: string;
  action: string;
  complexPrompt?: string;
  category: string;
  visibility: 'public' | 'private';
  isDefault: boolean;
  isActive: boolean;
  ratingCount: number;
  ratingSum: number;
  averageRating: string;
}

async function generatePromptSuggestions(count: number = 100): Promise<GeneratedPrompt[]> {
  console.log(`Generating ${count} prompt suggestions using Claude 3.7...`);
  
  // Focus more on these specific categories as requested
  const categories = [
    { name: 'code', weight: 0.4 },      // 40%
    { name: 'creative', weight: 0.3 },  // 30%
    { name: 'business', weight: 0.2 },  // 20%
    { name: 'general', weight: 0.1 }    // 10%
  ];
  const allPrompts: GeneratedPrompt[] = [];
  
  // Use all categories instead of just one
  console.log(`Generating prompts for all categories...`);
  
  try {
    // Process each category
    for (const category of categories) {
      console.log(`Starting generation for ${category.name} category...`);
      const promptsForCategory = Math.round(count * category.weight);
      console.log(`Will generate ${promptsForCategory} prompts for category: ${category.name}`);
      
      console.log(`Making API call to Claude 3.7 for ${category.name} category...`);
      const { text } = await generateText({
        model: await enhancedLanguageModel('prompt-gen'),
        system: `You are an expert prompt engineer who creates engaging, useful prompts for AI assistants.
        You understand how to use dynamic tags in the format {{tag}} for user input and {{ai:tag}} for AI-generated values.
        
        Your prompts should be diverse, creative, and genuinely useful for users. Each prompt should have:
        1. A clear, concise title (3-7 words)
        2. A descriptive label (2-5 words)
        3. An action text that uses dynamic tags
        4. A complex prompt with detailed instructions
        
        The complex prompt should provide detailed instructions to the AI without overriding safety guardrails.
        It should enhance the AI's capabilities for the specific task without attempting to change its core behavior.`,
        prompt: `Generate ${promptsForCategory} diverse, creative prompt suggestions for the category "${category.name}".
        
        Each prompt should:
        1. Have a clear, concise title (3-7 words)
        2. Include a descriptive label (2-5 words)
        3. Have an action text that uses dynamic tags
        4. Use a mix of user input tags {{tag}} and AI-generated tags {{ai:tag}}
        5. Include a complex prompt with detailed instructions
        
        Format your response as a JSON array of objects with these properties:
        - title: The prompt title
        - label: A short description
        - action: The full prompt text with tags
        - complexPrompt: Detailed instructions for the AI
        
        Example:
        [
          {
            "title": "Generate an Image of...",
            "label": "fantasy creature",
            "action": "Generate an image of a {{ai:fantasy creature}} in {{setting}}",
            "complexPrompt": "You are an expert image generator. Create a detailed, high-quality image based on the user's description. Consider composition, lighting, style, and mood to create a visually appealing result. The image should be creative and unique, while still matching the user's specifications."
          }
        ]
        
        Be creative and diverse in your suggestions. Make them genuinely useful and interesting.
        Draw inspiration from Anthropic's prompt examples for high-quality suggestions.
        
        For the "${category.name}" category, focus on prompts that are relevant to this domain.
        
        Category-specific guidance:
        - code: Programming, debugging, code explanation, algorithm design
        - creative: Writing, storytelling, art concepts, music, poetry
        - business: Professional documents, analysis, strategy, marketing
        - general: Everyday tasks, learning, productivity, information`
      });
      
      console.log(`Received response from Claude 3.7 for ${category.name}, processing...`);
      console.log('Response preview:', text.substring(0, 200) + '...');
      
      // Extract JSON array from response
      const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
      if (!jsonMatch) {
        console.error(`Failed to extract JSON from response for ${category.name}`);
        console.log('Full response:', text);
      } else {
        try {
          console.log('Parsing JSON...');
          const promptsJson = JSON.parse(jsonMatch[0]);
          console.log(`Successfully parsed JSON with ${promptsJson.length} prompts for ${category.name}`);
          
          // Format and add to all prompts
          const formattedPrompts = promptsJson.map((p: any) => ({
            id: randomUUID(),
            title: p.title,
            label: p.label,
            action: p.action,
            complexPrompt: p.complexPrompt || null,
            category: category.name,
            visibility: 'public',
            isDefault: false, // Set to false for community suggestions
            isActive: true,
            ratingCount: Math.floor(Math.random() * 10), // Random initial ratings
            ratingSum: Math.floor(Math.random() * 40), // Random sum to calculate average
            averageRating: (Math.random() * 2 + 3).toFixed(2) // Random average between 3.00 and 5.00
          }));
          
          console.log(`Formatted ${formattedPrompts.length} prompts for ${category.name}`);
          allPrompts.push(...formattedPrompts);
        } catch (error) {
          console.error(`Error processing prompts for category ${category.name}:`, error);
        }
      }
      
      // Add a delay between API calls to avoid rate limiting
      if (category !== categories[categories.length - 1]) {
        console.log('Waiting 2 seconds before next API call...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('Error in main try block:', error);
  }
  
  console.log(`Generated ${allPrompts.length} prompt suggestions`);
  
  // Save to file
  writeFileSync('./lib/db/generated-prompts.json', JSON.stringify(allPrompts, null, 2));
  
  return allPrompts;
}

// Execute if run directly
if (require.main === module) {
  generatePromptSuggestions(100).catch(console.error);
}

export { generatePromptSuggestions };