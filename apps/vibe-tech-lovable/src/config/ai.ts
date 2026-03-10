export const DEEPSEEK_CONFIG = {
  // Primary model requested for code generation
  model: 'deepseek-coder-v2.5', 
  
  // Available models including the new reasoning model
  availableModels: ['deepseek-coder-v2.5', 'deepseek-reasoner', 'deepseek-v3.2'],

  parameters: {
    temperature: 0.1, // Ultra-precise for v2.5
    max_tokens: 16384, // Increased context window
    top_p: 1.0,      // Explicitly enabled
    stream: false,   
    stop: [          
      '<|EOT|>',
      '<|end_of_sentence|>', 
      '```\n'
    ]
  },

  // System prompt to enforce the "Modern IDE" coding style
  systemPrompt: `You are an expert full-stack developer and UI/UX designer.
You are generating code for a modern web application using React, Tailwind CSS, and Lucide React.
- OUTPUT CODE ONLY. Do not include conversational text or markdown wrappers unless requested.
- Use strict TypeScript.
- Follow the "Zinc-950" dark mode aesthetic.
- Ensure all components are modular and responsive.`
};