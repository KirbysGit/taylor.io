# cleaner/openai_cleaner.py

# Optional OpenAI-based text cleaning.

import os
import re
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# Flag to enable/disable OpenAI text cleaning (set to False to use regex only)
USE_OPENAI = False


def clean_with_openai(text: str) -> str:
    """Clean extracted text using OpenAI API to fix merged/split words and formatting issues."""
    if not USE_OPENAI:
        return text
    
    if not HAS_OPENAI:
        logger.info("OpenAI library not installed - skipping AI text cleaning")
        return text
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.info("OPENAI_API_KEY not set in environment - skipping AI text cleaning (using regex fallback)")
        return text
    
    # Log that we're using OpenAI
    original_length = len(text)
    logger.info(f"🤖 Using OpenAI to clean extracted text (original length: {original_length} chars)")
    
    # Show a sample of the original text (first 200 chars) for debugging
    sample_original = text[:200].replace('\n', ' ')
    logger.debug(f"📄 Original text sample: {sample_original}...")
    
    try:
        # Initialize OpenAI client
        # Version 1.40.0: api_key can be passed directly or read from OPENAI_API_KEY env var
        client = OpenAI(api_key=api_key)
        
        prompt = """Fix the following resume text that was extracted from a PDF. The text has formatting issues where words are merged together or split incorrectly. 

Please:
1. Fix merged words (e.g., "Builtand" -> "Built and", "Reactdashboards" -> "React dashboards")
2. Fix split words (e.g., "decision-makin g" -> "decision-making", "improvin gin ternal" -> "improving internal")
3. Fix spacing issues (e.g., "to olsused" -> "tools used", "byproduct" -> "by product")
4. Preserve proper formatting, bullet points, and structure
5. Keep all technical terms, company names, and proper nouns intact
6. Maintain the original structure and sections

Return ONLY the cleaned text, no explanations or additional text.

Text to clean:
"""
        
        logger.info("📤 Sending text to OpenAI API...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using mini for cost efficiency
            messages=[
                {"role": "system", "content": "You are a text cleaning assistant that fixes formatting issues in extracted PDF text."},
                {"role": "user", "content": prompt + text}
            ],
            temperature=0.3,  # Lower temperature for more consistent results
            max_tokens=4000,  # Enough for most resumes
        )
        
        cleaned_text = response.choices[0].message.content.strip()
        
        # Log usage and cost info
        usage = response.usage
        input_tokens = usage.prompt_tokens if usage else 0
        output_tokens = usage.completion_tokens if usage else 0
        total_tokens = usage.total_tokens if usage else 0
        
        # Cost calculation for gpt-4o-mini (as of 2024)
        # Input: $0.15 per 1M tokens, Output: $0.60 per 1M tokens
        input_cost = (input_tokens / 1_000_000) * 0.15
        output_cost = (output_tokens / 1_000_000) * 0.60
        total_cost = input_cost + output_cost
        
        cleaned_length = len(cleaned_text)
        logger.info(f"✅ OpenAI cleaning completed!")
        logger.info(f"   📊 Tokens used: {input_tokens} input + {output_tokens} output = {total_tokens} total")
        logger.info(f"   💰 Estimated cost: ${total_cost:.6f} (${input_cost:.6f} input + ${output_cost:.6f} output)")
        logger.info(f"   📏 Text length: {original_length} → {cleaned_length} chars")
        
        # Show a sample of the cleaned text for comparison
        sample_cleaned = cleaned_text[:200].replace('\n', ' ')
        logger.debug(f"✨ Cleaned text sample: {sample_cleaned}...")
        
        # Count improvements (rough estimate)
        merged_word_patterns = [
            r'[a-z][A-Z]',  # camelCase merged words
            r'[a-z]{4,}[a-z]{4,}',  # long merged words
        ]
        original_issues = sum(len(re.findall(pattern, text)) for pattern in merged_word_patterns)
        cleaned_issues = sum(len(re.findall(pattern, cleaned_text)) for pattern in merged_word_patterns)
        issues_fixed = original_issues - cleaned_issues
        
        if issues_fixed > 0:
            logger.info(f"   🔧 Fixed approximately {issues_fixed} merged/split word issues")
        else:
            logger.info(f"   ℹ️  No obvious merged/split word issues detected (text may already be clean)")
        
        return cleaned_text
        
    except Exception as e:
        # If OpenAI fails, return original text
        logger.error(f"❌ OpenAI text cleaning failed: {str(e)}")
        logger.info("   ⚠️  Falling back to original text (regex cleaning will still be applied)")
        return text

