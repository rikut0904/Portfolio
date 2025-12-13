import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default config;
