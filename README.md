# Weather Dashboard

A modern weather dashboard built with HTML, CSS, Vanilla JavaScript, and Vite. The app fetches live weather data from the OpenWeatherMap API and dynamically renders the interface without using React or a backend framework.

## Project Goal

The goal of this project is to build a modern, responsive weather dashboard using Vanilla JavaScript and Vite, focusing on API integration, SPA architecture, and real-world frontend development skills.

## Overview

Weather Dashboard lets users search for a city and view current weather conditions in a clean, responsive interface. It displays useful weather details such as temperature, humidity, wind speed, pressure, visibility, and forecast information.

The project is structured as a Vanilla JavaScript single-page application. JavaScript modules handle API requests, state, rendering, UI updates, weather-based themes, and user interactions.

## Features

- Search weather by city name
- Fetch weather using the user's current location
- Display current temperature, condition, humidity, wind, pressure, and visibility
- Show forecast data from OpenWeatherMap
- Toggle between metric and imperial units
- Save recent weather data in local storage for faster repeat views
- Remember the last searched city
- Show loading, success, and error UI states
- Dynamically update the visual theme based on weather conditions
- Responsive layout for desktop and mobile screens
- Firebase authentication support for login and signup flows


## Preview


```md
![Weather Dashboard Screenshot](./assets/images/web-preview.webp)
```

```md
![login-page Screenshot](./assets/images/login-page-preview.webp)
```

```md
![signup-page Screenshot](./assets/images/signup-page-preview.webp)
```  

##  Live Demo

You can view the live version of the Weather Dashboard here:

🌐 **Live Site:** https://your-vercel-project-link.vercel.app  
💻 **Source Code:** https://denz5infinity.github.io/Weather-dashboard/

## Tech Stack

- **HTML5** - App entry point and base markup
- **CSS3** - Global styles, dashboard layout, responsive design, and UI states
- **JavaScript ES Modules** - SPA logic, rendering, state, API calls, and utilities
- **Vite** - Development server and production build tool
- **OpenWeatherMap API** - Current weather and forecast data
- **Firebase** - Client-side authentication support
- **LocalStorage** - Weather cache, unit preference, and last searched city

## Installation

Follow these steps to run the project locally.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/weather-dashboard.git
cd weather-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create an environment file

Create a `.env` file in the root of the project.

```bash
VITE_OPENWEATHER_API_KEY=your_openweathermap_api_key

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Do not commit your `.env` file or expose private keys in the repository.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```bash
http://localhost:5173
```

## API Information

This project uses the [OpenWeatherMap API](https://openweathermap.org/api) to fetch weather data.

The API key is loaded through Vite environment variables:

```bash
VITE_OPENWEATHER_API_KEY=your_openweathermap_api_key
```

The key is accessed in JavaScript through:

```js
import.meta.env.VITE_OPENWEATHER_API_KEY
```

For security, API keys should never be hard-coded directly into the source files.

## How It Works

The app runs as a Vanilla JavaScript SPA. The main JavaScript entry file controls the application flow, listens for user actions, fetches weather data, and renders the correct UI into the page.

At a high level:

1. Vite loads `index.html` and the main JavaScript module.
2. JavaScript checks authentication state and renders the correct screen.
3. The user searches for a city or allows geolocation access.
4. The weather API module requests current weather and forecast data from OpenWeatherMap.
5. The data is normalized into a consistent format.
6. UI rendering functions update the dashboard with the latest weather details.
7. LocalStorage stores unit preferences, cached weather data, and the last searched city.

## Project Structure

```text
weather-dashboard/
|-- public/
|   |-- favicon.svg
|   `-- icons.svg
|-- src/
|   |-- assets/
|   |   `-- images/
|   |-- css/
|   |   |-- auth.css
|   |   |-- dashboard.css
|   |   `-- global.css
|   |-- js/
|   |   |-- api/
|   |   |   `-- weatherApi.js
|   |   |-- auth/
|   |   |   `-- authService.js
|   |   |-- firebase/
|   |   |   `-- firebaseConfig.js
|   |   |-- utils/
|   |   |   `-- debounce.js
|   |   `-- main.js
|   `-- ui/
|       |-- authUI.js
|       |-- renderWeather.js
|       `-- theme.js
|-- index.html
|-- package.json
`-- README.md
```

## Usage

1. Start the development server with `npm run dev`.
2. Sign in or create an account if authentication is enabled.
3. Enter a city name in the search field.
4. Submit the search to view live weather data.
5. Use the location button to fetch weather for your current position.
6. Switch between metric and imperial units when needed.
7. Revisit the app to see your last searched city restored automatically.

## Future Improvements

- Add more detailed multi-day forecast views
- Add charts for temperature, humidity, and wind trends
- Add saved favorite cities
- Improve accessibility testing and keyboard navigation
- Add unit and integration tests
- Add offline support with a service worker
- Add more detailed error handling for API limits and network failures

## Deployment

This Vite project can be deployed to Vercel.

### Deploy with Vercel

1. Push the project to GitHub.
2. Create a new project in Vercel.
3. Import the GitHub repository.
4. Add the required environment variables in the Vercel project settings.
5. Use the default Vite settings:

```bash
Build Command: npm run build
Output Directory: dist
```

6. Deploy the project.

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Creates a production-ready build in the `dist` folder.

```bash
npm run preview
```

Previews the production build locally.

## License

This project is available for learning and portfolio use. Add a license file if you plan to distribute it publicly.
