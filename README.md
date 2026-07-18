# Precios Perú — Análisis y Predicciones de Datos Económicos

![Astro](https://img.shields.io/badge/Astro-FF5D01?style=flat&logo=astro&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat&logo=css3&logoColor=white)

Proyecto web desarrollado con **Astro** para explorar, visualizar y analizar datos de precios y tendencias económicas relacionadas con Perú. Consulta datasets públicos y presenta los resultados de forma clara, con miras a apoyar modelos estadísticos y predicciones.

## 📊 Características

- Exploración de datasets públicos con datos económicos de Perú.
- Visualización de precios y tendencias de forma clara y ordenada.
- Base para análisis estadístico y predicciones sobre los datos.
- Sitio estático rápido, compatible con despliegue en Vercel o Netlify.

## 🛠️ Tecnologías

| Tecnología | Uso |
| :--- | :--- |
| **Astro** | Framework principal del sitio web |
| **JavaScript / TypeScript** | Lógica de consulta y procesamiento de datos |
| **CSS** | Estilos de la interfaz |
| **Vercel / Netlify** | Despliegue (compatible con ambos) |

## ✅ Requisitos previos

Antes de ejecutar el proyecto necesitas tener instalado:

- **Node.js 18.17 o superior** (recomendado Node 20 LTS) — [descargar](https://nodejs.org/)
- **npm** (incluido con Node.js)
- **Git** para clonar el repositorio

No se requieren variables de entorno ni claves de API para el desarrollo local.

## 🚀 Instalación y ejecución

1. Clona el repositorio y entra a la carpeta:

   ```bash
   git clone https://github.com/NinaDIV/Peru-Predictions-ML.git
   cd Peru-Predictions-ML
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abre el navegador en **`http://localhost:4321`** — deberías ver la página principal del proyecto.

### Build de producción

```bash
npm run build     # genera el sitio estático en ./dist/
npm run preview   # sirve la build localmente para revisarla antes de desplegar
```

## 📁 Estructura del proyecto

```
/
├── public/              # Recursos estáticos
├── scripts/             # Scripts auxiliares del proyecto
├── src/
│   └── pages/
│       └── index.astro  # Página principal
├── astro.config.mjs     # Configuración de Astro
├── tsconfig.json        # Configuración de TypeScript
└── package.json
```

## ⌨️ Comandos disponibles

| Comando           | Acción                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Instala dependencias                         |
| `npm run dev`     | Servidor local en `localhost:4321`           |
| `npm run build`   | Genera la build de producción en `./dist/`   |
| `npm run preview` | Vista previa de la build antes de desplegar  |
