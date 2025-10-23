import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const config: NextConfig = {

  // --- ESTE ES EL BLOQUE QUE DA LOS PERMISOS ---
  async headers() {
    return [
      {
        // Aplicar estas reglas a TODAS las rutas de tu API
        source: "/api/:path*",
        headers: [
          // Permite que CUALQUIER dominio hable con tu API.
          // Es lo más fácil para probar.
          { key: "Access-Control-Allow-Origin", value: "*" }, 

          // Define los métodos permitidos
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },

          // Define los encabezados permitidos
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
  // --- FIN DEL BLOQUE ---

};

export default config;