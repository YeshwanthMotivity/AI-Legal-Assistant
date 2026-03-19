# AI Model Troubleshooting Guide

This guide helps you manage and verify the AI models used in the Judicial Assistant Platform.

## Current Configuration

- **Primary Model (JAIS):** `jwnder/jais-adaptive:7b` (Optimized for Arabic/English)
- **Fallback Model:** `phi3:mini`

## Download & Progress Monitoring

If the "AI Analysis" shows 0% confidence or "model failures", it usually means the model is either still downloading or the system timed out.

### 1. Check Download Progress
Run this command in your terminal to see the real-time progress of the JAIS model download:
```bash
docker exec -it judicial_ollama ollama pull jwnder/jais-adaptive:7b
```

### 2. Verify Downloaded Models
To see which models are ready to use:
```bash
docker exec judicial_ollama ollama list
```

### 3. Check Service Health
Verify if the JAIS and Fallback services are responding:
- **JAIS Health:** `http://localhost:8003/health`
- **Fallback Health:** `http://localhost:8004/health`

## Common Issues

### "Reasoning unavailable due to model failures"
- **Cause:** The model didn't finish downloading or the backend connection timed out.
- **Solution:** 
  1. Use the "Manual Pull" command above.
  2. Wait for it to reach 100%.
  3. Try running "AI Analysis" again.

### Slow Generation
- **Cause:** Larger models like JAIS (13B-15B) require significant RAM/GPU.
- **Solution:** We have increased the internal timeouts to **5 minutes** (300 seconds) to allow more time for generation on your system.
