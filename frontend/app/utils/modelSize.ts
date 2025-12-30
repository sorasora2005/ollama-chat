// Estimate model size range from name (in GB) - returns min and max
export const estimateModelSizeRange = (modelName: string): { min: number; max: number } => {
  const nameLower = modelName.toLowerCase()

  // Extract size indicators from model name
  const patterns = [
    // Match patterns like "2b", "4b", "7b", "13b", "30b", "70b"
    { regex: /(\d+(?:\.\d+)?)b/i },
    // Match patterns like "270m", "360m"
    { regex: /(\d+(?:\.\d+)?)m/i },
  ]

  for (const { regex } of patterns) {
    const match = nameLower.match(regex)
    if (match) {
      const paramCount = parseFloat(match[1])
      const isMillions = match[0].toLowerCase().includes('m')

      if (isMillions) {
        // For millions: wider range based on actual sizes
        // gemma3:270m → 292MB, so roughly 0.001-0.0012GB per million
        const base = paramCount * 0.0011
        return { min: base * 0.85, max: base * 1.4 }
      }

      // For billions: size mapping with range (based on actual Ollama model sizes)
      // Using wider ranges to account for variations between model families
      const sizeMap: { [key: number]: { min: number; max: number } } = {
        0.27: { min: 0.25, max: 0.35 }, // gemma3:270m → 292MB
        0.5: { min: 0.3, max: 0.5 },
        0.6: { min: 0.4, max: 0.7 },
        1.0: { min: 0.7, max: 1.2 }, // gemma3:1b → 815MB
        1.1: { min: 0.8, max: 1.3 },
        1.5: { min: 1.0, max: 1.5 }, // deepseek-r1:1.5b → 1.1GB
        1.7: { min: 1.2, max: 1.8 },
        1.8: { min: 1.3, max: 2.0 },
        2.0: { min: 1.5, max: 2.5 }, // qwen3-vl:2b → 1.9GB
        2.5: { min: 1.8, max: 2.8 },
        2.7: { min: 2.0, max: 3.0 },
        3.0: { min: 2.5, max: 3.5 },
        3.3: { min: 2.8, max: 4.0 }, // gemma3:4b → 3.3GB, qwen3-vl:4b → 3.3GB
        3.8: { min: 3.0, max: 4.5 },
        4.0: { min: 3.2, max: 4.5 }, // gemma3:4b → 3.3GB
        4.7: { min: 4.0, max: 5.5 }, // deepseek-r1:7b → 4.7GB
        5.2: { min: 4.5, max: 6.5 }, // deepseek-r1:8b → 5.2GB, qwen3-vl:latest → 6.1GB
        6.1: { min: 5.5, max: 7.0 }, // qwen3-vl:latest → 6.1GB, qwen3-vl:8b → 6.1GB
        6.7: { min: 5.5, max: 7.5 },
        7.0: { min: 6.0, max: 8.0 }, // deepseek-r1:7b → 4.7GB (but can vary)
        8.0: { min: 6.5, max: 9.0 }, // qwen3-vl:8b → 6.1GB
        8.1: { min: 7.0, max: 9.5 }, // gemma3:12b → 8.1GB
        9.0: { min: 7.5, max: 10.5 }, // deepseek-r1:14b → 9.0GB
        10.0: { min: 8.5, max: 11.5 },
        10.7: { min: 9.0, max: 12.5 },
        11.0: { min: 9.5, max: 13.0 },
        12.0: { min: 10.0, max: 14.0 }, // gemma3:12b → 8.1GB
        13.0: { min: 11.0, max: 15.0 },
        14.0: { min: 12.0, max: 16.0 }, // deepseek-r1:14b → 9.0GB
        16.0: { min: 14.0, max: 18.0 },
        17.0: { min: 15.0, max: 19.0 }, // gemma3:27b → 17GB
        20.0: { min: 18.0, max: 23.0 }, // qwen3-vl:30b → 20GB, deepseek-r1:32b → 20GB
        21.0: { min: 19.0, max: 24.0 }, // qwen3-vl:32b → 21GB
        22.0: { min: 20.0, max: 25.0 },
        24.0: { min: 22.0, max: 27.0 },
        27.0: { min: 25.0, max: 30.0 }, // gemma3:27b → 17GB
        30.0: { min: 18.0, max: 23.0 }, // qwen3-vl:30b → 20GB
        32.0: { min: 19.0, max: 24.0 }, // qwen3-vl:32b → 21GB, deepseek-r1:32b → 20GB
        35.0: { min: 32.0, max: 38.0 },
        43.0: { min: 40.0, max: 47.0 }, // deepseek-r1:70b → 43GB
        70.0: { min: 40.0, max: 47.0 }, // deepseek-r1:70b → 43GB
        104.0: { min: 95.0, max: 115.0 },
        111.0: { min: 100.0, max: 120.0 },
        120.0: { min: 110.0, max: 130.0 },
        143.0: { min: 130.0, max: 160.0 }, // qwen3-vl:235b → 143GB
        235.0: { min: 130.0, max: 160.0 }, // qwen3-vl:235b → 143GB
        236.0: { min: 130.0, max: 160.0 },
        404.0: { min: 380.0, max: 430.0 }, // deepseek-r1:671b → 404GB
        671.0: { min: 380.0, max: 430.0 }, // deepseek-r1:671b → 404GB
      }

      // Find closest match or calculate
      if (sizeMap[paramCount]) {
        return sizeMap[paramCount]
      }

      // Interpolate for values not in map
      const keys = Object.keys(sizeMap).map(Number).sort((a, b) => a - b)
      const lower = keys.filter(k => k <= paramCount).pop()
      const upper = keys.filter(k => k >= paramCount)[0]

      if (lower !== undefined && upper !== undefined) {
        const ratio = (paramCount - lower) / (upper - lower)
        const lowerRange = sizeMap[lower]
        const upperRange = sizeMap[upper]
        return {
          min: lowerRange.min + (upperRange.min - lowerRange.min) * ratio,
          max: lowerRange.max + (upperRange.max - lowerRange.max) * ratio
        }
      }

      // Fallback: wider range ~0.5-1.0GB per billion parameters (varies by model family)
      const base = paramCount * 0.7
      return { min: base * 0.7, max: base * 1.5 }
    }
  }

  // If no pattern matches, check for keywords
  if (nameLower.includes('large') || nameLower.includes('big') || nameLower.includes('huge')) {
    return { min: 4.0, max: 7.0 }
  }

  // Default: assume small-medium size
  return { min: 0.8, max: 1.5 }
}


