export const getGeminiApiKey = () => {
  const env = import.meta.env as ImportMetaEnv & {
    GEMINI_API_KEY?: string;
    VITE_GEMINI_API_KEY?: string;
  };

  return env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? '';
};
