from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import spacy
from typing import List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="StoryScope NLP Service",
    description="API for analyzing and estimating user story complexity",
    version="1.0.0"
)

# Load SpaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    logger.error(f"Failed to load SpaCy model: {e}")
    raise

class Story(BaseModel):
    """
    Represents a user story with summary, description and labels.
    
    Attributes:
        summary (str): Brief overview of the story
        description (str): Detailed explanation of the story
        labels (list[str]): Optional tags/labels for the story
    """
    summary: str = Field("")
    description: str = Field("")
    labels: List[str] = Field(default=[])

    class Config:
        schema_extra = {
            "example": {
                "summary": "Add user authentication",
                "description": "Implement OAuth2 based authentication system",
                "labels": ["security", "authentication"]
            }
        }

@app.get("/health")
async def health():
    """
    Health check endpoint to verify service status
    """
    return {"status": "ok", "model": "en_core_web_sm"}

@app.get("/")
async def root():
    return {"service": "nlp", "status": "ok"}

@app.post("/estimate")
async def estimate(story: Story):
    """
    Estimates the complexity of a user story based on various factors:
    - Text length
    - Presence of uncertainty indicators
    - Number of labels
    
    Args:
        story (Story): The user story to analyze
        
    Returns:
        dict: Story details and complexity score
        
    Raises:
        HTTPException: If text processing fails
    """
    try:
        # Combine all text fields for analysis
        text = f"{story.summary} {story.description} {' '.join(story.labels)}".strip()
        doc = nlp(text)

        # --- Feature extraction ---
        token_count = max(1, len(doc))
        sentence_count = max(1, len(list(doc.sents)))
        avg_sentence_len = token_count / sentence_count

        # Penalize lots of very short sentences (fragmentary requirements)
        short_sentence_penalty = sum(1 for s in doc.sents if len(s) < 6)

        # Named entities can indicate integration or domain-heavy stories
        entity_count = len([e for e in doc.ents])

        # Uncertainty signals
        uncertainty_keywords = {
            "maybe", "probably", "might", "unclear", "tbd", "unknown",
            "possibly", "perhaps", "not", "unsure", "investigate",
            "to be decided", "to be determined"
        }
        uncertainty_hits = sum(1 for token in doc if token.text.lower() in uncertainty_keywords)

        # Technical indicators
        technical_keywords = {
            "api", "apis", "endpoint", "database", "db", "integration",
            "auth", "authentication", "oauth", "jwt", "security",
            "encryption", "performance", "scalability", "cache", "redis",
            "kafka", "queue", "infrastructure", "deployment", "docker",
            "kubernetes", "cloud", "s3", "cdn"
        }
        technical_hits = sum(1 for token in doc if token.text.lower() in technical_keywords)

        # Label contribution
        label_factor = len(story.labels)

        # --- Scoring model (bounded and smoother) ---
        # Base from content length using sublinear growth to avoid saturation
        import math
        base = 20 * math.log2(token_count + 1)  # 0..~120 for huge texts, typical 20-60

        # Weights tuned for POC realism
        complexity = (
            base
            + 6.0 * uncertainty_hits
            + 4.0 * technical_hits
            + 2.0 * entity_count
            + 1.5 * label_factor
            + 0.5 * max(0.0, avg_sentence_len - 20)  # very long sentences add a bit
            + 1.0 * short_sentence_penalty
        )

        # Normalize and clamp to 0..100
        complexity = max(1.0, min(100.0, complexity))

        # --- Map to Fibonacci story points ---
        fib_points = [1, 2, 3, 5, 8, 13, 21]
        # Thresholds across 0..100 roughly increasing
        thresholds = [10, 20, 35, 50, 65, 80, 100]
        story_points = fib_points[0]
        for i, t in enumerate(thresholds):
            if complexity <= t:
                story_points = fib_points[i]
                break

        return {
            "summary": story.summary,
            "description": story.description,
            "labels": story.labels,
            "complexity_score": round(complexity, 1),
            "story_points": story_points,
            "analysis": {
                "token_count": token_count,
                "sentence_count": sentence_count,
                "avg_sentence_len": round(avg_sentence_len, 2),
                "uncertainty_factor": uncertainty_hits,
                "technical_factor": technical_hits,
                "entity_factor": entity_count,
                "label_factor": label_factor,
                "short_sentence_penalty": short_sentence_penalty
            }
        }

    except Exception as e:
        logger.error(f"Error processing story: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing text: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)