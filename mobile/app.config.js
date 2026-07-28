const appJson = require("./app.json");

/**
 * Config dinámica para inyectar Google Maps API key en builds nativos.
 * Usa EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (recomendado) o VITE_GOOGLE_MAPS_API_KEY.
 */
module.exports = () => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    "";

  const expo = appJson.expo;

  return {
    ...appJson,
    expo: {
      ...expo,
      ios: {
        ...expo.ios,
        config: {
          ...(expo.ios?.config || {}),
          googleMapsApiKey: googleMapsApiKey || undefined,
        },
        infoPlist: {
          ...(expo.ios?.infoPlist || {}),
          NSLocationWhenInUseUsageDescription:
            "Usamos tu ubicación para ayudarte a indicar la dirección de recogida en cotizaciones EXW.",
        },
      },
      android: {
        ...expo.android,
        config: {
          ...(expo.android?.config || {}),
          googleMaps: {
            apiKey: googleMapsApiKey || undefined,
          },
        },
        permissions: [
          "ACCESS_COARSE_LOCATION",
          "ACCESS_FINE_LOCATION",
        ],
      },
      extra: {
        ...(expo.extra || {}),
        googleMapsApiKey,
        // Misma restricción HTTP referer de la key web (Places API New).
        googleMapsHttpReferer:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_REFERER ||
          "https://portalclientes.seemanngroup.com/",
      },
    },
  };
};
