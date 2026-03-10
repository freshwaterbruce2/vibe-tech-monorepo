// PM2 Ecosystem Configuration for Nova Agent
// Production deployment with cluster mode and monitoring

module.exports = {
	apps: [
		{
			name: "nova-agent",
			script: "dist/index.js",
			cwd: process.env.DEPLOY_PATH || "D:\\deployments\\nova-agent",

			// Production: cluster mode for multi-core utilization
			instances: process.env.PM2_INSTANCES || "max",
			exec_mode: "cluster",

			// Memory management
			max_memory_restart: "1G",

			// Logging (D:\ drive per Antigravity architecture)
			error_file: "D:\\logs\\nova-agent\\error.log",
			out_file: "D:\\logs\\nova-agent\\out.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,

			// Reliability
			autorestart: true,
			watch: false,
			min_uptime: "10s",
			max_restarts: 10,
			restart_delay: 4000,

			// Graceful shutdown
			kill_timeout: 5000,
			wait_ready: true,
			listen_timeout: 10000,
			shutdown_with_message: true,

			// Environment variables - Development
			env: {
				NODE_ENV: "development",
				PORT: 3100,
				DATABASE_PATH: "D:\\databases\\nova_activity.db",
				LEARNING_DB_PATH: "D:\\databases\\agent_learning.db",
				TASKS_DB_PATH: "D:\\databases\\agent_tasks.db",
			},

			// Environment variables - Production
			env_production: {
				NODE_ENV: "production",
				PORT: 3100,
				DATABASE_PATH: "D:\\databases\\nova_activity.db",
				LEARNING_DB_PATH: "D:\\databases\\agent_learning.db",
				TASKS_DB_PATH: "D:\\databases\\agent_tasks.db",
				// API keys loaded from .env file
				DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
				GROQ_API_KEY: process.env.GROQ_API_KEY,
				HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
			},

			// Monitoring
			instance_var: "INSTANCE_ID",

			// Advanced features
			node_args: "--max-old-space-size=2048",

			// Cron restart (optional - restart daily at 3 AM)
			cron_restart: "0 3 * * *",

			// Error handling
			exp_backoff_restart_delay: 100,

			// Metrics
			pmx: true,
			automation: false,
		},
	],
};
