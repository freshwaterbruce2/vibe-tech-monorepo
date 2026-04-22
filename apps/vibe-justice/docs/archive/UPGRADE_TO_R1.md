# Upgrade Vibe-Justice to DeepSeek R1 Reasoning Model

## 🚀 Breaking: DeepSeek R1 (December 2025)

DeepSeek has released their revolutionary R1 reasoning models that compete with OpenAI's o1 but at 96% cheaper costs!

### What's New

- **deepseek-reasoner**: Chain-of-Thought reasoning model
- **deepseek-chat**: Now upgraded to DeepSeek-V3.2-Exp
- Performance comparable to OpenAI-o1 on reasoning tasks
- 96% cheaper than comparable models

## Upgrade Instructions

### Option 1: Use New Reasoning Model (Recommended)

Edit `backend/vibe_justice/services/ai_service.py`:

```python
class AIService:
    def __init__(self):
        if not API_KEY:
            print("WARNING: DEEPSEEK_API_KEY not configured.")

        self.client = OpenAI(api_key=API_KEY or "dummy", base_url=BASE_URL)

        # UPGRADE: Use the new reasoning model for complex queries
        self.reasoning_model = "deepseek-reasoner"  # NEW R1 Model
        self.chat_model = "deepseek-chat"  # Standard chat (V3.2-Exp)
```

### Option 2: Enhanced generate_rag_response for Legal Reasoning

```python
def generate_rag_response_with_reasoning(
    self,
    query: str,
    context_chunks: List[str],
    domain: str = "general",
    use_reasoning: bool = True
) -> str:
    """
    Uses DeepSeek R1 reasoning model for complex legal analysis.
    The model generates Chain-of-Thought before the final answer.
    """
    if not API_KEY or API_KEY == "dummy":
        return "Error: AI service not configured."

    try:
        system_prompt = self.get_system_prompt(domain)

        # Use reasoning model for complex legal questions
        model = self.reasoning_model if use_reasoning else self.chat_model

        context_text = "\n\n".join([f"[Context {i+1}]: {chunk}"
                                    for i, chunk in enumerate(context_chunks)])

        augmented_message = (
            f"Using the following legal context, provide a thorough analysis.\n\n"
            f"CONTEXT:\n{context_text}\n\n"
            f"USER QUESTION:\n{query}\n\n"
            f"Please reason through this step-by-step, considering all legal implications."
        )

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": augmented_message}
            ],
            stream=True  # Stream to capture reasoning_content
        )

        # Capture both reasoning and final answer
        reasoning_content = ""
        final_content = ""

        for chunk in response:
            if hasattr(chunk.choices[0].delta, 'reasoning_content'):
                if chunk.choices[0].delta.reasoning_content:
                    reasoning_content += chunk.choices[0].delta.reasoning_content
            if chunk.choices[0].delta.content:
                final_content += chunk.choices[0].delta.content

        # Optionally include reasoning in response for transparency
        if reasoning_content and use_reasoning:
            return f"**Legal Analysis Process:**\n{reasoning_content}\n\n**Conclusion:**\n{final_content}"

        return final_content

    except Exception as e:
        print(f"Error in generate_rag_response_with_reasoning: {e}")
        return f"Error: {str(e)}"
```

### Option 3: Auto-Select Model Based on Query Complexity

```python
def is_complex_legal_query(self, query: str) -> bool:
    """Determine if query requires reasoning model."""
    complex_indicators = [
        "analyze", "compare", "interpret", "implications",
        "violation", "legally", "statute", "precedent",
        "appeal", "rights", "obligations", "liability"
    ]
    return any(indicator in query.lower() for indicator in complex_indicators)

def generate_smart_response(self, message: str, domain: str = "general") -> str:
    """Automatically selects best model based on query complexity."""

    # Use reasoning model for complex legal analysis
    if self.is_complex_legal_query(message):
        model = "deepseek-reasoner"
        print("Using R1 reasoning model for complex analysis...")
    else:
        model = "deepseek-chat"

    # Continue with response generation...
```

## Cost Comparison

### Old DeepSeek Pricing

- ~$0.27 / million input tokens
- ~$1.10 / million output tokens

### New R1 Pricing (December 2025)

- **$0.14** / million input (cache hit) - **48% cheaper!**
- **$0.55** / million input (cache miss)
- **$2.19** / million output (includes reasoning tokens)

## Benefits for Legal Research

The R1 reasoning model excels at:

- **Legal Analysis**: Step-by-step reasoning through statutes
- **Case Comparison**: Identifying relevant precedents
- **Document Review**: Finding discrepancies and violations
- **Appeal Strategy**: Reasoning through legal arguments
- **Self-Verification**: Double-checking legal interpretations

## Testing the Upgrade

1. Update your API service to use `deepseek-reasoner`
2. Test with a complex legal question:

```python
# Example test query
"Analyze whether a denial of unemployment benefits based on 'misconduct'
violates SC Code Title 41 if the employer failed to provide written
warnings as required by company policy."
```

1. Compare responses:

- Standard model: Direct answer
- Reasoning model: Shows thought process + conclusion

## Important Notes

- **Streaming**: The reasoning model supports streaming to show thinking process
- **Context**: Don't include `reasoning_content` in conversation history
- **Parameters**: Temperature/top_p not supported (deterministic reasoning)
- **Cost**: Reasoning tokens count toward output costs but provide transparency

## Rollback if Needed

To revert to standard model:

```python
self.model = "deepseek-chat"  # Instead of deepseek-reasoner
```

Both models use your existing API key - no new signup needed!
