export interface SampleRepoInfo {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
  isLocal: boolean;
}

export function getSampleRepositories(): SampleRepoInfo[] {
  return [
    {
      id: 'express-js',
      name: 'expressjs/express',
      url: 'https://github.com/expressjs/express',
      description: 'Fast, unopinionated, minimalist web framework for Node.js',
      category: 'Backend Framework',
      tags: ['JavaScript', 'Express', 'HTTP', 'Middleware'],
      isLocal: false,
    },
    {
      id: 'zustand',
      name: 'pmndrs/zustand',
      url: 'https://github.com/pmndrs/zustand',
      description: 'Bear necessities for state management in React — hooks, middleware, vanilla store',
      category: 'State Management',
      tags: ['TypeScript', 'React', 'Hooks', 'State'],
      isLocal: false,
    },
    {
      id: 'redux',
      name: 'reduxjs/redux',
      url: 'https://github.com/reduxjs/redux',
      description: 'Predictable state container for JavaScript apps with middleware architecture',
      category: 'State Architecture',
      tags: ['TypeScript', 'Architecture', 'Patterns'],
      isLocal: false,
    },
    {
      id: 'hono',
      name: 'honojs/hono',
      url: 'https://github.com/honojs/hono',
      description: 'Fast, lightweight, Web-standards based router and API framework',
      category: 'Edge Framework',
      tags: ['TypeScript', 'Web Standards', 'API'],
      isLocal: false,
    },
    {
      id: 'flask-python',
      name: 'pallets/flask',
      url: 'https://github.com/pallets/flask',
      description: 'Lightweight WSGI Python web application framework and blueprint ecosystem',
      category: 'Python Web',
      tags: ['Python', 'WSGI', 'Blueprints', 'Routing'],
      isLocal: false,
    },
    {
      id: 'fastapi-python',
      name: 'fastapi/fastapi',
      url: 'https://github.com/fastapi/fastapi',
      description: 'High performance API framework based on Starlette and Pydantic',
      category: 'Python API',
      tags: ['Python', 'Pydantic', 'Async', 'OpenAPI'],
      isLocal: false,
    },
  ];
}
