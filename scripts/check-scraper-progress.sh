#!/bin/bash
# Check scraper progress and LLM distribution

echo "📊 Scraper Progress Monitor"
echo "=========================="
echo ""

# Check if progress file exists
if [ ! -f "data/.scraper-progress-v3.csv" ]; then
    echo "❌ No progress file found yet"
    exit 1
fi

# Count total processed
TOTAL=$(wc -l < data/.scraper-progress-v3.csv)
PROCESSED=$((TOTAL - 1))  # Subtract header

echo "✅ Processed: $PROCESSED profiles"
echo ""

# Check checkpoint for LLM stats
if [ -f "data/.scraper-checkpoint-v3.json" ]; then
    echo "🤖 LLM Distribution:"
    cat data/.scraper-checkpoint-v3.json | grep -A 5 '"llm"' | grep -E 'deepseek|openai|gemini|groq' | sed 's/[",]//g' | awk '{printf "   %-12s %s\n", $1, $2}'
    echo ""
    
    echo "📈 Stats:"
    cat data/.scraper-checkpoint-v3.json | grep -E 'success|failed|pricingFound' | sed 's/[",]//g' | awk '{printf "   %-15s %s\n", $1, $2}'
fi

echo ""
echo "🔄 Live tail (Ctrl+C to stop):"
tail -f data/.scraper-progress-v3.csv 2>/dev/null | head -5
