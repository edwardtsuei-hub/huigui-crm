module.exports = {
  apps: [
    {
      name: "huigui-api",
      cwd: "/srv/huigui/current",
      script: "npm",
      args: "run start -w @huigui/api",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "huigui-web",
      cwd: "/srv/huigui/current",
      script: "npm",
      args: "run start -w @huigui/web",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0"
      }
    }
  ]
};
