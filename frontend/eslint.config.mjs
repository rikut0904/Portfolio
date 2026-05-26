import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

export default config;
