# Brokerage Symbol Assets Constructor

This project is a tool for generating and managing brokerage symbol assets, including country flags and cryptocurrency icons.

## Features

* Generate combined flag SVGs for country pairs
* Create cryptocurrency icons with optional variants (OTC, LEVERAGED)
* Search functionality for countries and cryptocurrencies
* Web interface for easy asset generation and management

## Tech Stack

* Backend:  
   * Node.js  
   * Express.js  
   * Fuse.js for fuzzy search
* Frontend:  
   * React  
   * TypeScript  
   * Vite  
   * Tailwind CSS  
   * Radix UI components  
   * ShadcnUI
* Deployment:
   * Docker

## Project Structure

* `icon-generator.js`: Main backend script for generating assets
* `frontend/`: React frontend application
* `output/`: Generated assets are saved here
* `Dockerfile`: Backend Docker configuration
* `frontend/Dockerfile`: Frontend Docker configuration
* `docker-compose.yml`: Docker Compose configuration for the entire application

## Setup

### Local Development

1. Clone the repository:   ```
   git clone https://github.com/hereticmilk/brokerage-assets.git   ```
2. Install dependencies:     ```
   npm install
   cd frontend && npm install   ```
3. Set up environment variables: Create a `.env` file in the root directory and add necessary variables.
4. Run the development server:     ```
   npm run dev   ```  
   This will start both the backend server and the frontend development server.

### Docker Setup

1. Ensure Docker and Docker Compose are installed on your system.
2. Build the Docker images:   ```
   docker-compose build
   ```
3. Start the containers:   ```
   docker-compose up -d
   ```
4. The application will be available at `http://localhost:80`

## Usage

1. Open the web interface in your browser (default: http://localhost:80 for Docker, http://localhost:3000 for local development)
2. Use the "Countries" tab to generate combined flag assets
3. Use the "Crypto" tab to generate cryptocurrency icons
4. Generated assets will be available in the `output/` directory

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.
