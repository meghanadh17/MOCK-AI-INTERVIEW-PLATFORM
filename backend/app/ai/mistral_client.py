import logging
import httpx
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class MistralAIClient:
    """Orchestrates direct HTTP completions with Mistral AI APIs."""
    
    @staticmethod
    async def chat_completion(
        messages: list, 
        response_format: Optional[dict] = None,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        if not settings.MISTRAL_API_KEY:
            raise ValueError("MISTRAL_API_KEY is not configured.")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.MISTRAL_MODEL,
                    "messages": messages,
                    "response_format": response_format,
                    "temperature": temperature,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            return response.json()

    @classmethod
    async def generate_structured(
        cls, 
        prompt: str, 
        output_schema: Optional[dict] = None
    ) -> Dict[str, Any]:
        """Generates structured JSON response from Mistral AI."""
        messages = [
            {"role": "system", "content": "You are a helpful assistant. You must respond with a valid JSON object matching the requested schema structure."},
            {"role": "user", "content": prompt}
        ]
        try:
            response = await cls.chat_completion(
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2
            )
            import json
            content = response["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            logger.error(f"Error in generate_structured: {e}")
            raise


# Export alias for service compatibility
MistralService = MistralAIClient
