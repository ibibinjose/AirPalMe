/**
 * Outfit & Daily Vibe Recommendation Engine for AirPal.Me.
 * Maps live weather metrics (temp, condition, day/night) into
 * intuitive, actionable daily styling and preparation advice.
 */

export interface DailyOutfitAdvice {
  vibe: string;
  summary: string;
  outfit: string;
  accessory: string;
  icon: string;
}

/**
 * Deterministic outfit suggestion based on Celsius temperature and WMO weather code.
 */
export function getDailyOutfitRecommendation(
  temp: number,
  weatherCode: number,
  isDay: boolean = true,
): DailyOutfitAdvice {
  const isRain =
    weatherCode <= 67 && weatherCode >= 51 ||
    (weatherCode >= 80 && weatherCode <= 82) ||
    weatherCode >= 95;
  const isSnow = (weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86);

  if (isRain) {
    if (temp < 15) {
      return {
        vibe: "Wet & Chilly",
        summary: "Rainy and brisk — stay warm and dry.",
        outfit: "Water-resistant jacket, warm sweater, and sturdy boots.",
        accessory: "Windproof umbrella & warm scarf",
        icon: "🌧️",
      };
    }
    return {
      vibe: "Wet Weather",
      summary: "Showers expected — dress for the rain.",
      outfit: "Light rainproof shell, breathable layer, and water-friendly shoes.",
      accessory: "Compact umbrella",
      icon: "☂️",
    };
  }

  if (isSnow) {
    return {
      vibe: "Freezing Snow",
      summary: "Sub-zero conditions — heavy thermal protection required.",
      outfit: "Heavy insulated coat, thermal base layers, and waterproof boots.",
      accessory: "Beanie, insulated gloves & wool scarf",
      icon: "❄️",
    };
  }

  // Clear / Mild / Warm / Hot conditions
  if (temp < 12) {
    return {
      vibe: "Brisk & Cold",
      summary: "Crisp winter air — layer up comfortably.",
      outfit: "Heavy coat or puffer, knit sweater, and trousers.",
      accessory: "Beanie or warm scarf",
      icon: "🧥",
    };
  }

  if (temp < 18) {
    return {
      vibe: "Cool & Crisp",
      summary: "Fresh temperature — ideal for structured layering.",
      outfit: "Denim or light bomber jacket, long sleeves, and chinos or jeans.",
      accessory: "Light scarf or overshirt",
      icon: "🧥",
    };
  }

  if (temp < 24) {
    return {
      vibe: "Mild & Pleasant",
      summary: "Prime walking weather — comfortable and balanced.",
      outfit: "Casual tee or linen shirt with a light sweater or jacket for later.",
      accessory: isDay ? "Sunglasses & comfortable sneakers" : "Light outer layer",
      icon: isDay ? "🕶️" : "✨",
    };
  }

  if (temp < 30) {
    return {
      vibe: "Warm & Sunny",
      summary: "Great warm day — keep it light and breathable.",
      outfit: "Light cotton tee, linen shirt, or airy dress with comfortable footwear.",
      accessory: isDay ? "Sunglasses & SPF protection" : "Comfortable walking shoes",
      icon: "☀️",
    };
  }

  return {
    vibe: "Hot & Bright",
    summary: "High heat — stay cool, hydrated, and protected.",
    outfit: "Ultra-breathable linen, loose fits, shorts or sundress.",
    accessory: "Sunglasses, wide-brim hat & water bottle",
    icon: "🔥",
  };
}
